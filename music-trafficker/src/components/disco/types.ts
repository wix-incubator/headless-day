export interface StoryboardMeta {
  cols: number;
  rows: number;
  frames: number;
  intervalMs: number;
}

export interface VideoItem {
  id: string;
  title: string;
  durationSeconds: number | null;
  storyboard?: StoryboardMeta | null;
  motionPreview?: boolean;
}
