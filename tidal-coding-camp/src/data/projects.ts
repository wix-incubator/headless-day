// Camper projects. Mirrors the Wix CMS "CamperProjects" collection schema:
// { title, camperFirstName, cohort, year, datasetUsed, summary, techStack, coverImage }
// projects.astro renders from the CMS when available and falls back to this list.
export interface CamperProject {
  title: string;
  who: string;      // "Noah, 15"
  cohort: string;   // "Spring Tide"
  year: number;
  dataset: string;
  summary: string;
  stack: string[];
}

export const PROJECTS: CamperProject[] = [
  { title: 'Plastic Drift Map', who: 'Noah, 15', cohort: 'Spring Tide', year: 2025, dataset: 'beach litter + wind', summary: 'Maps wind and litter to predict where plastic beaches next.', stack: ['Python', 'pandas', 'folium'] },
  { title: 'Limpet Clock', who: 'Amira, 16', cohort: 'Neap Tide', year: 2025, dataset: 'tide gauge + camera trap', summary: 'A tiny classifier that counts limpet moves from time-lapse frames.', stack: ['Python', 'OpenCV', 'scikit-learn'] },
  { title: 'Harbor Noise Index', who: 'Jules, 14', cohort: 'Spring Tide', year: 2025, dataset: 'hydrophone + ferry times', summary: 'Finds the quietest hour for porpoises from underwater sound.', stack: ['Python', 'librosa', 'matplotlib'] },
  { title: 'Causeway Countdown', who: 'Léa, 15', cohort: 'Neap Tide', year: 2025, dataset: 'SHOM tide tables', summary: 'A live widget counting the safe minutes left to cross.', stack: ['Python', 'Rich'] },
  { title: 'Seagrass Census', who: 'Tomas, 17', cohort: 'Spring Tide', year: 2024, dataset: 'drone photos of the lagoon', summary: 'Measured the lagoon’s seagrass growing across three summers.', stack: ['Python', 'rasterio', 'NumPy'] },
  { title: 'Storm Surge Diary', who: 'Chiara, 16', cohort: 'Neap Tide', year: 2024, dataset: 'pressure + tide gauge', summary: 'Found the causeway floods 11 minutes early on a low barometer.', stack: ['Python', 'pandas', 'SciPy'] },
  { title: 'Crab Traffic', who: 'Yann, 13', cohort: 'Spring Tide', year: 2024, dataset: 'night time-lapse', summary: 'Counted green crabs crossing the slipway by tide phase.', stack: ['Python', 'OpenCV'] },
  { title: 'Salinity Strings', who: 'Maëlle, 15', cohort: 'Neap Tide', year: 2024, dataset: 'salinity probe readings', summary: 'Turned two weeks of salinity readings into a melody.', stack: ['Python', 'music21'] },
  { title: 'Wrack Line Reader', who: 'Ossian, 16', cohort: 'Spring Tide', year: 2023, dataset: 'strandline photos', summary: 'Rebuilt a month of tide heights from photos of the seaweed line.', stack: ['Python', 'Pillow'] },
  { title: 'Puffin Ledger', who: 'Nina, 14', cohort: 'Neap Tide', year: 2023, dataset: 'bird-hide sighting logs', summary: 'Charted puffin arrivals against sea temperature.', stack: ['Python', 'SQLite', 'Plotly'] },
  { title: 'Ghost Net Sonar', who: 'Ewen, 17', cohort: 'Spring Tide', year: 2023, dataset: 'side-scan sonar', summary: 'Flagged snagged fishing gear in sonar scans — two were real.', stack: ['Python', 'NumPy'] },
  { title: 'Tide Pool Weather', who: 'Sacha, 14', cohort: 'Neap Tide', year: 2023, dataset: 'pool temperature loggers', summary: 'Showed each tide pool has its own tiny climate.', stack: ['Python', 'matplotlib'] },
];
