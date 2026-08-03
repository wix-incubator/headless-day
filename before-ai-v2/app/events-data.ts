export type EventsSource = "wix" | "demo";

export type StoryEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  speaker: string;
  icon: string;
  status: string;
  summary: string;
  story: string;
  eventPageUrl?: string;
};

export const seedEvents: StoryEvent[] = [
  {
    id: "dialup-debugging",
    title: "Dial-Up Debugging Night",
    date: "April 12, 2027",
    time: "19:00",
    venue: "Terminal Cafe, Vilnius",
    speaker: "Rasa, Pascal and Delphi veteran",
    icon: "☎",
    status: "Seats available",
    summary:
      "How people shipped production fixes while the modem screamed and the office phone line begged for mercy.",
    story:
      "Rasa tells the room about carrying builds on floppy disks, reading stack traces printed on dot-matrix paper, and learning to hear when a dial-up connection was about to drop.",
  },
  {
    id: "copy-paste-before-stackoverflow",
    title: "Before Stack Overflow, There Were Books",
    date: "May 03, 2027",
    time: "18:30",
    venue: "Old Lab Auditorium",
    speaker: "Jonas, C and Win32 survivor",
    icon: "📘",
    status: "Almost full",
    summary:
      "A guided nostalgia trip through ring-bound manuals, MSDN CDs, and the sacred art of guessing API flags.",
    story:
      "Jonas brings a stack of old reference books and explains how teams traded photocopied pages, wrote wrappers by hand, and celebrated when a compiler error changed into a linker error.",
  },
  {
    id: "nightly-build-rituals",
    title: "The Nightly Build Ritual",
    date: "June 21, 2027",
    time: "20:00",
    venue: "Basement 404",
    speaker: "Milda, release engineer before CI",
    icon: "💿",
    status: "New event",
    summary:
      "One machine, one build script, three nervous engineers, and a CD burner that could ruin a Friday.",
    story:
      "Milda walks through pre-CI release nights: copying binaries across shared drives, guarding the build machine, and naming folders FINAL_FINAL_USE_THIS_ONE.",
  },
  {
    id: "pixel-perfect-ie6",
    title: "Pixel Perfect in IE6",
    date: "July 08, 2027",
    time: "17:45",
    venue: "Blue Screen Gallery",
    speaker: "Tomas, table-layout whisperer",
    icon: "🖥",
    status: "Workshop format",
    summary:
      "Tables inside tables, spacer GIFs, conditional comments, and the strange pride of a layout that survived IE6.",
    story:
      "Tomas recreates an old landing page live and explains why CSS hacks felt like street magic when browsers disagreed about every pixel.",
  },
];
