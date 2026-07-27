import { createClient, EMPTY_TOKENS, OAuthStrategy, type TokenStorage, type Tokens } from '@wix/sdk';
import { items as itemsModule } from '@wix/data';
import { posts as postsModule } from '@wix/blog';
import { members as membersModule } from '@wix/members';
import { plansV3 as plansModule, orders as ordersModule } from '@wix/pricing-plans';
import { redirects as redirectsModule } from '@wix/redirects';

const TOKEN_STORAGE_KEY = 'arcstep-wix-tokens';
const OAUTH_STORAGE_KEY = 'arcstep-oauth-data';
const clientId = import.meta.env.PUBLIC_WIX_CLIENT_ID as string | undefined;
const tokenStorage: TokenStorage = {
  getTokens: () => {
    try { return JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || 'null') as Tokens || EMPTY_TOKENS; }
    catch { return EMPTY_TOKENS; }
  },
  setTokens: tokens => {
    try { localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens)); } catch { /* Storage may be disabled. */ }
  },
};
const authStrategy = OAuthStrategy({ clientId: clientId || '', tokenStorage });
const wixClient = createClient({
  modules: {
    items: itemsModule,
    posts: postsModule,
    members: membersModule,
    plansV3: plansModule,
    orders: ordersModule,
    redirects: redirectsModule,
  },
  auth: authStrategy,
});
const { items, posts, members, plansV3, orders, redirects } = wixClient;

type ClipState = { label: string; start: number; length: number };
type NoteState = { note: string; start: number; length: number };
type TrackState = { name: string; type: string; color: string; volume: number; cutoff?: number; resonance?: number; reverb?: number; clips: ClipState[]; notes?: NoteState[] };
type SongState = { version: number; tracks: TrackState[]; selectedTrack: number };
type EditorSnapshot = { tracks: TrackState[]; selectedTrack: number; selectedClip: { track: number; clip: number } | null; tempo: number; projectName: string; projectId: string | null };
type SavedSong = {
  _id?: string;
  _createdDate?: Date | string | null;
  title?: string;
  tempo?: number;
  songState?: SongState;
  accent?: string;
  duration?: number;
  isFavorite?: boolean;
};

const studio = document.querySelector<HTMLElement>('[data-studio]');

if (studio) {
  const $ = <T extends Element>(selector: string) => studio.querySelector<T>(selector);
  const $$ = <T extends Element>(selector: string) => Array.from(studio.querySelectorAll<T>(selector));
  const playButton = $<HTMLButtonElement>('[data-play]')!;
  const playIcon = $<HTMLElement>('[data-play-icon]')!;
  const positionLabel = $<HTMLElement>('[data-position]')!;
  const playhead = $<HTMLElement>('[data-playhead]')!;
  const timeline = $<HTMLElement>('[data-timeline]')!;
  const tempoInput = $<HTMLInputElement>('[data-tempo]')!;
  const masterInput = $<HTMLInputElement>('[data-master]')!;
  const cutoffInput = $<HTMLInputElement>('[data-cutoff]')!;
  const resonanceInput = $<HTMLInputElement>('[data-resonance]')!;
  const reverbInput = $<HTMLInputElement>('[data-reverb]')!;
  const toastBox = $<HTMLElement>('[data-toast-box]')!;
  const projectTitle = $<HTMLElement>('[data-project-title]')!;
  const saveStatus = $<HTMLElement>('[data-save-status]')!;
  const trackDialog = $<HTMLDialogElement>('[data-track-dialog]')!;
  const trackForm = $<HTMLFormElement>('[data-track-form]')!;
  const settingsDialog = $<HTMLDialogElement>('[data-settings-dialog]')!;
  const settingsForm = $<HTMLFormElement>('[data-settings-form]')!;
  const recordButton = $<HTMLButtonElement>('[data-record]')!;

  let audio: AudioContext | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let masterGain: GainNode | null = null;
  let analyser: AnalyserNode | null = null;
  let delay: DelayNode | null = null;
  let reverb: ConvolverNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let trackGains: GainNode[] = [];
  let trackFilters: BiquadFilterNode[] = [];
  let trackReverbSends: GainNode[] = [];
  let schedulerId = 0;
  let animationId = 0;
  let playing = false;
  let position = 0;
  let startedAt = 0;
  let nextStep = 0;
  let nextNoteAt = 0;
  let selectedTrack = 2;
  let selectedClip: { track: number; clip: number } | null = { track: 2, clip: 0 };
  let currentMember: any = null;
  let savedSongs: SavedSong[] = [];
  let blogPosts: any[] = [];
  let activeView = 'studio';
  let currentProjectName = 'NIGHT TRANSIT';
  let currentProjectId: string | null = null;
  let trackStates = readInitialTracks();
  const demoTracks = structuredClone(trackStates);
  let muted = trackStates.map(() => false);
  let soloed = trackStates.map(() => false);
  let activeTool: 'pointer' | 'draw' | 'split' = 'pointer';
  let activeLibrary = 'instruments';
  let zoomPercent = 100;
  let loopPlayback = true;
  let autosave = true;
  let sampleRate = 48000;
  let recordArmed = false;
  let recordStartPosition = 0;
  let clipGesture: { button: HTMLButtonElement; track: number; clip: number; startX: number; originalStart: number; originalLength: number; mode: 'move' | 'resize'; committed: boolean } | null = null;
  const undoStack: EditorSnapshot[] = [];
  const redoStack: EditorSnapshot[] = [];
  const meterBars = $$('.master-meter i');

  const bpm = () => Number(tempoInput.value) || 128;
  const stepDuration = () => 60 / bpm() / 4;
  const loopDuration = () => 16 * 4 * 60 / bpm();
  const midiToHz = (note: number) => 440 * Math.pow(2, (note - 69) / 12);
  const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);

  function readInitialTracks(): TrackState[] {
    return $$<HTMLElement>('[data-track-head]').map((head, index) => {
      const lane = $<HTMLElement>(`[data-track-lane="${index}"]`)!;
      return {
        name: head.querySelector('strong')?.textContent?.trim() || `TRACK ${index + 1}`,
        type: head.querySelector('.track-name span')?.textContent?.trim() || 'Wavetable',
        color: head.style.getPropertyValue('--track').trim() || '#67d4ae',
        volume: Number((head.querySelector('[data-track-volume]') as HTMLInputElement | null)?.value || 64) / 100,
        cutoff: [15000, 1900, 6200, 6200, 9000, 6200][index] || 6200,
        resonance: index === 1 ? 2.4 : 0.8,
        reverb: [3, 2, 24, 38, 18, 30][index] || 22,
        notes: index === 2 ? [
          { note: 'C4', start: 0, length: 3 }, { note: 'G4', start: 0, length: 2 }, { note: 'D#4', start: 3, length: 3 },
          { note: 'A#4', start: 4, length: 2 }, { note: 'F4', start: 6, length: 3 }, { note: 'C5', start: 8, length: 2 },
          { note: 'G4', start: 10, length: 3 }, { note: 'D#4', start: 13, length: 3 },
        ] : [],
        clips: Array.from(lane.querySelectorAll<HTMLButtonElement>('[data-clip]')).map(clip => ({
          label: clip.querySelector('span')?.textContent?.trim() || 'NEW CLIP',
          start: Number(clip.style.getPropertyValue('--start')),
          length: Number(clip.style.getPropertyValue('--length')),
        })),
      };
    });
  }

  function showToast(message: string) {
    toastBox.textContent = message;
    toastBox.classList.add('visible');
    window.setTimeout(() => toastBox.classList.remove('visible'), 2200);
  }

  function setSaveState(label: string, pending = false) {
    saveStatus.lastChild!.textContent = ` ${label}`;
    saveStatus.classList.toggle('pending', pending);
  }

  function snapshot(): EditorSnapshot {
    return {
      tracks: structuredClone(trackStates),
      selectedTrack,
      selectedClip: selectedClip ? { ...selectedClip } : null,
      tempo: bpm(),
      projectName: currentProjectName,
      projectId: currentProjectId,
    };
  }

  function updateHistoryUi() {
    $<HTMLButtonElement>('[data-undo]')!.disabled = undoStack.length === 0;
    $<HTMLButtonElement>('[data-redo]')!.disabled = redoStack.length === 0;
  }

  function pushHistory() {
    undoStack.push(snapshot());
    if (undoStack.length > 40) undoStack.shift();
    redoStack.length = 0;
    updateHistoryUi();
  }

  function rebuildAudioTracks() {
    trackFilters.forEach(node => node?.disconnect());
    trackGains.forEach(node => node?.disconnect());
    trackReverbSends.forEach(node => node?.disconnect());
    trackFilters = [];
    trackGains = [];
    trackReverbSends = [];
    if (audio) trackStates.forEach((_, index) => addTrackAudio(index));
  }

  function restoreSnapshot(state: EditorSnapshot) {
    stop();
    trackStates = structuredClone(state.tracks);
    selectedTrack = Math.min(state.selectedTrack, trackStates.length - 1);
    selectedClip = state.selectedClip;
    tempoInput.value = String(state.tempo);
    currentProjectName = state.projectName;
    currentProjectId = state.projectId;
    muted = trackStates.map(() => false);
    soloed = trackStates.map(() => false);
    projectTitle.innerHTML = `${escapeHtml(currentProjectName.toUpperCase())} <b>•</b> EDIT`;
    rebuildAudioTracks();
    renderTracks();
    markDirty();
  }

  function undo() {
    const previous = undoStack.pop();
    if (!previous) { showToast('Nothing to undo'); return; }
    redoStack.push(snapshot());
    restoreSnapshot(previous);
    updateHistoryUi();
    showToast('Undo');
  }

  function redo() {
    const next = redoStack.pop();
    if (!next) { showToast('Nothing to redo'); return; }
    undoStack.push(snapshot());
    restoreSnapshot(next);
    updateHistoryUi();
    showToast('Redo');
  }

  function persistDraft() {
    if (!autosave) return;
    try { localStorage.setItem('arcstep-draft', JSON.stringify(snapshot())); } catch { /* Storage may be disabled. */ }
  }

  function markDirty() {
    setSaveState('UNSAVED', true);
    persistDraft();
  }

  function createImpulse(context: AudioContext) {
    const length = context.sampleRate * 2.4;
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.7);
    }
    return impulse;
  }

  function addTrackAudio(index: number) {
    if (!audio || !compressor || !delay || !reverb || trackFilters[index]) return;
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    const delaySend = audio.createGain();
    const reverbSend = audio.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = trackStates[index]?.cutoff ?? (index === 0 ? 15000 : index === 1 ? 1900 : index === 4 ? 9000 : 6200);
    filter.Q.value = trackStates[index]?.resonance ?? (index === 1 ? 2.4 : 0.8);
    gain.gain.value = trackStates[index]?.volume ?? 0.64;
    delaySend.gain.value = [0.02, 0.04, 0.16, 0.28, 0.2, 0.34][index] ?? 0.2;
    reverbSend.gain.value = (trackStates[index]?.reverb ?? ([3, 2, 24, 38, 18, 30][index] ?? 22)) / 100;
    filter.connect(gain);
    gain.connect(compressor);
    gain.connect(delaySend).connect(delay);
    gain.connect(reverbSend).connect(reverb);
    trackFilters[index] = filter;
    trackGains[index] = gain;
    trackReverbSends[index] = reverbSend;
  }

  function initAudio() {
    if (audio) return;
    audio = new AudioContext({ sampleRate });
    compressor = audio.createDynamicsCompressor();
    masterGain = audio.createGain();
    analyser = audio.createAnalyser();
    delay = audio.createDelay(1);
    reverb = audio.createConvolver();
    const feedback = audio.createGain();
    const delayReturn = audio.createGain();
    const reverbReturn = audio.createGain();
    compressor.threshold.value = -15;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.18;
    masterGain.gain.value = Number(masterInput.value) / 100;
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.76;
    delay.delayTime.value = stepDuration() * 3;
    feedback.gain.value = 0.36;
    delayReturn.gain.value = 0.34;
    reverbReturn.gain.value = 0.28;
    reverb.buffer = createImpulse(audio);
    delay.connect(feedback).connect(delay);
    delay.connect(delayReturn).connect(compressor);
    reverb.connect(reverbReturn).connect(compressor);
    compressor.connect(masterGain).connect(analyser).connect(audio.destination);
    trackStates.forEach((_, index) => addTrackAudio(index));
    noiseBuffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
    updateMix();
  }

  function tone(frequency: number, time: number, length: number, destination: AudioNode, type: OscillatorType, level: number, glide = 0, attack = 0.008) {
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (glide > 0) oscillator.frequency.exponentialRampToValueAtTime(glide, time + Math.min(length, 0.16));
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    oscillator.connect(gain).connect(destination);
    oscillator.start(time);
    oscillator.stop(time + length + 0.03);
  }

  function filteredNoise(time: number, length: number, destination: AudioNode, level: number, frequency: number, type: BiquadFilterType = 'highpass') {
    if (!audio || !noiseBuffer) return;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    source.connect(filter).connect(gain).connect(destination);
    source.start(time);
    source.stop(time + length);
  }

  function kick(time: number, level = 0.9) {
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.setValueAtTime(148, time);
    oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.16);
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    oscillator.connect(gain).connect(trackFilters[0]);
    oscillator.start(time);
    oscillator.stop(time + 0.25);
  }

  function pad(root: number, time: number, length: number, level = 0.035) {
    [0, 3, 7, 10].forEach((interval, index) => {
      tone(midiToHz(root + interval), time + index * 0.006, length, trackFilters[2], index % 2 ? 'triangle' : 'sine', level, 0, 0.08);
      tone(midiToHz(root + interval + 12), time, length * 0.78, trackFilters[2], 'sine', level * 0.22, 0, 0.12);
    });
  }

  function pluck(note: number, time: number, destination: AudioNode, level = 0.08, length = 0.3) {
    tone(midiToHz(note), time, length, destination, 'triangle', level, 0, 0.004);
    tone(midiToHz(note + 12), time, length * 0.56, destination, 'sine', level * 0.28, 0, 0.003);
  }

  function noteToMidi(note: string) {
    const match = /^([A-G])(#?)(-?\d)$/.exec(note);
    if (!match) return 60;
    const semitone = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[match[1]] + (match[2] ? 1 : 0);
    return (Number(match[3]) + 1) * 12 + semitone;
  }

  function schedule(step: number, time: number) {
    if (!audio || trackFilters.length < trackStates.length) return;
    const within = step % 16;
    const bar = Math.floor(step / 16) % 16;
    const active = (index: number) => trackStates[index]?.clips.some(clip => bar >= clip.start && bar < clip.start + clip.length);
    const breakBar = bar === 8;
    const finalBar = bar === 15;
    const kickSteps = bar < 2 ? [0, 8, 12] : [0, 3, 8, 11, 12];
    if (active(0) && (!breakBar || within >= 8) && kickSteps.includes(within)) kick(time, finalBar && within >= 12 ? 1 : 0.86);
    if (active(0) && !breakBar && (within === 4 || within === 12)) {
      filteredNoise(time, 0.18, trackFilters[0], 0.32, 1350, 'bandpass');
      tone(190, time, 0.08, trackFilters[0], 'triangle', 0.08, 120);
    }
    if (active(0) && bar > 0 && within % (bar >= 12 ? 1 : 2) === 0) filteredNoise(time, within % 4 ? 0.025 : 0.045, trackFilters[0], bar >= 12 ? 0.055 : 0.042, 6900);
    if (active(0) && finalBar && within >= 12) filteredNoise(time, 0.07, trackFilters[0], 0.1 + (within - 12) * 0.03, 2200 + within * 240, 'bandpass');

    const roots = [36, 36, 43, 43, 39, 39, 34, 34, 36, 36, 43, 43, 39, 39, 34, 36];
    const bassSteps = bar >= 12 ? [0, 3, 6, 8, 10, 12, 14, 15] : [0, 3, 6, 8, 11, 14];
    if (active(1) && !(breakBar && within < 10) && bassSteps.includes(within)) {
      const octave = bar >= 12 && [10, 15].includes(within) ? 12 : 0;
      const note = roots[bar] + octave + (within === 14 ? 7 : 0);
      tone(midiToHz(note), time, stepDuration() * (within === 0 ? 2.8 : 1.75), trackFilters[1], 'sawtooth', 0.12, within === 15 ? midiToHz(note + 5) : 0);
      tone(midiToHz(note - 12), time, stepDuration() * 1.6, trackFilters[1], 'sine', 0.09);
    }

    if (active(2) && !(trackStates[2].notes?.length) && within === 0) {
      const chordRoots = [48, 48, 55, 55, 51, 51, 46, 46, 48, 48, 55, 55, 51, 51, 46, 48];
      pad(chordRoots[bar], time, stepDuration() * (breakBar ? 15 : 12), bar >= 12 ? 0.045 : 0.034);
    }
    if (active(2) && !(trackStates[2].notes?.length) && bar >= 4 && within % 4 === 2) pluck([72, 75, 79, 70][bar % 4] + (within === 14 ? 7 : 0), time, trackFilters[2], 0.04, stepDuration() * 1.3);
    if (active(2)) trackStates[2].notes?.filter(note => Math.floor(note.start) === within).forEach(note => pluck(noteToMidi(note.note), time, trackFilters[2], 0.055, stepDuration() * note.length));

    if (active(3) && ((bar % 2 === 1 && within === 6) || (bar >= 10 && within === 14))) {
      const note = [72, 75, 79, 77][bar % 4];
      tone(midiToHz(note), time, 0.34, trackFilters[3], 'sine', 0.09, midiToHz(note + 7), 0.018);
      tone(midiToHz(note + 12), time, 0.24, trackFilters[3], 'triangle', 0.025);
    }
    if (active(3) && [3, 7, 11, 15].includes(bar) && within === 0) filteredNoise(time, stepDuration() * 14, trackFilters[3], 0.075, 4200, 'bandpass');

    if (active(4) && bar >= 2 && [2, 7, 10, 15].includes(within)) {
      filteredNoise(time, 0.04, trackFilters[4], within === 15 ? 0.13 : 0.07, 3800 + within * 190, 'bandpass');
      if (within === 7) tone(720, time, 0.08, trackFilters[4], 'square', 0.025, 510);
    }

    const leadBars = bar >= 6 && bar !== 8;
    const leadPattern = [72, 75, 79, 82, 79, 75, 77, 84];
    if (active(5) && leadBars && [0, 3, 6, 10, 12, 14].includes(within)) {
      const note = leadPattern[(bar + Math.floor(within / 2)) % leadPattern.length] + (bar >= 12 ? 12 : 0);
      pluck(note, time, trackFilters[5], bar >= 12 ? 0.075 : 0.055, stepDuration() * (within === 0 ? 2.6 : 1.5));
    }

    trackStates.forEach((track, index) => {
      if (index < 6 || !trackFilters[index] || !active(index)) return;
      const customNotes = track.notes || [];
      if (customNotes.length) customNotes.filter(note => Math.floor(note.start) === within).forEach(note => pluck(noteToMidi(note.note), time, trackFilters[index], 0.055, stepDuration() * note.length));
      else if (track.type === 'Drum Rack' && within % 4 === 2) filteredNoise(time, 0.04, trackFilters[index], 0.06, 5200);
      else if (track.type === 'Mono Bass' && [0, 8].includes(within)) tone(midiToHz(36 + (bar % 4) * 2), time, stepDuration() * 3, trackFilters[index], 'sawtooth', 0.08);
      else if (within % 4 === 0) pluck(60 + ((bar + within / 4) % 8), time, trackFilters[index], 0.045);
    });

    const metronome = $<HTMLButtonElement>('[data-metronome]');
    if (metronome?.classList.contains('active') && within % 4 === 0) tone(within === 0 ? 1200 : 880, time, 0.025, compressor!, 'square', 0.025);
  }

  function scheduler() {
    if (!audio || !playing) return;
    while (nextNoteAt < audio.currentTime + 0.12) {
      schedule(nextStep % 256, nextNoteAt);
      nextNoteAt += stepDuration();
      nextStep = (nextStep + 1) % 256;
    }
  }

  function updateMix() {
    const anySolo = soloed.some(Boolean);
    trackGains.forEach((gain, index) => {
      const audible = !muted[index] && (!anySolo || soloed[index]);
      gain.gain.setTargetAtTime(audible ? trackStates[index].volume : 0, audio?.currentTime ?? 0, 0.012);
    });
  }

  function formatPosition(seconds: number) {
    const totalBeats = seconds / (60 / bpm());
    return `${Math.floor(totalBeats / 4) + 1}.${Math.floor(totalBeats % 4) + 1}.${Math.floor((totalBeats % 1) * 4) + 1}`;
  }

  function drawMeters() {
    if (!analyser) return;
    const values = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(values);
    const energy = values.reduce((sum, value) => sum + value, 0) / values.length / 255;
    meterBars.forEach((bar, index) => bar.classList.toggle('on', index / meterBars.length < energy * 1.8));
    $$<HTMLElement>('[data-track-meter]').forEach((meter, index) => {
      const phase = (performance.now() / 160 + index * 1.7) % 5;
      const value = playing && !muted[index] ? Math.min(100, energy * 88 + Math.abs(Math.sin(phase)) * (index === 0 ? 50 : 24)) : 2;
      meter.style.setProperty('--level', `${value}%`);
    });
  }

  function animate() {
    if (playing) {
      const elapsed = (performance.now() - startedAt) / 1000;
      if (!loopPlayback && elapsed >= loopDuration()) {
        finishRecording();
        playing = false;
        position = loopDuration();
        window.clearInterval(schedulerId);
        playButton.classList.remove('playing');
        playIcon.textContent = '▶';
      } else position = loopPlayback ? elapsed % loopDuration() : elapsed;
    }
    playhead.style.setProperty('--progress', String(position / loopDuration()));
    positionLabel.textContent = formatPosition(position);
    drawMeters();
    const cpu = Math.min(42, Math.round(5 + trackStates.length * 1.25 + (playing ? 8 : 0)));
    $<HTMLElement>('[data-cpu]')?.style.setProperty('width', `${cpu}%`);
    if ($<HTMLElement>('[data-cpu-label]')) $<HTMLElement>('[data-cpu-label]')!.textContent = `${String(cpu).padStart(2, '0')}%`;
    animationId = requestAnimationFrame(animate);
  }

  function finishRecording() {
    if (!recordArmed || !playing) return;
    const beatSeconds = 60 / bpm();
    const elapsed = position >= recordStartPosition ? position - recordStartPosition : loopDuration() - recordStartPosition + position;
    const length = Math.max(1, Math.min(16 - Math.floor(recordStartPosition / beatSeconds / 4), Math.ceil(elapsed / beatSeconds / 4)));
    if (elapsed < beatSeconds / 2) return;
    pushHistory();
    const track = trackStates[selectedTrack];
    const start = Math.min(15, Math.floor(recordStartPosition / beatSeconds / 4));
    track.clips.push({ label: `TAKE ${track.clips.length + 1}`, start, length });
    selectedClip = { track: selectedTrack, clip: track.clips.length - 1 };
    renderTracks();
    markDirty();
    showToast(`Recorded ${length} bar take`);
  }

  async function togglePlay() {
    initAudio();
    await audio!.resume();
    if (playing) {
      finishRecording();
      playing = false;
      window.clearInterval(schedulerId);
      playButton.classList.remove('playing');
      playIcon.textContent = '▶';
      playButton.setAttribute('aria-label', 'Play');
      return;
    }
    playing = true;
    if (recordArmed) recordStartPosition = position;
    startedAt = performance.now() - position * 1000;
    nextStep = Math.floor(position / stepDuration()) % 256;
    nextNoteAt = audio!.currentTime + 0.04;
    scheduler();
    schedulerId = window.setInterval(scheduler, 25);
    playButton.classList.add('playing');
    playIcon.textContent = 'Ⅱ';
    playButton.setAttribute('aria-label', 'Pause');
  }

  function stop() {
    finishRecording();
    playing = false;
    position = 0;
    window.clearInterval(schedulerId);
    playButton.classList.remove('playing');
    playIcon.textContent = '▶';
  }

  function toggleRecord() {
    recordArmed = !recordArmed;
    recordButton.classList.toggle('armed', recordArmed);
    recordButton.setAttribute('aria-pressed', String(recordArmed));
    if (recordArmed && playing) recordStartPosition = position;
    showToast(recordArmed ? 'Recording armed — playback will capture a clip' : 'Recording disarmed');
  }

  function drawWave(canvas: HTMLCanvasElement, track: number, seed = 0) {
    const context = canvas.getContext('2d');
    if (!context) return;
    const color = trackStates[track]?.color || '#67d4ae';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.globalAlpha = 0.82;
    context.beginPath();
    for (let x = 0; x < canvas.width; x += 2) {
      const envelope = Math.sin((x / canvas.width) * Math.PI);
      const wave = track === 0 ? Math.pow(Math.abs(Math.sin(x * 0.17 + seed)), 8) : Math.abs(Math.sin(x * (0.035 + track * 0.009) + seed) * Math.sin(x * 0.11));
      const height = 3 + wave * envelope * 18;
      context.moveTo(x, 25 - height);
      context.lineTo(x, 25 + height);
    }
    context.stroke();
  }

  function clipMarkup(clip: ClipState, track: number, clipIndex: number) {
    return `<button type="button" class="clip" style="--start:${clip.start};--length:${clip.length}" data-clip="${track}-${clipIndex}" data-track="${track}" aria-label="${escapeHtml(clip.label)}"><span>${escapeHtml(clip.label)}</span><canvas width="240" height="50" data-wave="${track}" aria-hidden="true"></canvas><i class="clip-resize" data-resize-clip aria-hidden="true"></i></button>`;
  }

  function renderPianoRoll() {
    const roll = $<HTMLElement>('[data-piano-roll]');
    if (!roll) return;
    const notes = trackStates[selectedTrack]?.notes || [];
    roll.innerHTML = notes.map((note, index) => `<i data-note-index="${index}" style="--note:${escapeHtml(note.note)};--start:${note.start};--length:${note.length}" title="${escapeHtml(note.note)} at step ${note.start + 1}"></i>`).join('');
  }

  function createTrackNodes(track: TrackState, index: number) {
    const head = document.createElement('section');
    const lane = document.createElement('div');
    head.className = 'track-head';
    head.dataset.trackHead = String(index);
    head.style.setProperty('--track', track.color);
    head.innerHTML = `<button class="track-color" type="button" title="Select ${escapeHtml(track.name)}" data-select-track="${index}"></button><div class="track-name"><strong>${escapeHtml(track.name)}</strong><span>${escapeHtml(track.type)}</span></div><div class="track-buttons"><button type="button" title="Mute" data-mute="${index}">M</button><button type="button" title="Solo" data-solo="${index}">S</button></div><label class="track-volume" title="Track volume"><span>−</span><input type="range" min="0" max="100" value="${Math.round(track.volume * 100)}" data-track-volume="${index}"><span>＋</span></label><i class="track-meter" aria-hidden="true"><b data-track-meter="${index}"></b></i>`;
    lane.className = 'track-lane';
    lane.dataset.trackLane = String(index);
    lane.style.setProperty('--track', track.color);
    lane.innerHTML = track.clips.map((clip, clipIndex) => clipMarkup(clip, index, clipIndex)).join('');
    timeline.insertBefore(head, playhead);
    timeline.insertBefore(lane, playhead);
    lane.querySelectorAll<HTMLCanvasElement>('[data-wave]').forEach((canvas, seed) => drawWave(canvas, index, seed));
  }

  function renderTracks() {
    $$('[data-track-head], [data-track-lane]').forEach(node => node.remove());
    trackStates.forEach(createTrackNodes);
    timeline.style.gridTemplateRows = `30px repeat(${trackStates.length}, minmax(72px, 1fr))`;
    selectedTrack = Math.min(selectedTrack, trackStates.length - 1);
    selectTrack(selectedTrack);
    renderSession();
  }

  function renderSession() {
    const session = $<HTMLElement>('[data-session-view]');
    if (!session) return;
    session.style.gridTemplateColumns = `92px repeat(${trackStates.length}, minmax(150px, 1fr))`;
    const trackHeaders = trackStates.map(track => `<div class="session-track-title" style="--track:${track.color}"><i></i><span>${escapeHtml(track.name)}<small>${escapeHtml(track.type)}</small></span></div>`).join('');
    const scenes = [0, 1, 2, 3].map(scene => {
      const clips = trackStates.map((track, trackIndex) => {
        const clip = track.clips[scene % Math.max(1, track.clips.length)];
        return clip
          ? `<button class="session-clip" type="button" style="--track:${track.color}" data-session-clip data-track="${trackIndex}"><span>${escapeHtml(clip.label)}</span><i></i><b>▶</b></button>`
          : `<button class="session-clip empty" type="button" style="--track:${track.color}" data-session-clip data-track="${trackIndex}"><span>＋</span></button>`;
      }).join('');
      return `<button class="scene-launch" type="button" data-scene="${scene}"><span>${scene + 1}</span>▶</button>${clips}`;
    }).join('');
    const stops = trackStates.map((_, index) => `<button class="track-stop" type="button" data-track-stop="${index}">■</button>`).join('');
    session.innerHTML = `<div class="session-corner"><span>SCENES</span><small>LIVE SET</small></div>${trackHeaders}${scenes}<div class="session-corner stop-row"><span>STOP</span></div>${stops}`;
  }

  function selectTrack(index: number, clipIndex?: number) {
    if (!trackStates[index]) return;
    selectedTrack = index;
    if (clipIndex !== undefined) selectedClip = { track: index, clip: clipIndex };
    const track = trackStates[index];
    const clip = selectedClip?.track === index ? track.clips[selectedClip.clip] : null;
    $<HTMLElement>('[data-editor]')?.style.setProperty('--selected', track.color);
    $<HTMLElement>('[data-selected-label]')!.textContent = `${track.name} / ${clip?.label || 'TRACK'}`;
    cutoffInput.value = String(track.cutoff ?? 6200);
    resonanceInput.value = String(track.resonance ?? 1);
    reverbInput.value = String(track.reverb ?? 22);
    $<HTMLElement>('[data-cutoff-value]')!.textContent = Number(cutoffInput.value) >= 1000 ? `${(Number(cutoffInput.value) / 1000).toFixed(1)} kHz` : `${cutoffInput.value} Hz`;
    $<HTMLElement>('[data-resonance-value]')!.textContent = `${Math.round(Number(resonanceInput.value))}%`;
    $<HTMLElement>('[data-reverb-value]')!.textContent = `${Math.round(Number(reverbInput.value))}%`;
    $$('[data-track-head]').forEach((head, headIndex) => head.classList.toggle('selected', headIndex === index));
    renderPianoRoll();
  }

  function addClip(trackIndex = selectedTrack, requestedStart?: number) {
    const track = trackStates[trackIndex];
    if (!track) return;
    const lastEnd = track.clips.reduce((end, clip) => Math.max(end, clip.start + clip.length), 0);
    const start = Math.min(15, requestedStart ?? (lastEnd >= 16 ? 0 : lastEnd));
    const clip = { label: `${track.name.split(' ')[0]} CLIP ${track.clips.length + 1}`, start, length: Math.min(2, 16 - start) };
    pushHistory();
    track.clips.push(clip);
    selectedClip = { track: trackIndex, clip: track.clips.length - 1 };
    renderTracks();
    showToast(`Clip added at bar ${start + 1}`);
    markDirty();
  }

  function createTrack(name: string, type: string, color: string) {
    if (trackStates.length >= 12) { showToast('Track limit reached for this session'); return; }
    pushHistory();
    trackStates.push({ name, type, color, volume: 0.64, cutoff: type === 'Mono Bass' ? 1900 : 6200, resonance: type === 'Mono Bass' ? 2.4 : 0.8, reverb: type === 'Drum Rack' ? 4 : 22, clips: [], notes: [] });
    muted.push(false);
    soloed.push(false);
    if (audio) addTrackAudio(trackStates.length - 1);
    selectedTrack = trackStates.length - 1;
    selectedClip = null;
    renderTracks();
    showToast(`${name} created — double-click its lane to add a clip`);
    markDirty();
  }

  function renameSelected() {
    const clip = selectedClip?.track === selectedTrack ? trackStates[selectedTrack].clips[selectedClip.clip] : null;
    const current = clip?.label || trackStates[selectedTrack].name;
    const next = window.prompt(clip ? 'Clip name' : 'Track name', current)?.trim().slice(0, 32);
    if (!next) return;
    pushHistory();
    if (clip) clip.label = next;
    else trackStates[selectedTrack].name = next;
    renderTracks();
    markDirty();
  }

  function deleteSelected() {
    if (!selectedClip || selectedClip.track !== selectedTrack) {
      if (trackStates.length <= 1) { showToast('A project needs at least one track'); return; }
      const track = trackStates[selectedTrack];
      if (!window.confirm(`Delete track ${track.name}?`)) return;
      pushHistory();
      trackStates.splice(selectedTrack, 1);
      muted.splice(selectedTrack, 1);
      soloed.splice(selectedTrack, 1);
      selectedTrack = Math.max(0, selectedTrack - 1);
      selectedClip = null;
      rebuildAudioTracks();
      renderTracks();
      markDirty();
      showToast(`${track.name} deleted`);
      return;
    }
    const clip = trackStates[selectedTrack].clips[selectedClip.clip];
    if (!clip) return;
    pushHistory();
    trackStates[selectedTrack].clips.splice(selectedClip.clip, 1);
    selectedClip = null;
    renderTracks();
    markDirty();
    showToast(`${clip.label} deleted`);
  }

  function splitClip(button: HTMLButtonElement, clientX: number) {
    const trackIndex = Number(button.dataset.track);
    const clipIndex = Number(button.dataset.clip?.split('-')[1]);
    const clip = trackStates[trackIndex]?.clips[clipIndex];
    if (!clip || clip.length < 2) { showToast('Clip is too short to split'); return; }
    const ratio = (clientX - button.getBoundingClientRect().left) / button.getBoundingClientRect().width;
    const firstLength = Math.max(1, Math.min(clip.length - 1, Math.round(ratio * clip.length)));
    pushHistory();
    const second = { ...clip, label: `${clip.label} B`, start: clip.start + firstLength, length: clip.length - firstLength };
    clip.label = `${clip.label} A`;
    clip.length = firstLength;
    trackStates[trackIndex].clips.splice(clipIndex + 1, 0, second);
    selectedClip = { track: trackIndex, clip: clipIndex + 1 };
    renderTracks();
    markDirty();
    showToast(`Split at bar ${second.start + 1}`);
  }

  function moveClipGesture(event: PointerEvent) {
    if (!clipGesture) return;
    const track = trackStates[clipGesture.track];
    const clip = track?.clips[clipGesture.clip];
    const lane = clipGesture.button.closest<HTMLElement>('[data-track-lane]');
    if (!clip || !lane) return;
    const rawDelta = ((event.clientX - clipGesture.startX) / lane.getBoundingClientRect().width) * 16;
    const snapSize = $<HTMLButtonElement>('[data-snap]')!.classList.contains('off') ? 0.0625 : 0.25;
    const delta = Math.round(rawDelta / snapSize) * snapSize;
    const nextStart = clipGesture.mode === 'move' ? Math.max(0, Math.min(16 - clipGesture.originalLength, clipGesture.originalStart + delta)) : clipGesture.originalStart;
    const nextLength = clipGesture.mode === 'resize' ? Math.max(0.25, Math.min(16 - clipGesture.originalStart, clipGesture.originalLength + delta)) : clipGesture.originalLength;
    if (nextStart === clip.start && nextLength === clip.length) return;
    if (!clipGesture.committed) { pushHistory(); clipGesture.committed = true; }
    clip.start = Number(nextStart.toFixed(4));
    clip.length = Number(nextLength.toFixed(4));
    clipGesture.button.style.setProperty('--start', String(clip.start));
    clipGesture.button.style.setProperty('--length', String(clip.length));
  }

  function endClipGesture() {
    if (!clipGesture) return;
    if (clipGesture.committed) {
      renderSession();
      markDirty();
      showToast(clipGesture.mode === 'resize' ? 'Clip length changed' : `Clip moved to bar ${trackStates[clipGesture.track].clips[clipGesture.clip].start + 1}`);
    }
    clipGesture.button.classList.remove('dragging');
    clipGesture = null;
  }

  function switchView(view: string) {
    activeView = view;
    $$<HTMLButtonElement>('[data-app-view]').forEach(button => button.classList.toggle('active', button.dataset.appView === view));
    $$<HTMLElement>('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== view; });
    studio.classList.toggle('app-panel-open', view !== 'studio');
    const url = new URL(window.location.href);
    if (view === 'studio') url.searchParams.delete('workspace');
    else url.searchParams.set('workspace', view);
    history.replaceState({}, '', url);
    if (view === 'projects') loadProjects();
    if (view === 'journal') loadBlog();
    if (view === 'plans') loadPlans();
  }

  function updateMemberUi() {
    const profile = currentMember?.profile || {};
    const name = profile.nickname || profile.title || currentMember?.contact?.firstName || 'ARCSTEP MEMBER';
    const initials = name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase();
    $<HTMLElement>('[data-member-name]')!.textContent = currentMember ? name.toUpperCase() : 'GUEST PRODUCER';
    $<HTMLElement>('[data-member-avatar]')!.textContent = currentMember ? initials : 'AS';
    $<HTMLElement>('[data-member-state]')!.textContent = currentMember ? 'Wix member session active. Projects sync to your library.' : 'Sign in to sync projects across devices.';
    const action = $<HTMLAnchorElement>('[data-member-action]')!;
    action.textContent = currentMember ? 'SIGN OUT' : 'SIGN IN';
    action.href = '#';
    action.toggleAttribute('data-logout', Boolean(currentMember));
    action.toggleAttribute('data-login', !currentMember);
    const account = $<HTMLAnchorElement>('[data-account]')!;
    account.textContent = currentMember ? initials : 'IN';
    account.title = currentMember ? name : 'Sign in';
    account.href = currentMember ? '/?workspace=projects' : '#';
    account.toggleAttribute('data-login', !currentMember);
  }

  async function beginLogin(returnWorkspace = 'projects') {
    if (!clientId) {
      showToast('Set PUBLIC_WIX_CLIENT_ID in .env.local to enable sign-in.');
      return;
    }
    try {
      const redirectUri = `${window.location.origin}/`;
      const returnUrl = new URL(redirectUri);
      returnUrl.searchParams.set('workspace', returnWorkspace);
      const oauthData = authStrategy.generateOAuthData(redirectUri, returnUrl.toString());
      sessionStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify(oauthData));
      const { authUrl } = await authStrategy.getAuthUrl(oauthData, { prompt: 'login', responseMode: 'query' });
      window.location.href = authUrl;
    } catch (error) {
      console.error(error);
      showToast('Sign in could not start. Please retry.');
    }
  }

  async function finishLoginCallback() {
    const parsed = authStrategy.parseFromUrl(window.location.href, 'query');
    if (!parsed.code || !parsed.state) return false;
    const stored = sessionStorage.getItem(OAUTH_STORAGE_KEY);
    if (!stored) throw new Error('OAuth session data is missing');
    const oauthData = JSON.parse(stored);
    const tokens = await authStrategy.getMemberTokens(parsed.code, parsed.state, oauthData);
    authStrategy.setTokens(tokens);
    sessionStorage.removeItem(OAUTH_STORAGE_KEY);
    window.history.replaceState({}, '', oauthData.originalUri || '/?workspace=projects');
    return true;
  }

  async function logoutMember() {
    try {
      const { logoutUrl } = await authStrategy.logout(`${window.location.origin}/`);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.href = logoutUrl;
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.location.href = '/';
    }
  }

  async function loadMember() {
    try {
      const response = await members.getCurrentMember({ fieldsets: ['FULL'] });
      currentMember = response.member?._id ? response.member : null;
    } catch {
      currentMember = null;
    }
    updateMemberUi();
    return currentMember;
  }

  function serializeSong(): SongState {
    return { version: 2, tracks: trackStates, selectedTrack };
  }

  async function saveProject() {
    if (!currentMember && !(await loadMember())) {
      await beginLogin('projects');
      return;
    }
    const title = window.prompt('Project name', currentProjectName)?.trim().slice(0, 50);
    if (!title) return;
    setSaveState('SAVING', true);
    try {
      const payload: SavedSong = {
        title,
        tempo: bpm(),
        songState: serializeSong(),
        accent: trackStates[selectedTrack]?.color || '#67d4ae',
        duration: loopDuration(),
        isFavorite: false,
      };
      const saved = (currentProjectId
        ? await items.update('ArcstepSongs', { ...payload, _id: currentProjectId })
        : await items.insert('ArcstepSongs', payload)) as SavedSong;
      currentProjectId = saved._id || currentProjectId;
      currentProjectName = title;
      projectTitle.innerHTML = `${escapeHtml(title.toUpperCase())} <b>•</b> CLOUD`;
      const existingIndex = savedSongs.findIndex(song => song._id === saved._id);
      if (existingIndex >= 0) savedSongs[existingIndex] = saved;
      else savedSongs.unshift(saved);
      renderProjects();
      setSaveState('SYNCED');
      try { localStorage.removeItem('arcstep-draft'); } catch { /* Storage may be disabled. */ }
      showToast(`${title} saved to your Wix member library`);
    } catch (error) {
      console.error(error);
      setSaveState('SAVE FAILED', true);
      showToast('Cloud save failed. Sign in again and retry.');
    }
  }

  async function loadProjects() {
    if (!currentMember && !(await loadMember())) { renderProjects(); return; }
    try {
      const result = await items.query('ArcstepSongs').descending('_createdDate').limit(50).find();
      savedSongs = result.items as SavedSong[];
    } catch (error) {
      console.error(error);
      showToast('Could not load the member library');
    }
    renderProjects();
  }

  function renderProjects() {
    const grid = $<HTMLElement>('[data-project-grid]')!;
    $<HTMLElement>('[data-project-count]')!.textContent = String(savedSongs.length);
    if (!currentMember) {
      grid.innerHTML = '<div class="empty-state"><strong>SIGN IN TO OPEN YOUR LIBRARY</strong><span>Member projects are private and author-scoped in Wix CMS.</span><a href="#" data-login>SIGN IN / CREATE ACCOUNT</a></div>';
      return;
    }
    if (!savedSongs.length) {
      grid.innerHTML = '<div class="empty-state"><strong>NO SAVED PROJECTS YET</strong><span>Save NIGHT TRANSIT or start a blank session.</span></div>';
      return;
    }
    grid.innerHTML = savedSongs.map((song, index) => {
      const created = song._createdDate ? new Date(song._createdDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'JUST NOW';
      const tracks = song.songState?.tracks?.length || 0;
      return `<article class="project-card" style="--accent:${escapeHtml(song.accent || '#67d4ae')}"><header><span>${String(index + 1).padStart(2, '0')} / CLOUD</span><button type="button" title="Delete project" aria-label="Delete ${escapeHtml(song.title)}" data-delete-project="${escapeHtml(song._id)}">×</button></header><button class="project-open" type="button" data-open-project="${escapeHtml(song._id)}"><i></i><strong>${escapeHtml(song.title || 'UNTITLED')}</strong><span>${tracks} TRACKS · ${song.tempo || 128} BPM</span></button><footer><span>${created.toUpperCase()}</span><b>OPEN →</b></footer></article>`;
    }).join('');
  }

  function openProject(id: string) {
    const song = savedSongs.find(item => item._id === id);
    if (!song?.songState?.tracks?.length) return;
    stop();
    trackStates = structuredClone(song.songState.tracks);
    muted = trackStates.map(() => false);
    soloed = trackStates.map(() => false);
    selectedTrack = song.songState.selectedTrack || 0;
    selectedClip = null;
    tempoInput.value = String(song.tempo || 128);
    currentProjectName = song.title || 'UNTITLED';
    currentProjectId = song._id || null;
    projectTitle.innerHTML = `${escapeHtml(currentProjectName.toUpperCase())} <b>•</b> CLOUD`;
    rebuildAudioTracks();
    renderTracks();
    switchView('studio');
    setSaveState('LOADED');
    showToast(`${currentProjectName} opened`);
  }

  async function deleteProject(id: string) {
    if (!window.confirm('Delete this saved project?')) return;
    try {
      await items.remove('ArcstepSongs', id);
      savedSongs = savedSongs.filter(song => song._id !== id);
      renderProjects();
      showToast('Project deleted');
    } catch {
      showToast('Project could not be deleted');
    }
  }

  function newProject() {
    if (!window.confirm('Start a new project? Unsaved changes will be cleared.')) return;
    pushHistory();
    stop();
    currentProjectName = 'UNTITLED SIGNAL';
    currentProjectId = null;
    trackStates = [
      { name: 'DRUM RACK', type: 'Drum Rack', color: '#ff6b4a', volume: 0.78, cutoff: 15000, resonance: 0.8, reverb: 4, clips: [] },
      { name: 'BASS', type: 'Mono Bass', color: '#f4ce55', volume: 0.68, cutoff: 1900, resonance: 2.4, reverb: 2, clips: [] },
      { name: 'MIDI TRACK', type: 'Wavetable', color: '#67d4ae', volume: 0.64, cutoff: 6200, resonance: 0.8, reverb: 22, clips: [] },
    ];
    muted = trackStates.map(() => false);
    soloed = trackStates.map(() => false);
    selectedTrack = 2;
    selectedClip = null;
    projectTitle.innerHTML = 'UNTITLED SIGNAL <b>•</b> NEW';
    rebuildAudioTracks();
    renderTracks();
    switchView('studio');
    markDirty();
    showToast('Blank project created — add clips or tracks to begin');
  }

  async function loadBlog() {
    if (blogPosts.length) return;
    const list = $<HTMLElement>('[data-post-list]')!;
    try {
      const result = await posts.listPosts({ paging: { limit: 20, offset: 0 }, fieldsets: ['CONTENT_TEXT', 'RICH_CONTENT'] });
      blogPosts = result.posts || [];
      list.innerHTML = blogPosts.map((post, index) => `<button type="button" data-post-index="${index}"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(post.title)}</strong><small>${post.minutesToRead || 3} MIN READ · ${new Date(post.firstPublishedDate || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}</small></div><b>→</b></button>`).join('');
      if (blogPosts[0]) renderPost(0);
    } catch (error) {
      console.error(error);
      list.innerHTML = '<div class="loading-row error"><span>JOURNAL SIGNAL UNAVAILABLE</span></div>';
    }
  }

  function renderPost(index: number) {
    const post = blogPosts[index];
    if (!post) return;
    $$<HTMLButtonElement>('[data-post-index]').forEach((button, buttonIndex) => button.classList.toggle('active', buttonIndex === index));
    const text = post.contentText || post.excerpt || '';
    const paragraphs = String(text).split(/\n{2,}/).filter(Boolean).slice(0, 8);
    $<HTMLElement>('[data-post-reader]')!.innerHTML = `<span class="post-kicker">FIELD NOTE ${String(index + 1).padStart(2, '0')} · ${post.minutesToRead || 3} MIN READ</span><h2>${escapeHtml(post.title)}</h2><p class="post-deck">${escapeHtml(post.excerpt || '')}</p>${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}<footer><span>PUBLISHED THROUGH WIX BLOG</span><b>ARCSTEP / FIELD NOTES</b></footer>`;
  }

  function planPrice(plan: any) {
    const variant = plan.pricingVariants?.[0];
    const value = Number(variant?.pricingStrategies?.[0]?.flatRate?.amount || 0);
    const symbol = plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : '$';
    const period = variant?.billingTerms?.billingCycle?.period?.toLowerCase() || 'once';
    return { label: `${symbol}${value % 1 ? value.toFixed(2) : value}`, period };
  }

  async function loadPlans() {
    const grid = $<HTMLElement>('[data-plan-grid]')!;
    try {
      const [publicResult, orderResult] = await Promise.all([
        plansV3.queryPlans().eq('visibility', 'PUBLIC').limit(12).find(),
        currentMember ? orders.memberListOrders().catch(() => ({ orders: [] })) : Promise.resolve({ orders: [] }),
      ]);
      const publicPlans = publicResult.items || [];
      const activeOrder = orderResult.orders?.find((order: any) => ['ACTIVE', 'PENDING'].includes(order.status));
      $<HTMLElement>('[data-current-plan]')!.textContent = `CURRENT / ${activeOrder?.planName?.toUpperCase() || 'FREE'}`;
      const freeCard = grid.querySelector('.free-plan')?.outerHTML || '';
      grid.innerHTML = freeCard + publicPlans.map((plan, index) => {
        const price = planPrice(plan);
        const perks = plan.perks || [];
        const active = activeOrder?.planId === plan._id;
        return `<article class="plan-card ${index === 0 ? 'featured' : ''}" style="--plan-color:${index % 2 ? '#a98cff' : '#67d4ae'}"><span>${index === 0 ? 'RECOMMENDED' : 'EXPAND'}</span><h2>${escapeHtml(plan.name)}</h2><p><b>${price.label}</b> / ${escapeHtml(price.period)}</p><div class="plan-description">${escapeHtml(plan.description || '')}</div><ul>${perks.slice(0, 6).map((perk: any) => `<li>${escapeHtml(perk.description)}</li>`).join('')}</ul><button type="button" data-subscribe="${escapeHtml(plan._id)}" ${active ? 'disabled' : ''}>${active ? 'CURRENT PLAN' : 'SUBSCRIBE →'}</button></article>`;
      }).join('');
    } catch (error) {
      console.error(error);
      grid.querySelector('.plan-loading')!.innerHTML = '<span>PLANS UNAVAILABLE</span>';
    }
  }

  async function subscribe(planId: string, button: HTMLButtonElement) {
    if (!currentMember && !(await loadMember())) {
      await beginLogin('plans');
      return;
    }
    button.disabled = true;
    button.textContent = 'OPENING CHECKOUT';
    try {
      const returnUrl = `${window.location.origin}/?workspace=plans&checkout=complete`;
      const result = await redirects.createRedirectSession({
        paidPlansCheckout: { planId },
        callbacks: { postFlowUrl: returnUrl, thankYouPageUrl: returnUrl },
      });
      const checkoutUrl = result.redirectSession?.fullUrl;
      if (!checkoutUrl) throw new Error('Checkout URL missing');
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error(error);
      button.disabled = false;
      button.textContent = 'SUBSCRIBE →';
      showToast('Checkout could not start. Try again after signing in.');
    }
  }

  function setTool(tool: 'pointer' | 'draw' | 'split') {
    activeTool = tool;
    $$<HTMLButtonElement>('[data-tool]').forEach(button => button.classList.toggle('active', button.dataset.tool === tool));
    timeline.dataset.tool = tool;
    showToast(`${tool[0].toUpperCase()}${tool.slice(1)} tool active`);
  }

  function setZoom(next: number) {
    zoomPercent = Math.max(60, Math.min(180, next));
    timeline.style.setProperty('--lane-width', `${Math.round(1536 * zoomPercent / 100)}px`);
    $<HTMLElement>('[data-zoom-label]')!.textContent = `${zoomPercent}%`;
  }

  function filterSounds() {
    const query = $<HTMLInputElement>('[data-sound-search]')!.value.trim().toLowerCase();
    let visible = 0;
    $$<HTMLButtonElement>('[data-sound]').forEach(button => {
      const matchesCategory = button.dataset.soundCategory === activeLibrary;
      const matchesQuery = !query || `${button.dataset.sound} ${button.dataset.soundType}`.toLowerCase().includes(query);
      button.hidden = !(matchesCategory && matchesQuery);
      if (!button.hidden) visible++;
    });
    $<HTMLElement>('[data-sound-heading]')!.textContent = visible ? activeLibrary.toUpperCase() : 'NO MATCHES';
  }

  function loadSound(button: HTMLButtonElement) {
    const name = button.dataset.sound || 'NEW SIGNAL';
    const type = button.dataset.soundType || 'Wavetable';
    const color = button.dataset.soundColor || '#67d4ae';
    if (type === 'Audio Effect') {
      pushHistory();
      if (name.includes('Delay')) {
        trackStates[selectedTrack].reverb = 34;
        trackStates[selectedTrack].cutoff = 7800;
      } else if (name.includes('Chamber')) trackStates[selectedTrack].reverb = 68;
      else trackStates[selectedTrack].cutoff = 1400;
      selectTrack(selectedTrack);
      if (trackFilters[selectedTrack] && audio) trackFilters[selectedTrack].frequency.setTargetAtTime(trackStates[selectedTrack].cutoff || 6200, audio.currentTime, 0.03);
      if (trackReverbSends[selectedTrack] && audio) trackReverbSends[selectedTrack].gain.setTargetAtTime((trackStates[selectedTrack].reverb || 0) / 100, audio.currentTime, 0.03);
      $('[data-editor]')?.classList.add('device-view');
      $$('[data-editor-tab]').forEach(tab => tab.classList.toggle('active', (tab as HTMLButtonElement).dataset.editorTab === 'device'));
      markDirty();
      showToast(`${name} applied to ${trackStates[selectedTrack].name}`);
      return;
    }
    createTrack(name.toUpperCase(), type, color);
    addClip(selectedTrack, 0);
    showToast(`${name} loaded as a new track`);
  }

  async function shareProject() {
    const url = new URL(window.location.href);
    url.searchParams.delete('workspace');
    try {
      await navigator.clipboard.writeText(url.toString());
      showToast('Studio link copied');
    } catch {
      window.prompt('Copy studio link', url.toString());
    }
  }

  function exportProject() {
    const file = new Blob([JSON.stringify({ title: currentProjectName, tempo: bpm(), songState: serializeSong() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'arcstep-session'}.arcstep.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Session exported');
  }

  function resetDemo() {
    if (!window.confirm('Reset the editor to the NIGHT TRANSIT demo?')) return;
    pushHistory();
    stop();
    trackStates = structuredClone(demoTracks);
    selectedTrack = 2;
    selectedClip = { track: 2, clip: 0 };
    currentProjectName = 'NIGHT TRANSIT';
    currentProjectId = null;
    tempoInput.value = '128';
    muted = trackStates.map(() => false);
    soloed = trackStates.map(() => false);
    projectTitle.innerHTML = 'NIGHT TRANSIT <b>•</b> DEMO';
    rebuildAudioTracks();
    renderTracks();
    settingsDialog.close();
    markDirty();
    showToast('Demo restored');
  }

  function openSettings() {
    $<HTMLSelectElement>('[data-sample-rate]')!.value = String(sampleRate);
    $<HTMLInputElement>('[data-loop-playback]')!.checked = loopPlayback;
    $<HTMLInputElement>('[data-autosave]')!.checked = autosave;
    settingsDialog.showModal();
  }

  function applySettings() {
    const nextRate = Number($<HTMLSelectElement>('[data-sample-rate]')!.value) || 48000;
    loopPlayback = $<HTMLInputElement>('[data-loop-playback]')!.checked;
    autosave = $<HTMLInputElement>('[data-autosave]')!.checked;
    if (nextRate !== sampleRate && audio) {
      stop();
      audio.close();
      audio = null;
      compressor = null;
      masterGain = null;
      analyser = null;
      delay = null;
      reverb = null;
      trackFilters = [];
      trackGains = [];
      trackReverbSends = [];
    }
    sampleRate = nextRate;
    try { localStorage.setItem('arcstep-settings', JSON.stringify({ sampleRate, loopPlayback, autosave })); } catch { /* Storage may be disabled. */ }
    $<HTMLElement>('[data-audio-rate]')!.textContent = `${sampleRate / 1000} kHz`;
    settingsDialog.close();
    persistDraft();
    showToast('Studio settings applied');
  }

  studio.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('button, a');
    if (!target) return;
    if (target.matches('[data-login]')) { event.preventDefault(); beginLogin(activeView === 'plans' ? 'plans' : 'projects'); }
    else if (target.matches('[data-logout]')) { event.preventDefault(); logoutMember(); }
    else if (target.matches('[data-play]')) togglePlay();
    else if (target.matches('[data-stop]')) stop();
    else if (target.matches('[data-restart]')) { position = 0; if (playing) startedAt = performance.now(); }
    else if (target.matches('[data-record]')) toggleRecord();
    else if (target.matches('[data-undo]')) undo();
    else if (target.matches('[data-redo]')) redo();
    else if (target.matches('[data-share]')) shareProject();
    else if (target.matches('[data-settings]')) openSettings();
    else if (target.matches('[data-close-settings]')) settingsDialog.close();
    else if (target.matches('[data-export-project]')) exportProject();
    else if (target.matches('[data-reset-demo]')) resetDemo();
    else if (target.matches('[data-save-project]')) saveProject();
    else if (target.matches('[data-new-project]')) newProject();
    else if (target.matches('[data-new-track]')) { trackDialog.showModal(); trackForm.querySelector<HTMLInputElement>('input[name="trackName"]')?.select(); }
    else if (target.matches('[data-close-track]')) trackDialog.close();
    else if (target.matches('[data-rename-selected]')) renameSelected();
    else if (target.matches('[data-add-clip]')) addClip();
    else if (target.matches('[data-delete-selected]')) deleteSelected();
    else if (target.matches('[data-tool]')) setTool(((target as HTMLButtonElement).dataset.tool || 'pointer') as 'pointer' | 'draw' | 'split');
    else if (target.matches('[data-zoom-out]')) setZoom(zoomPercent - 20);
    else if (target.matches('[data-zoom-in]')) setZoom(zoomPercent + 20);
    else if (target.matches('[data-library]')) {
      activeLibrary = (target as HTMLButtonElement).dataset.library || 'instruments';
      $$<HTMLButtonElement>('[data-library]').forEach(button => button.classList.toggle('active', button === target));
      filterSounds();
    }
    else if (target.matches('[data-sound]')) loadSound(target as HTMLButtonElement);
    else if (target.matches('[data-app-view]')) switchView((target as HTMLButtonElement).dataset.appView || 'studio');
    else if (target.matches('[data-select-track]')) { selectedClip = null; selectTrack(Number((target as HTMLButtonElement).dataset.selectTrack)); }
    else if (target.matches('[data-mute]')) {
      const index = Number((target as HTMLButtonElement).dataset.mute);
      muted[index] = !muted[index]; target.classList.toggle('active', muted[index]); updateMix();
    } else if (target.matches('[data-solo]')) {
      const index = Number((target as HTMLButtonElement).dataset.solo);
      soloed[index] = !soloed[index]; target.classList.toggle('active', soloed[index]); updateMix();
    } else if (target.matches('[data-clip]')) {
      const button = target as HTMLButtonElement;
      if (activeTool === 'split') { splitClip(button, event.clientX); return; }
      $$('[data-clip]').forEach(clip => clip.classList.remove('selected'));
      button.classList.add('selected');
      selectTrack(Number(button.dataset.track), Number(button.dataset.clip?.split('-')[1] || 0));
    } else if (target.matches('[data-bar]')) {
      position = Number((target as HTMLButtonElement).dataset.bar) * 4 * 60 / bpm();
      if (playing) startedAt = performance.now() - position * 1000;
    } else if (target.matches('[data-browser-toggle]')) studio.classList.toggle('browser-closed');
    else if (target.matches('[data-editor-toggle]')) studio.classList.toggle('editor-closed');
    else if (target.matches('[data-metronome]')) target.classList.toggle('active');
    else if (target.matches('[data-snap]')) target.classList.toggle('off');
    else if (target.matches('[data-automation]')) { target.classList.toggle('active'); timeline.classList.toggle('automation-on'); }
    else if (target.matches('[data-view]')) {
      const sessionMode = (target as HTMLButtonElement).dataset.view === 'session';
      $('.arrangement')?.classList.toggle('session-mode', sessionMode);
      $$('[data-view]').forEach(button => button.classList.toggle('active', button === target));
    } else if (target.matches('[data-session-clip]')) {
      const button = target as HTMLButtonElement;
      if (button.classList.contains('empty')) { showToast('Empty clip slot'); return; }
      const track = Number(button.dataset.track);
      $$<HTMLButtonElement>(`[data-session-clip][data-track="${track}"]`).forEach(clip => clip.classList.remove('launched'));
      button.classList.add('launched');
      muted[track] = false;
      $<HTMLButtonElement>(`[data-mute="${track}"]`)?.classList.remove('active');
      updateMix();
      selectTrack(track);
      if (!playing) togglePlay();
    } else if (target.matches('[data-scene]')) {
      const scene = Number((target as HTMLButtonElement).dataset.scene);
      $$<HTMLButtonElement>('[data-session-clip]').forEach((clip, index) => {
        if (Math.floor(index / trackStates.length) === scene && !clip.classList.contains('empty')) clip.classList.add('launched');
      });
      showToast(`Scene ${scene + 1} launched`);
      if (!playing) togglePlay();
    } else if (target.matches('[data-track-stop]')) {
      const track = Number((target as HTMLButtonElement).dataset.trackStop);
      $$<HTMLButtonElement>(`[data-session-clip][data-track="${track}"]`).forEach(clip => clip.classList.remove('launched'));
      muted[track] = true;
      $<HTMLButtonElement>(`[data-mute="${track}"]`)?.classList.add('active');
      updateMix();
    } else if (target.matches('[data-editor-tab]')) {
      const device = (target as HTMLButtonElement).dataset.editorTab === 'device';
      $$('[data-editor-tab]').forEach(button => button.classList.toggle('active', button === target));
      $('[data-editor]')?.classList.toggle('device-view', device);
    } else if (target.matches('[data-open-project]')) openProject((target as HTMLButtonElement).dataset.openProject!);
    else if (target.matches('[data-delete-project]')) deleteProject((target as HTMLButtonElement).dataset.deleteProject!);
    else if (target.matches('[data-post-index]')) renderPost(Number((target as HTMLButtonElement).dataset.postIndex));
    else if (target.matches('[data-subscribe]')) subscribe((target as HTMLButtonElement).dataset.subscribe!, target as HTMLButtonElement);
    else if (target.matches('[data-toast]')) showToast((target as HTMLButtonElement).dataset.toast || 'Done');
  });

  studio.addEventListener('pointerdown', event => {
    if (activeTool !== 'pointer' || event.button !== 0) return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-clip]');
    if (!button) return;
    const track = Number(button.dataset.track);
    const clip = Number(button.dataset.clip?.split('-')[1]);
    const state = trackStates[track]?.clips[clip];
    if (!state) return;
    clipGesture = {
      button,
      track,
      clip,
      startX: event.clientX,
      originalStart: state.start,
      originalLength: state.length,
      mode: (event.target as HTMLElement).closest('[data-resize-clip]') ? 'resize' : 'move',
      committed: false,
    };
    button.classList.add('dragging');
    button.setPointerCapture(event.pointerId);
    selectedClip = { track, clip };
    selectTrack(track, clip);
  });
  studio.addEventListener('pointermove', event => moveClipGesture(event));
  studio.addEventListener('pointerup', endClipGesture);
  studio.addEventListener('pointercancel', endClipGesture);

  studio.addEventListener('dblclick', event => {
    const note = (event.target as HTMLElement).closest<HTMLElement>('[data-note-index]');
    if (note) {
      pushHistory();
      trackStates[selectedTrack].notes?.splice(Number(note.dataset.noteIndex), 1);
      renderPianoRoll();
      markDirty();
      showToast('MIDI note deleted');
      return;
    }
    const lane = (event.target as HTMLElement).closest<HTMLElement>('[data-track-lane]');
    if (!lane || (event.target as HTMLElement).closest('[data-clip]')) return;
    const rect = lane.getBoundingClientRect();
    const bar = Math.min(15, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * 16)));
    addClip(Number(lane.dataset.trackLane), bar);
  });

  studio.addEventListener('click', event => {
    const roll = (event.target as HTMLElement).closest<HTMLElement>('[data-piano-roll]');
    if (roll) {
      const existing = (event.target as HTMLElement).closest<HTMLElement>('[data-note-index]');
      $$('[data-note-index]').forEach(note => note.classList.toggle('selected', note === existing));
      if (existing) return;
      const rect = roll.getBoundingClientRect();
      const noteNames = ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4'];
      const row = Math.max(0, Math.min(5, Math.floor(((event.clientY - rect.top) / rect.height) * 6)));
      const start = Math.max(0, Math.min(15, Math.floor(((event.clientX - rect.left) / rect.width) * 16)));
      pushHistory();
      (trackStates[selectedTrack].notes ||= []).push({ note: noteNames[row], start, length: 1 });
      renderPianoRoll();
      markDirty();
      showToast(`${noteNames[row]} added at step ${start + 1}`);
      return;
    }
    if (activeTool !== 'draw') return;
    const lane = (event.target as HTMLElement).closest<HTMLElement>('[data-track-lane]');
    if (!lane || (event.target as HTMLElement).closest('[data-clip]')) return;
    const rect = lane.getBoundingClientRect();
    const rawBar = ((event.clientX - rect.left) / rect.width) * 16;
    const bar = Math.min(15, Math.max(0, Math.floor(rawBar)));
    addClip(Number(lane.dataset.trackLane), bar);
  });

  studio.addEventListener('input', event => {
    const input = event.target as HTMLInputElement;
    if (input.matches('[data-track-volume]')) {
      const index = Number(input.dataset.trackVolume);
      trackStates[index].volume = Number(input.value) / 100;
      updateMix();
      markDirty();
    } else if (input.matches('[data-sound-search]')) {
      filterSounds();
    }
  });

  trackForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(trackForm);
    createTrack(String(data.get('trackName') || 'NEW SIGNAL').trim().toUpperCase(), String(data.get('trackType') || 'Wavetable'), String(data.get('trackColor') || '#67d4ae'));
    trackDialog.close();
    trackForm.reset();
  });

  settingsForm.addEventListener('submit', event => {
    event.preventDefault();
    applySettings();
  });

  tempoInput.addEventListener('change', () => {
    tempoInput.value = String(Math.max(80, Math.min(160, Number(tempoInput.value) || 128)));
    if (playing) startedAt = performance.now() - position * 1000;
    if (delay && audio) delay.delayTime.setTargetAtTime(stepDuration() * 3, audio.currentTime, 0.02);
    markDirty();
  });
  masterInput.addEventListener('input', () => { if (masterGain && audio) masterGain.gain.setTargetAtTime(Number(masterInput.value) / 100, audio.currentTime, 0.01); });
  cutoffInput.addEventListener('input', () => {
    const value = Number(cutoffInput.value);
    $<HTMLElement>('[data-cutoff-value]')!.textContent = value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${value} Hz`;
    if (trackFilters[selectedTrack] && audio) trackFilters[selectedTrack].frequency.setTargetAtTime(value, audio.currentTime, 0.02);
    trackStates[selectedTrack].cutoff = value;
    markDirty();
  });
  resonanceInput.addEventListener('input', () => {
    const value = Number(resonanceInput.value);
    $<HTMLElement>('[data-resonance-value]')!.textContent = `${value}%`;
    if (trackFilters[selectedTrack]) trackFilters[selectedTrack].Q.value = value;
    trackStates[selectedTrack].resonance = value;
    markDirty();
  });
  reverbInput.addEventListener('input', () => {
    const value = Number(reverbInput.value);
    $<HTMLElement>('[data-reverb-value]')!.textContent = `${value}%`;
    trackStates[selectedTrack].reverb = value;
    if (trackReverbSends[selectedTrack] && audio) trackReverbSends[selectedTrack].gain.setTargetAtTime(value / 100, audio.currentTime, 0.02);
    markDirty();
  });

  document.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    const editing = ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName);
    if (event.code === 'Space' && !editing) { event.preventDefault(); togglePlay(); }
    else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
    else if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) { event.preventDefault(); redo(); }
    else if (!editing && (event.key === 'Delete' || event.key === 'Backspace')) { event.preventDefault(); deleteSelected(); }
    else if (!editing && event.key.toLowerCase() === 'b') setTool('draw');
    else if (!editing && event.key.toLowerCase() === 's') setTool('split');
    else if (!editing && event.key.toLowerCase() === 'v') setTool('pointer');
  });

  try {
    const settings = JSON.parse(localStorage.getItem('arcstep-settings') || '{}');
    sampleRate = Number(settings.sampleRate) || 48000;
    loopPlayback = settings.loopPlayback !== false;
    autosave = settings.autosave !== false;
    const draft = autosave ? JSON.parse(localStorage.getItem('arcstep-draft') || 'null') as EditorSnapshot | null : null;
    if (draft?.tracks?.length) {
      trackStates = draft.tracks;
      selectedTrack = Math.min(draft.selectedTrack || 0, trackStates.length - 1);
      selectedClip = draft.selectedClip;
      tempoInput.value = String(draft.tempo || 128);
      currentProjectName = draft.projectName || 'UNTITLED SIGNAL';
      currentProjectId = draft.projectId || null;
      muted = trackStates.map(() => false);
      soloed = trackStates.map(() => false);
      projectTitle.innerHTML = `${escapeHtml(currentProjectName.toUpperCase())} <b>•</b> LOCAL DRAFT`;
      setSaveState('LOCAL DRAFT', true);
    }
  } catch { /* Ignore malformed local preferences. */ }
  $<HTMLElement>('[data-audio-rate]')!.textContent = `${sampleRate / 1000} kHz`;
  renderTracks();
  selectTrack(selectedTrack, selectedClip?.track === selectedTrack ? selectedClip.clip : undefined);
  updateHistoryUi();
  if (window.innerWidth <= 900) studio.classList.add('browser-closed');
  finishLoginCallback().catch(error => {
    console.error(error);
    showToast('Sign in could not be completed. Please retry.');
  }).then(() => loadMember()).then(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('workspace');
    if (requestedView && ['projects', 'journal', 'plans'].includes(requestedView)) switchView(requestedView);
    if (params.get('checkout') === 'complete') showToast('Subscription checkout completed');
  });
  animationId = requestAnimationFrame(animate);
  window.addEventListener('beforeunload', () => { cancelAnimationFrame(animationId); window.clearInterval(schedulerId); audio?.close(); });
}
