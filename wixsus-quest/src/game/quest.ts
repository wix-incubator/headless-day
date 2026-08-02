export type QuestionKind = 'quiz' | 'logic' | 'boss';

export interface QuestOption {
  id: string;
  label: string;
  correct?: boolean;
  effect?: Record<string, unknown>;
  translations?: { en?: string; he?: string };
  isCustom?: true;
}

export interface Question {
  levelSlug: string;
  order: number;
  kind: QuestionKind;
  question: string;
  options: QuestOption[];
  effectKey?: string;
  explain?: string;
  translations?: {
    en?: { question: string; explain?: string };
    he?: { question: string; explain?: string };
  };
}

export interface Level {
  levelNumber: number;
  slug: string;
  title: string;
  intro: string;
  sitePart: string;
  bossName: string;
  bossIntro: string;
  bossImage?: string;
  translations?: {
    en?: { title: string; intro: string; bossName: string; bossIntro: string };
    he?: { title: string; intro: string; bossName: string; bossIntro: string };
  };
}

export const VIXIK_HERO =
  'https://static.wixstatic.com/media/4b150e_b6346fa9de284a41a50526f19c988599~mv2.png';
export const VIXIK_VICTORY =
  'https://static.wixstatic.com/media/4b150e_25765309a70649dda918b606670f1213~mv2.png';
export const BG_WORLD =
  'https://static.wixstatic.com/media/4b150e_610eafbd1e0543cca3f6681799df3337~mv2.png';

const BOSS_IMG: Record<string, string> = {
  palette: 'https://static.wixstatic.com/media/4b150e_78ef19f5b57e418086db43393d593b79~mv2.png',
  typography: 'https://static.wixstatic.com/media/4b150e_0edfd446ab744aa0b4d6a6d5a3218ae7~mv2.png',
  imagery: 'https://static.wixstatic.com/media/4b150e_e1b1818c7c8e441fb24c883445209843~mv2.png',
  services: 'https://static.wixstatic.com/media/4b150e_9a46eed47967431abd205db3dc882513~mv2.png',
  features: 'https://static.wixstatic.com/media/4b150e_a4194f045f294a9fb3b68ce1784c76f8~mv2.png',
};

export const WIX_APPS = [
  { id: 'stores', icon: '🛒' },
  { id: 'bookings', icon: '📅' },
  { id: 'events', icon: '🎟️' },
  { id: 'blog', icon: '📝' },
  { id: 'members', icon: '👥' },
  { id: 'forms', icon: '📋' },
  { id: 'restaurants', icon: '🍽️' },
  { id: 'pricing', icon: '💰' },
] as const;

export type WixAppId = (typeof WIX_APPS)[number]['id'];

const p = (id: string, label: string, extra: Partial<QuestOption> = {}): QuestOption => ({
  id,
  label,
  ...extra,
});

const TL: Record<string, { en: string; he: string }> = {
  sunny: { en: 'Sunny', he: 'שמשי' }, ocean: { en: 'Ocean', he: 'אוקייני' }, forest: { en: 'Forest', he: 'יערי' }, sunset: { en: 'Sunset', he: 'שקיעה' },
  royal: { en: 'Royal', he: 'מלכותי' }, rose: { en: 'Rose', he: 'ורדרד' }, slate: { en: 'Slate', he: 'גרפיט' },
  serif: { en: 'Elegant', he: 'אלגנטי' }, sans: { en: 'Modern', he: 'מודרני' }, rounded: { en: 'Playful', he: 'שובב' }, mono: { en: 'Technical', he: 'טכני' },
  editorial: { en: 'Editorial', he: 'מגזיני' }, classic: { en: 'Classic', he: 'קלאסי' },
  cafe: { en: 'Café', he: 'בית קפה' }, photo: { en: 'Photo studio', he: 'סטודיו לצילום' }, jewelry: { en: 'Jewelry shop', he: 'חנות תכשיטים' }, yoga: { en: 'Yoga studio', he: 'סטודיו ליוגה' },
  bakery: { en: 'Bakery', he: 'מאפייה' }, barber: { en: 'Barbershop', he: 'מספרה' },
  friendly: { en: 'Friendly', he: 'ידידותי' }, formal: { en: 'Formal', he: 'רשמי' }, brief: { en: 'Concise', he: 'תמציתי' }, bold: { en: 'Bold', he: 'נועז' }, warm: { en: 'Warm', he: 'חמים' },
  photoStyle: { en: 'Real photos', he: 'תמונות אמיתיות' }, illustration: { en: 'Illustrations', he: 'איורים' }, threed: { en: '3D & depth', he: 'תלת-מימד ונפח' }, pattern: { en: 'Minimal & patterns', he: 'מינימליזם ודוגמאות' }, retro: { en: 'Retro', he: 'רטרו' },
  sharp: { en: 'Sharp corners', he: 'פינות חדות' }, soft: { en: 'Soft rounding', he: 'פינות מעוגלות' }, pill: { en: 'Pill', he: 'קפסולה' }, wide: { en: 'Extra soft', he: 'מעוגל מאוד' },
  book: { en: 'Book', he: 'קביעת תור' }, buy: { en: 'Order', he: 'הזמנה' }, write: { en: 'Write', he: 'כתיבה' }, call: { en: 'Call', he: 'התקשרות' }, subscribe: { en: 'Subscribe', he: 'הרשמה' },
  landing: { en: 'Landing', he: 'דף נחיתה' }, portfolio: { en: 'Portfolio', he: 'תיק עבודות' }, business: { en: 'Business', he: 'עסקי' }, store: { en: 'Online store', he: 'חנות מקוונת' },
};

export const PALETTES = {
  sunny: { name: 'Сонячна', bg: '#FFF8E1', surface: '#FFFFFF', text: '#1A1A1A', accent: '#FFC800', accentText: '#1A1A1A' },
  ocean: { name: 'Океанська', bg: '#E8F4F8', surface: '#FFFFFF', text: '#0B2239', accent: '#0E7490', accentText: '#FFFFFF' },
  forest: { name: 'Лісова', bg: '#F0F5EC', surface: '#FFFFFF', text: '#1B2E20', accent: '#2F7D32', accentText: '#FFFFFF' },
  sunset: { name: 'Захід сонця', bg: '#FFF0EB', surface: '#FFFFFF', text: '#2B1B2F', accent: '#E85D4A', accentText: '#FFFFFF' },
  royal: { name: 'Королівська', bg: '#F3F0FA', surface: '#FFFFFF', text: '#241A3A', accent: '#6C4BD8', accentText: '#FFFFFF' },
  rose: { name: 'Трояндова', bg: '#FFF0F4', surface: '#FFFFFF', text: '#3A1826', accent: '#D6336C', accentText: '#FFFFFF' },
  slate: { name: 'Графітова', bg: '#F2F2F3', surface: '#FFFFFF', text: '#1A1A1A', accent: '#3A3A3A', accentText: '#FFFFFF' },
} as const;

export const FONTS = {
  serif: { name: 'Елегантний', heading: "'Playfair Display', serif", body: "'Source Serif 4', Georgia, serif" },
  sans: { name: 'Сучасний', heading: "'Manrope', sans-serif", body: "'Inter', sans-serif" },
  rounded: { name: 'Грайливий', heading: "'Baloo 2', system-ui, sans-serif", body: "'Nunito', sans-serif" },
  mono: { name: 'Технічний', heading: "'Space Mono', monospace", body: "'IBM Plex Mono', monospace" },
  editorial: { name: 'Журнальний', heading: "'Chakra Petch', sans-serif", body: "'EB Garamond', serif" },
  classic: { name: 'Класичний', heading: "'Playfair Display', serif", body: "'Inter', sans-serif" },
} as const;

export const BUSINESSES = {
  cafe: {
    type: 'cafe', name: "Кав'ярня", siteName: "Затишна кав'ярня", tagline: 'Кава, за якою повертаються',
    services: [
      { icon: '☕', title: 'Авторська кава', text: 'Фільтр, еспресо та сезонні напої з зерна свіжого обсмаження.' },
      { icon: '🥐', title: 'Сніданки та випічка', text: 'Круасани, сирники й каші — все готуємо зранку на місці.' },
      { icon: '🎉', title: 'Кейтеринг подій', text: 'Кавова станція та десерти на вашому святі чи конференції.' },
      { icon: '🫘', title: 'Зерно з собою', text: 'Свіжообсмажене зерно та дріп-пакети для дому й офісу.' },
    ],
  },
  photo: {
    type: 'photo', name: 'Фотостудія', siteName: 'Студія світла', tagline: 'Ловимо миті, які хочеться переживати знову',
    services: [
      { icon: '📷', title: 'Портретні зйомки', text: 'Індивідуальні та сімейні портрети в студії або на локації.' },
      { icon: '💍', title: 'Весільна фотографія', text: 'Повний день з вами — від ранку нареченої до першого танцю.' },
      { icon: '📦', title: 'Предметна зйомка', text: 'Каталожні та імiджеві фото продуктів для магазинів і брендів.' },
      { icon: '🎬', title: 'Оренда студії', text: 'Три зали з циклорамою, світлом та реквізитом погодинно.' },
    ],
  },
  jewelry: {
    type: 'jewelry', name: 'Крамниця прикрас', siteName: 'Майстерня блиску', tagline: 'Прикраси з характером — вашим',
    services: [
      { icon: '💍', title: 'Каблучки ручної роботи', text: 'Срібло та золото, камені на вибір — кожна каблучка єдина.' },
      { icon: '✒️', title: 'Гравіювання', text: 'Імена, дати й таємні послання на ваших прикрасах.' },
      { icon: '✨', title: 'Індивідуальні замовлення', text: 'Втілимо ваш ескіз або придумаємо дизайн разом з нуля.' },
      { icon: '🔧', title: 'Ремонт прикрас', text: 'Полагодимо застібку, повернемо блиск і замінимо камінь.' },
    ],
  },
  yoga: {
    type: 'yoga', name: 'Йога-студія', siteName: 'Простір рівноваги', tagline: 'Дихай. Рухайся. Будь тут',
    services: [
      { icon: '🌅', title: 'Ранкові класи', text: 'Мʼяка практика о 7:30, щоб день почався з ясної голови.' },
      { icon: '🧘', title: 'Йога для початківців', text: 'Пояснюємо кожну асану — прийти можна без жодного досвіду.' },
      { icon: '🤝', title: 'Індивідуальні сесії', text: 'Персональна програма під вашу спину, ритм і цілі.' },
      { icon: '⛰️', title: 'Ретрити вихідного дня', text: 'Два дні практики, тиші та гір — перезавантаження гарантоване.' },
    ],
  },
  bakery: {
    type: 'bakery', name: 'Пекарня', siteName: 'Домашня пекарня', tagline: 'Тепло свіжого хліба щоранку',
    services: [
      { icon: '🍞', title: 'Свіжий хліб', text: 'Печемо на заквасці щоранку — скоринка хрустить, а мʼякуш дихає.' },
      { icon: '🥐', title: 'Круасани та випічка', text: 'Листкове тісто, вершкове масло й начинки на будь-який смак.' },
      { icon: '🎂', title: 'Торти на замовлення', text: 'Святкові торти та тістечка за вашим задумом і точно до дати.' },
      { icon: '🥖', title: 'Випічка для закладів', text: 'Регулярні постачання свіжого хліба в кафе та ресторани.' },
    ],
  },
  barber: {
    type: 'barber', name: 'Барбершоп', siteName: 'Чоловічий барбершоп', tagline: 'Стрижка, гоління і трохи характеру',
    services: [
      { icon: '✂️', title: 'Чоловічі стрижки', text: 'Класика й сучасні форми під тип волосся та риси обличчя.' },
      { icon: '🪒', title: 'Королівське гоління', text: 'Гаряча серветка, небезпечна бритва і бездоганний контур.' },
      { icon: '🧔', title: 'Догляд за бородою', text: 'Форма, окантовка та олії, щоб борода виглядала охайно.' },
      { icon: '👦', title: 'Стрижка для хлопчиків', text: 'Спокійно й швидко підстрижемо навіть найменших клієнтів.' },
    ],
  },
} as const;

export const TONES = {
  friendly: { name: 'Дружній', greeting: 'Привіт! Заходь — у нас затишно', about: 'Ми робимо те, що любимо, і хочемо ділитися цим з тобою. Без пафосу, з душею.' },
  formal: { name: 'Поважний', greeting: 'Ласкаво просимо', about: 'Ми цінуємо Вашу довіру та працюємо, щоб кожна деталь відповідала найвищим очікуванням.' },
  brief: { name: 'Лаконічний', greeting: 'Коротко про нас', about: 'Робимо добре. Вчасно. Для вас.' },
  bold: { name: 'Сміливий', greeting: 'Ти тут не випадково — почнімо', about: 'Ми не боїмося сильних рішень і робимо те, що інші лише обіцяють.' },
  warm: { name: 'Теплий', greeting: 'Раді бачити тебе тут', about: 'Ми зустрічаємо кожного гостя, як доброго друга, і дбаємо про кожну дрібницю.' },
} as const;

export const IMAGE_STYLES = {
  photo: { name: 'Живі фото', style: 'photo' },
  illustration: { name: 'Ілюстрації', style: 'illustration' },
  threed: { name: '3D та обʼєм', style: '3d' },
  pattern: { name: 'Мінімалізм і патерни', style: 'pattern' },
  retro: { name: 'Ретро', style: 'pattern' },
} as const;

export const RADII = {
  sharp: { name: 'Гострі кути', radius: '0px' },
  soft: { name: 'Мʼякі заокруглення', radius: '18px' },
  pill: { name: 'Капсули', radius: '34px' },
  wide: { name: 'Дуже мʼякі', radius: '26px' },
} as const;

export const CTAS = {
  book: { name: 'Записатись', label: 'Записатись' },
  buy: { name: 'Замовити', label: 'Замовити' },
  write: { name: 'Написати', label: 'Написати нам' },
  call: { name: 'Зателефонувати', label: 'Зателефонувати' },
  subscribe: { name: 'Підписатись', label: 'Підписатись' },
} as const;

export const TEMPLATES = {
  landing: { name: 'Лендінг', layout: 'landing' },
  portfolio: { name: 'Портфоліо', layout: 'portfolio' },
  business: { name: 'Бізнес', layout: 'business' },
  store: { name: 'Магазин', layout: 'store' },
} as const;

export const FALLBACK_LEVELS: Level[] = [
  {
    levelNumber: 1, slug: 'palette', title: 'Долина Кольорів', sitePart: 'hero', bossImage: BOSS_IMG.palette,
    intro: 'Перший рубіж — Долина Кольорів. Тут народжується настрій твого світу. Обери палітру, яка говоритиме замість тебе.',
    bossName: 'Ахрома, Пожирач Барв', bossIntro: 'Я — Ахрома. Кожен колір, до якого торкаюсь, стає попелом. Твій світ згасне в сірому, як і сотні до нього. Доведи, що бачиш барви, — або впади в морок.',
    translations: {
      en: { title: 'Valley of Colors', intro: 'The first frontier — the Valley of Colors. Here the mood of your world is born. Choose the palette that will speak for you.', bossName: 'Achroma, the Color-Eater', bossIntro: 'I am Achroma. Every color I touch turns to ash. Your world will fade to gray, like a hundred before it. Prove you can see in color — or fall into the dark.' },
      he: { title: 'עמק הצבעים', intro: 'הגבול הראשון — עמק הצבעים. כאן נולד מצב הרוח של עולמך. בחר את הפלטה שתדבר בשמך.', bossName: 'אכרומה, טורף הצבעים', bossIntro: 'אני אכרומה. כל צבע שאני נוגע בו הופך לאפר. עולמך ידעך אל האפור, כמו מאה שקדמו לו. הוכח שאתה רואה בצבע — או שקע אל החושך.' },
    },
  },
  {
    levelNumber: 2, slug: 'typography', title: 'Ліс Літер', sitePart: 'about', bossImage: BOSS_IMG.typography,
    intro: 'Колір обрано. Тепер твій світ має заговорити. У Лісі Літер обери голос шрифтів — характер, що звучатиме в кожному слові.',
    bossName: 'Враксіс, Кернінг-Кракен', bossIntro: 'Я — Враксіс. Я вкручу твої слова у вир, доки жодне не читатиметься. Порядок літер — єдина твоя зброя. Утримай його, якщо зможеш.',
    translations: {
      en: { title: 'Forest of Letters', intro: 'The colors are set. Now your world must find its voice. In the Forest of Letters, choose the character of your type — the tone behind every word.', bossName: 'Vraxis, the Kerning Kraken', bossIntro: 'I am Vraxis. I\'ll drag your words into the deep until not one can be read. Order is your only weapon here. Hold it — if you can.' },
      he: { title: 'יער האותיות', intro: 'הצבעים נקבעו. עכשיו על עולמך למצוא את קולו. ביער האותיות בחר את אופי הגופנים — הנימה שמאחורי כל מילה.', bossName: 'וראקסיס, קראקן הקרנינג', bossIntro: 'אני וראקסיס. אמשוך את מילותיך אל המצולות עד שאף אחת לא תהיה קריאה. הסדר הוא נשקך היחיד כאן. אחוז בו — אם תוכל.' },
    },
  },
  {
    levelNumber: 3, slug: 'imagery', title: 'Галерея Туманів', sitePart: 'gallery', bossImage: BOSS_IMG.imagery,
    intro: 'Твій світ говорить твоїм голосом. Час дати йому очі. У Галереї Туманів обери стиль образів і форму елементів.',
    bossName: 'Мірфог, Піксельний Привид', bossIntro: 'Я — Мірфог. З туману я приходжу, і кожен твій образ тане до жмені пікселів. Що ти покажеш світові, коли не лишиться нічого чіткого?',
    translations: {
      en: { title: 'Gallery of Mists', intro: 'Your world speaks in your voice. Now give it eyes. In the Gallery of Mists, choose the style of your imagery and the shape of its elements.', bossName: 'Mirefog, the Pixel Wraith', bossIntro: 'I am Mirefog. Out of the haze I come, and every image of yours melts to a handful of pixels. What will you show the world when nothing stays sharp?' },
      he: { title: 'גלריית הערפילים', intro: 'עולמך מדבר בקולך. עכשיו תן לו עיניים. בגלריית הערפילים בחר את סגנון הדימויים ואת צורת האלמנטים.', bossName: 'מיירפוג, רוח הפיקסלים', bossIntro: 'אני מיירפוג. מתוך הערפל אני בא, וכל דימוי שלך נמס לחופן פיקסלים. מה תראה לעולם כשדבר לא יישאר חד?' },
    },
  },
  {
    levelNumber: 4, slug: 'services', title: 'Вершина Послуг', sitePart: 'services', bossImage: BOSS_IMG.services,
    intro: 'Вершина Послуг близько. Тут світ дізнається, на що ти здатний і як тебе знайти. Але на самому шпилі чекає щось, що ненавидить усе неповторне...',
    bossName: 'Моноліт, Сірий Шаблон', bossIntro: 'Я — Моноліт. Мільйон сайтів носять моє обличчя, і твій стане ще одним. Навіщо опиратись? Однаковість — це спокій. Здайся — і розчинися серед решти.',
    translations: {
      en: { title: 'Peak of Services', intro: 'The Peak of Services is near. Here the world learns what you can do and how to reach you. But at the very summit waits something that despises all that is unique...', bossName: 'Monolith, the Gray Template', bossIntro: 'I am Monolith. A million sites wear my face, and yours will be one more. Why resist? Sameness is peace. Surrender — and dissolve among the rest.' },
      he: { title: 'פסגת השירותים', intro: 'פסגת השירותים קרובה. כאן ילמד העולם מה ביכולתך ואיך למצוא אותך. אך בראש הפסגה ממתין דבר ששונא כל מה שייחודי...', bossName: 'מונולית, התבנית האפורה', bossIntro: 'אני מונולית. מיליון אתרים נושאים את פניי, ושלך יהיה עוד אחד. למה להתנגד? אחידות היא שלווה. היכנע — והימוג בין כל השאר.' },
    },
  },
  {
    levelNumber: 5, slug: 'features', title: 'Вежа Можливостей', sitePart: 'features', bossImage: BOSS_IMG.features,
    intro: 'Останній рубіж — Вежа Можливостей. Твій світ майже завершено; лишилось озброїти його. Обери сили з арсеналу Wix: магазин, записи, блог — те, що зробить його живим.',
    bossName: 'Обсолекс, Релікт Минулого', bossIntro: 'Я — Обсолекс, останній із древніх. Я бачив, як постають і тліють тисячі сайтів. Твій я скую іржею й тишею, доки він не спиниться назавжди. Хто ти такий, щоб мене здолати?',
    translations: {
      en: { title: 'Tower of Features', intro: 'The final frontier — the Tower of Features. Your world is nearly whole; now arm it. Choose your powers from the Wix arsenal: a store, bookings, a blog — whatever makes it breathe.', bossName: 'Obsolex, Relic of the Past', bossIntro: 'I am Obsolex, last of the ancients. I have watched a thousand sites rise and rot. Yours I\'ll bind in rust and silence until it stops for good. And who are you to end me?' },
      he: { title: 'מגדל האפשרויות', intro: 'הגבול האחרון — מגדל האפשרויות. עולמך כמעט שלם; עכשיו חמש אותו. בחר את כוחותיך מארסנל Wix: חנות, הזמנות, בלוג — מה שיפיח בו חיים.', bossName: 'אובסולקס, שריד העבר', bossIntro: 'אני אובסולקס, האחרון שבקדמונים. ראיתי אלף אתרים קמים ונרקבים. את שלך אכבול בחלודה ובדממה עד שיעצור לתמיד. ומי אתה שתחסל אותי?' },
    },
  },
];

export const FALLBACK_QUESTIONS: Question[] = [
  {
    levelSlug: 'palette', order: 1, kind: 'quiz', effectKey: 'palette', question: 'Який вигляд і настрій хочеш для сайту? Обери колірну тему.',
    options: Object.entries(PALETTES).map(([id, v]) => p(id, v.name, { effect: v, translations: TL[id] })),
    translations: {
      en: { question: 'What look and feel do you want for your site? Choose a color theme.' },
      he: { question: 'איזה מראה ותחושה אתה רוצה לאתר שלך? בחר ערכת צבעים.' },
    },
  },
  {
    levelSlug: 'palette', order: 2, kind: 'quiz', effectKey: 'template', question: 'Обери шаблон для свого сайту.',
    options: Object.entries(TEMPLATES).map(([id, v]) => p(id, v.name, { effect: v, translations: TL[id] })),
    translations: {
      en: { question: 'Choose a template for your site.' },
      he: { question: 'בחר תבנית לאתר שלך.' },
    },
  },
  {
    levelSlug: 'palette', order: 3, kind: 'quiz', effectKey: 'business', question: 'Який сайт ти створюєш? Обери напрям своєї справи.',
    options: Object.entries(BUSINESSES).map(([id, v]) => p(id, v.name, { effect: v, translations: TL[id] })),
    translations: {
      en: { question: 'What kind of site are you creating? Choose your line of business.' },
      he: { question: 'איזה אתר אתה יוצר? בחר את תחום העיסוק שלך.' },
    },
  },
  {
    levelSlug: 'palette', order: 10, kind: 'boss', question: 'Якого кольору небо ясного сонячного дня?',
    explain: 'Ясного дня чисте небо блакитне: так розсіюється сонячне світло.',
    options: [p('blue', 'Блакитного', { correct: true, translations: { en: 'Blue', he: 'תכלת' } }), p('green', 'Зеленого', { translations: { en: 'Green', he: 'ירוק' } }), p('pink', 'Рожевого', { translations: { en: 'Pink', he: 'ורוד' } }), p('black', 'Чорного', { translations: { en: 'Black', he: 'שחור' } }), p('gray', 'Сірого', { translations: { en: 'Gray', he: 'אפור' } }), p('orange', 'Оранжевого', { translations: { en: 'Orange', he: 'כתום' } })],
    translations: {
      en: { question: 'What color is the sky on a clear sunny day?', explain: 'On a clear day the open sky is blue — that\'s how sunlight scatters.' },
      he: { question: 'באיזה צבע השמיים ביום שמשי בהיר?', explain: 'ביום בהיר השמיים הפתוחים תכולים — כך מתפזר אור השמש.' },
    },
  },
  {
    levelSlug: 'palette', order: 11, kind: 'boss', question: 'Що вийде, якщо змішати червону та білу фарби?',
    explain: 'Червоне, розбавлене білим, дає рожеве.',
    options: [p('pink', 'Рожевий', { correct: true, translations: { en: 'Pink', he: 'ורוד' } }), p('black', 'Чорний', { translations: { en: 'Black', he: 'שחור' } }), p('green', 'Зелений', { translations: { en: 'Green', he: 'ירוק' } }), p('blue', 'Синій', { translations: { en: 'Blue', he: 'כחול' } }), p('purple', 'Фіолетовий', { translations: { en: 'Purple', he: 'סגול' } }), p('gray', 'Сірий', { translations: { en: 'Gray', he: 'אפור' } })],
    translations: {
      en: { question: 'What do you get if you mix red and white paint?', explain: 'Red softened with white gives you pink.' },
      he: { question: 'מה מקבלים אם מערבבים צבע אדום ולבן?', explain: 'אדום המדולל בלבן נותן ורוד.' },
    },
  },
  {
    levelSlug: 'palette', order: 12, kind: 'boss', question: 'Якого кольору стиглий банан?',
    explain: 'Стиглий банан — жовтий. Колір самого Wixsus.',
    options: [p('yellow', 'Жовтого', { correct: true, translations: { en: 'Yellow', he: 'צהוב' } }), p('blue', 'Синього', { translations: { en: 'Blue', he: 'כחול' } }), p('green', 'Зеленого', { translations: { en: 'Green', he: 'ירוק' } }), p('red', 'Червоного', { translations: { en: 'Red', he: 'אדום' } }), p('purple', 'Фіолетового', { translations: { en: 'Purple', he: 'סגול' } }), p('orange', 'Оранжевого', { translations: { en: 'Orange', he: 'כתום' } })],
    translations: {
      en: { question: 'What color is a ripe banana?', explain: 'A ripe banana is yellow — the very color of Wixsus.' },
      he: { question: 'באיזה צבע בננה בשלה?', explain: 'בננה בשלה היא צהובה — צבעו של Wixsus עצמו.' },
    },
  },

  {
    levelSlug: 'typography', order: 1, kind: 'quiz', effectKey: 'fontPair', question: 'Обери стиль шрифтів для свого сайту.',
    options: Object.entries(FONTS).map(([id, v]) => p(id, v.name, { effect: v, translations: TL[id] })),
    translations: {
      en: { question: 'Choose the font style for your site.' },
      he: { question: 'בחר את סגנון הגופנים לאתר שלך.' },
    },
  },
  {
    levelSlug: 'typography', order: 2, kind: 'logic', question: 'Продовж: понеділок, вівторок, ...',
    explain: 'Дні тижня йдуть по порядку: за вівторком — середа.',
    options: [p('wed', 'Середа', { correct: true, translations: { en: 'Wednesday', he: 'יום רביעי' } }), p('fri', 'Пʼятниця', { translations: { en: 'Friday', he: 'יום שישי' } }), p('sun', 'Неділя', { translations: { en: 'Sunday', he: 'יום ראשון' } }), p('sat', 'Субота', { translations: { en: 'Saturday', he: 'שבת' } }), p('mon', 'Понеділок', { translations: { en: 'Monday', he: 'יום שני' } }), p('thu', 'Четвер', { translations: { en: 'Thursday', he: 'יום חמישי' } })],
    translations: {
      en: { question: 'Continue: Monday, Tuesday, ...', explain: 'The days run in order: Wednesday follows Tuesday.' },
      he: { question: 'המשך: יום שני, יום שלישי, ...', explain: 'ימי השבוע באים לפי הסדר: אחרי יום שלישי בא יום רביעי.' },
    },
  },
  {
    levelSlug: 'typography', order: 3, kind: 'quiz', effectKey: 'tone', question: 'Яким тоном сайт спілкуватиметься з відвідувачами?',
    options: Object.entries(TONES).map(([id, v]) => p(id, v.name, { effect: v, translations: TL[id] })),
    translations: {
      en: { question: 'What tone will your site use to speak with visitors?' },
      he: { question: 'באיזה טון האתר ידבר עם המבקרים?' },
    },
  },
  {
    levelSlug: 'typography', order: 10, kind: 'boss', question: 'Скільки днів у тижні?',
    explain: 'Тиждень — це сім днів, від понеділка до неділі.',
    options: [p('seven', 'Сім', { correct: true, translations: { en: 'Seven', he: 'שבעה' } }), p('five', 'Пʼять', { translations: { en: 'Five', he: 'חמישה' } }), p('ten', 'Десять', { translations: { en: 'Ten', he: 'עשרה' } }), p('twelve', 'Дванадцять', { translations: { en: 'Twelve', he: 'שנים עשר' } }), p('six', 'Шість', { translations: { en: 'Six', he: 'שישה' } }), p('eight', 'Вісім', { translations: { en: 'Eight', he: 'שמונה' } })],
    translations: {
      en: { question: 'How many days are in a week?', explain: 'A week is seven days, from Monday to Sunday.' },
      he: { question: 'כמה ימים יש בשבוע?', explain: 'שבוע הוא שבעה ימים, מיום שני עד יום ראשון.' },
    },
  },
  {
    levelSlug: 'typography', order: 11, kind: 'boss', question: 'Яка пора року настає після зими?',
    explain: 'За зимою завжди приходить весна.',
    options: [p('spring', 'Весна', { correct: true, translations: { en: 'Spring', he: 'אביב' } }), p('summer', 'Літо', { translations: { en: 'Summer', he: 'קיץ' } }), p('autumn', 'Осінь', { translations: { en: 'Autumn', he: 'סתיו' } }), p('winter', 'Знову зима', { translations: { en: 'Winter again', he: 'שוב חורף' } }), p('lateautumn', 'Пізня осінь', { translations: { en: 'Late autumn', he: 'סוף הסתיו' } }), p('midsummer', 'Розпал літа', { translations: { en: 'Midsummer', he: 'אמצע הקיץ' } })],
    translations: {
      en: { question: 'Which season comes after winter?', explain: 'Winter always gives way to spring.' },
      he: { question: 'איזו עונה מגיעה אחרי החורף?', explain: 'אחרי החורף תמיד מגיע האביב.' },
    },
  },
  {
    levelSlug: 'typography', order: 12, kind: 'boss', question: 'Скільки місяців у році?',
    explain: 'Рік складається з дванадцяти місяців.',
    options: [p('twelve', 'Дванадцять', { correct: true, translations: { en: 'Twelve', he: 'שנים עשר' } }), p('ten', 'Десять', { translations: { en: 'Ten', he: 'עשרה' } }), p('seven', 'Сім', { translations: { en: 'Seven', he: 'שבעה' } }), p('twentyfour', 'Двадцять чотири', { translations: { en: 'Twenty-four', he: 'עשרים וארבעה' } }), p('six', 'Шість', { translations: { en: 'Six', he: 'שישה' } }), p('thirteen', 'Тринадцять', { translations: { en: 'Thirteen', he: 'שלושה עשר' } })],
    translations: {
      en: { question: 'How many months are in a year?', explain: 'A year is made of twelve months.' },
      he: { question: 'כמה חודשים יש בשנה?', explain: 'השנה מורכבת משנים עשר חודשים.' },
    },
  },

  {
    levelSlug: 'imagery', order: 1, kind: 'quiz', effectKey: 'imageStyle', question: 'Який стиль зображень використати на сайті?',
    options: Object.entries(IMAGE_STYLES).map(([id, v]) => p(id, v.name, { effect: v, translations: id === 'photo' ? TL.photoStyle : TL[id] })),
    translations: {
      en: { question: 'Which image style should the site use?' },
      he: { question: 'באיזה סגנון תמונות להשתמש באתר?' },
    },
  },
  {
    levelSlug: 'imagery', order: 2, kind: 'logic', question: 'Хто з них уміє літати?',
    explain: 'З цих істот небо підкоряється лише птаху.',
    options: [p('bird', 'Птах', { correct: true, translations: { en: 'A bird', he: 'ציפור' } }), p('fish', 'Риба', { translations: { en: 'A fish', he: 'דג' } }), p('cat', 'Кіт', { translations: { en: 'A cat', he: 'חתול' } }), p('turtle', 'Черепаха', { translations: { en: 'A turtle', he: 'צב' } }), p('dog', 'Пес', { translations: { en: 'A dog', he: 'כלב' } }), p('snail', 'Равлик', { translations: { en: 'A snail', he: 'חילזון' } })],
    translations: {
      en: { question: 'Which of these can fly?', explain: 'Of these creatures, only the bird owns the sky.' },
      he: { question: 'מי מאלה יודע לעוף?', explain: 'מבין היצורים האלה, רק הציפור שולטת בשמיים.' },
    },
  },
  {
    levelSlug: 'imagery', order: 3, kind: 'quiz', effectKey: 'radius', question: 'Обери стиль елементів — форму кнопок і карток.',
    options: Object.entries(RADII).map(([id, v]) => p(id, v.name, { effect: v, translations: TL[id] })),
    translations: {
      en: { question: 'Choose your element style — the shape of buttons and cards.' },
      he: { question: 'בחר את סגנון האלמנטים — צורת הכפתורים והכרטיסים.' },
    },
  },
  {
    levelSlug: 'imagery', order: 10, kind: 'boss', question: 'Скільки ніг у павука?',
    explain: 'Павук — не комаха: у нього вісім ніг.',
    options: [p('eight', 'Вісім', { correct: true, translations: { en: 'Eight', he: 'שמונה' } }), p('six', 'Шість', { translations: { en: 'Six', he: 'שש' } }), p('four', 'Чотири', { translations: { en: 'Four', he: 'ארבע' } }), p('ten', 'Десять', { translations: { en: 'Ten', he: 'עשר' } }), p('twelve', 'Дванадцять', { translations: { en: 'Twelve', he: 'שתים עשרה' } }), p('two', 'Дві', { translations: { en: 'Two', he: 'שתיים' } })],
    translations: {
      en: { question: 'How many legs does a spider have?', explain: 'A spider is no insect — it has eight legs.' },
      he: { question: 'כמה רגליים יש לעכביש?', explain: 'עכביש אינו חרק — יש לו שמונה רגליים.' },
    },
  },
  {
    levelSlug: 'imagery', order: 11, kind: 'boss', question: 'Яка тварина каже «мяу»?',
    explain: '«Мяу» — голос кота.',
    options: [p('cat', 'Кіт', { correct: true, translations: { en: 'A cat', he: 'חתול' } }), p('dog', 'Пес', { translations: { en: 'A dog', he: 'כלב' } }), p('cow', 'Корова', { translations: { en: 'A cow', he: 'פרה' } }), p('duck', 'Качка', { translations: { en: 'A duck', he: 'ברווז' } }), p('frog', 'Жаба', { translations: { en: 'A frog', he: 'צפרדע' } }), p('sheep', 'Вівця', { translations: { en: 'A sheep', he: 'כבשה' } })],
    translations: {
      en: { question: 'Which animal says "meow"?', explain: '"Meow" is the cat\'s call.' },
      he: { question: 'איזו חיה אומרת "מיאו"?', explain: '"מיאו" הוא קולו של החתול.' },
    },
  },
  {
    levelSlug: 'imagery', order: 12, kind: 'boss', question: 'Що світить на небі вночі?',
    explain: 'Уночі небо освітлює місяць.',
    options: [p('moon', 'Місяць', { correct: true, translations: { en: 'The moon', he: 'הירח' } }), p('sun', 'Сонце', { translations: { en: 'The sun', he: 'השמש' } }), p('grass', 'Трава', { translations: { en: 'Grass', he: 'דשא' } }), p('book', 'Книга', { translations: { en: 'A book', he: 'ספר' } }), p('lamp', 'Настільна лампа', { translations: { en: 'A desk lamp', he: 'מנורת שולחן' } }), p('stone', 'Камінь', { translations: { en: 'A stone', he: 'אבן' } })],
    translations: {
      en: { question: 'What shines in the sky at night?', explain: 'At night it\'s the moon that lights the sky.' },
      he: { question: 'מה מאיר בשמיים בלילה?', explain: 'בלילה הירח הוא שמאיר את השמיים.' },
    },
  },

  {
    levelSlug: 'services', order: 1, kind: 'quiz', effectKey: 'servicesCount', question: 'Скільки послуг показати на головній сторінці?',
    options: [p('three', 'Три головні', { effect: { count: 3, name: 'Три головні' }, translations: { en: 'Top three', he: 'שלושה עיקריים' } }), p('four', 'Всі чотири', { effect: { count: 4, name: 'Всі чотири' }, translations: { en: 'All four', he: 'כל הארבעה' } }), p('vixik', 'Нехай Wixsus обере', { effect: { count: 4, name: 'На смак Wixsusа' }, translations: { en: 'Let Wixsus decide', he: 'תן ל-Wixsus לבחור' } })],
    translations: {
      en: { question: 'How many services should we show on the home page?' },
      he: { question: 'כמה שירותים להציג בדף הבית?' },
    },
  },
  {
    levelSlug: 'services', order: 2, kind: 'logic', question: 'Куди йдуть, щоб підстригтися?',
    explain: 'По стрижку йдуть до перукарні.',
    options: [p('salon', 'До перукарні', { correct: true, translations: { en: 'To a hair salon', he: 'למספרה' } }), p('pharmacy', 'До аптеки', { translations: { en: 'To a pharmacy', he: 'לבית מרקחת' } }), p('bank', 'До банку', { translations: { en: 'To a bank', he: 'לבנק' } }), p('school', 'До школи', { translations: { en: 'To a school', he: 'לבית ספר' } }), p('library', 'До бібліотеки', { translations: { en: 'To a library', he: 'לספרייה' } }), p('bakery', 'До пекарні', { translations: { en: 'To a bakery', he: 'למאפייה' } })],
    translations: {
      en: { question: 'Where do you go to get a haircut?', explain: 'For a haircut, you go to a hair salon.' },
      he: { question: 'לאן הולכים כדי להסתפר?', explain: 'לתספורת הולכים למספרה.' },
    },
  },
  {
    levelSlug: 'services', order: 3, kind: 'quiz', effectKey: 'cta', question: 'Яка головна дія для відвідувачів сайту? Обери кнопку заклику.',
    options: Object.entries(CTAS).map(([id, v]) => p(id, v.name, { effect: v, translations: TL[id] })),
    translations: {
      en: { question: 'What is the main action for your site\'s visitors? Choose a call-to-action button.' },
      he: { question: 'מהי הפעולה העיקרית למבקרי האתר? בחר כפתור קריאה לפעולה.' },
    },
  },
  {
    levelSlug: 'services', order: 10, kind: 'boss', question: 'Скільки годин у добі?',
    explain: 'Доба триває двадцять чотири години.',
    options: [p('tf', 'Двадцять чотири', { correct: true, translations: { en: 'Twenty-four', he: 'עשרים וארבע' } }), p('twelve', 'Дванадцять', { translations: { en: 'Twelve', he: 'שתים עשרה' } }), p('ten', 'Десять', { translations: { en: 'Ten', he: 'עשר' } }), p('sixty', 'Шістдесят', { translations: { en: 'Sixty', he: 'שישים' } }), p('thirty', 'Тридцять', { translations: { en: 'Thirty', he: 'שלושים' } }), p('eight', 'Вісім', { translations: { en: 'Eight', he: 'שמונה' } })],
    translations: {
      en: { question: 'How many hours are in a day?', explain: 'A day runs twenty-four hours.' },
      he: { question: 'כמה שעות יש ביממה?', explain: 'היממה נמשכת עשרים וארבע שעות.' },
    },
  },
  {
    levelSlug: 'services', order: 11, kind: 'boss', question: 'Що робить лікар?',
    explain: 'Робота лікаря — лікувати людей.',
    options: [p('heal', 'Лікує людей', { correct: true, translations: { en: 'Heals people', he: 'מרפא אנשים' } }), p('bake', 'Пече торти', { translations: { en: 'Bakes cakes', he: 'אופה עוגות' } }), p('build', 'Будує будинки', { translations: { en: 'Builds houses', he: 'בונה בתים' } }), p('fly', 'Водить літак', { translations: { en: 'Flies planes', he: 'מטיס מטוסים' } }), p('teach', 'Вчить дітей', { translations: { en: 'Teaches children', he: 'מלמד ילדים' } }), p('drive', 'Водить таксі', { translations: { en: 'Drives a taxi', he: 'נוהג במונית' } })],
    translations: {
      en: { question: 'What does a doctor do?', explain: 'A doctor\'s work is to heal people.' },
      he: { question: 'מה עושה רופא?', explain: 'עבודתו של רופא היא לרפא אנשים.' },
    },
  },
  {
    levelSlug: 'services', order: 12, kind: 'boss', question: 'Скільки хвилин у одній годині?',
    explain: 'Година ділиться на шістдесят хвилин.',
    options: [p('sixty', 'Шістдесят', { correct: true, translations: { en: 'Sixty', he: 'שישים' } }), p('hundred', 'Сто', { translations: { en: 'One hundred', he: 'מאה' } }), p('thirty', 'Тридцять', { translations: { en: 'Thirty', he: 'שלושים' } }), p('tf', 'Двадцять чотири', { translations: { en: 'Twenty-four', he: 'עשרים וארבע' } }), p('ninety', 'Девʼяносто', { translations: { en: 'Ninety', he: 'תשעים' } }), p('twelve', 'Дванадцять', { translations: { en: 'Twelve', he: 'שתים עשרה' } })],
    translations: {
      en: { question: 'How many minutes are in one hour?', explain: 'An hour divides into sixty minutes.' },
      he: { question: 'כמה דקות יש בשעה אחת?', explain: 'השעה מתחלקת לשישים דקות.' },
    },
  },
  {
    levelSlug: 'services', order: 13, kind: 'boss', question: 'І останнє. Хто головний герой цієї гри?',
    explain: 'Wixsus. Жовтий, у формі X, нездоланний.',
    options: [p('vixik', 'Wixsus!', { correct: true, translations: { en: 'Wixsus!', he: 'Wixsus!' } }), p('boss', 'Моноліт, Сірий Шаблон', { translations: { en: 'Monolith, the Gray Template', he: 'מונולית, התבנית האפורה' } }), p('cursor', 'Курсор', { translations: { en: 'The Cursor', he: 'הסמן' } }), p('penguin', 'Пінгвін', { translations: { en: 'A Penguin', he: 'פינגווין' } }), p('dragon', 'Дракон', { translations: { en: 'A dragon', he: 'דרקון' } }), p('robot', 'Робот', { translations: { en: 'A robot', he: 'רובוט' } })],
    translations: {
      en: { question: 'And finally. Who is the main hero of this game?', explain: 'Wixsus. Yellow, X-shaped, unbeaten.' },
      he: { question: 'ולבסוף. מי הגיבור הראשי של המשחק הזה?', explain: 'Wixsus. צהוב, בצורת X, בלתי מנוצח.' },
    },
  },

  {
    levelSlug: 'features', order: 1, kind: 'quiz', effectKey: 'wixApps', question: 'Які функції додати на сайт?',
    options: [
      p('shop-set', '🛒 Магазин + Форми + Тарифи', { effect: { apps: ['stores', 'forms', 'pricing'] }, translations: { en: '🛒 Store + Forms + Pricing', he: '🛒 חנות + טפסים + תוכניות מחיר' } }),
      p('booking-set', '📅 Записи + Учасники + Форми', { effect: { apps: ['bookings', 'members', 'forms'] }, translations: { en: '📅 Bookings + Members + Forms', he: '📅 הזמנות + חברים + טפסים' } }),
      p('content-set', '📝 Блог + Учасники + Заходи', { effect: { apps: ['blog', 'members', 'events'] }, translations: { en: '📝 Blog + Members + Events', he: '📝 בלוג + חברים + אירועים' } }),
      p('resto-set', '🍽️ Ресторан + Заходи + Тарифи', { effect: { apps: ['restaurants', 'events', 'pricing'] }, translations: { en: '🍽️ Restaurants + Events + Pricing', he: '🍽️ מסעדות + אירועים + תוכניות מחיר' } }),
    ],
    translations: {
      en: { question: 'Which features should we add to your site?' },
      he: { question: 'אילו פיצ\'רים להוסיף לאתר?' },
    },
  },
  {
    levelSlug: 'features', order: 2, kind: 'logic', question: 'Скільки пальців на одній руці?',
    explain: 'На одній руці — пʼять пальців.',
    options: [p('five', 'Пʼять', { correct: true, translations: { en: 'Five', he: 'חמש' } }), p('four', 'Чотири', { translations: { en: 'Four', he: 'ארבע' } }), p('six', 'Шість', { translations: { en: 'Six', he: 'שש' } }), p('ten', 'Десять', { translations: { en: 'Ten', he: 'עשר' } }), p('three', 'Три', { translations: { en: 'Three', he: 'שלוש' } }), p('eight', 'Вісім', { translations: { en: 'Eight', he: 'שמונה' } })],
    translations: {
      en: { question: 'How many fingers are on one hand?', explain: 'One hand has five fingers.' },
      he: { question: 'כמה אצבעות יש ביד אחת?', explain: 'בכף יד אחת יש חמש אצבעות.' },
    },
  },
  {
    levelSlug: 'features', order: 3, kind: 'quiz', effectKey: 'channel', question: 'Як відвідувачі знаходитимуть твій сайт?',
    options: [
      p('seo', '🔍 Через пошуковики (SEO)', { effect: { channel: 'seo', name: 'SEO' }, translations: { en: '🔍 Search engines (SEO)', he: '🔍 מנועי חיפוש' } }),
      p('social', '📱 Через соціальні мережі', { effect: { channel: 'social', name: 'Соцмережі' }, translations: { en: '📱 Social media', he: '📱 רשתות חברתיות' } }),
      p('ads', '💸 Через платну рекламу', { effect: { channel: 'ads', name: 'Реклама' }, translations: { en: '💸 Paid ads', he: '💸 פרסום ממומן' } }),
      p('word', '🗣️ Сарафанне радіо', { effect: { channel: 'word', name: 'Сарафан' }, translations: { en: '🗣️ Word of mouth', he: '🗣️ מפה לאוזן' } }),
    ],
    translations: {
      en: { question: 'How will visitors find your site?' },
      he: { question: 'איך מבקרים ימצאו את האתר שלך?' },
    },
  },
  {
    levelSlug: 'features', order: 10, kind: 'boss', question: 'Що потрібно, щоб виросла квітка?',
    explain: 'Щоб рости, квітці потрібні вода й сонячне світло.',
    options: [p('watersun', 'Вода і сонце', { correct: true, translations: { en: 'Water and sun', he: 'מים ושמש' } }), p('snowdark', 'Сніг і темрява', { translations: { en: 'Snow and darkness', he: 'שלג וחושך' } }), p('stones', 'Каміння', { translations: { en: 'Stones', he: 'אבנים' } }), p('music', 'Гучна музика', { translations: { en: 'Loud music', he: 'מוזיקה רועשת' } }), p('candysoda', 'Цукерки й газованка', { translations: { en: 'Candy and soda', he: 'ממתקים וסודה' } }), p('coldwind', 'Крига й холодний вітер', { translations: { en: 'Ice and cold wind', he: 'קרח ורוח קרה' } })],
    translations: {
      en: { question: 'What does a flower need to grow?', explain: 'To grow, a flower needs water and sunlight.' },
      he: { question: 'מה צריך כדי שפרח יגדל?', explain: 'כדי לגדול, פרח זקוק למים ולאור שמש.' },
    },
  },
  {
    levelSlug: 'features', order: 11, kind: 'boss', question: 'На якій планеті ми живемо?',
    explain: 'Наш дім — планета Земля.',
    options: [p('earth', 'Земля', { correct: true, translations: { en: 'Earth', he: 'כדור הארץ' } }), p('mars', 'Марс', { translations: { en: 'Mars', he: 'מאדים' } }), p('moon', 'Місяць', { translations: { en: 'The Moon', he: 'הירח' } }), p('sun', 'Сонце', { translations: { en: 'The Sun', he: 'השמש' } }), p('jupiter', 'Юпітер', { translations: { en: 'Jupiter', he: 'צדק' } }), p('venus', 'Венера', { translations: { en: 'Venus', he: 'נוגה' } })],
    translations: {
      en: { question: 'Which planet do we live on?', explain: 'Our home is the planet Earth.' },
      he: { question: 'על איזה כוכב לכת אנחנו חיים?', explain: 'ביתנו הוא כדור הארץ.' },
    },
  },
  {
    levelSlug: 'features', order: 12, kind: 'boss', question: 'Скільки буде 2 + 2?',
    explain: '2 + 2 = 4. Це знає навіть Обсолекс.',
    options: [p('four', 'Чотири', { correct: true, translations: { en: 'Four', he: 'ארבע' } }), p('five', 'Пʼять', { translations: { en: 'Five', he: 'חמש' } }), p('three', 'Три', { translations: { en: 'Three', he: 'שלוש' } }), p('twentytwo', 'Двадцять два', { translations: { en: 'Twenty-two', he: 'עשרים ושתיים' } }), p('two', 'Два', { translations: { en: 'Two', he: 'שתיים' } }), p('eight', 'Вісім', { translations: { en: 'Eight', he: 'שמונה' } })],
    translations: {
      en: { question: 'What is 2 + 2?', explain: '2 + 2 = 4. Even Obsolex knows that.' },
      he: { question: 'כמה זה 2 + 2?', explain: '2 + 2 = 4. אפילו אובסולקס יודע את זה.' },
    },
  },
];
