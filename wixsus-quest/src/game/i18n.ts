export type Lang = 'uk' | 'en' | 'he';
export const RTL_LANGS: Lang[] = ['he'];

interface Strings {
  startBtn: string;
  startSpeech: string;
  levelBadge: string;
  forward: string;
  bossLabel: string;
  toFight: string;
  attackBadge: string;
  nextAttack: string;
  finishBoss: string;
  nextQuestion: string;
  logicChip: string;
  quizChip: string;
  questionOf: string;
  correctFeedback: string;
  wrongFeedback: string;
  goodChoice: string;
  nextLevel: string;
  toFinale: string;
  bossDefeated: string;
  playAgain: string;
  partsProgress: string;
  scorePoints: string;
  scoreRight: string;
  scoreParts: string;
  critHit: string;
  blocked: string;
  paletteLabel: string;
  fontLabel: string;
  businessLabel: string;
  voiceLabel: string;
  imagesLabel: string;
  shapeLabel: string;
  servicesLabel: string;
  wixAppsLabel: string;
  savePlaceholder: string;
  saveBtn: string;
  savingBtn: string;
  savedOk: string;
  openSite: string;
  sitePreviewHead: string;
  styleNotChosen: string;
  cmsLive: string;
  cmsFallback: string;
  resetTitle: string;
  partNames: Record<string, string>;
  wixAppNames: Record<string, string>;
  langLabel: string;
  wixIntegrations: string;
  customPlaceholder: string;
  customConfirm: string;
}

export const UI: Record<Lang, Strings> = {
  uk: {
    startBtn: '▶ Почати гру',
    startSpeech: 'Я Wixsus, провідник цих земель. Твій сайт поки — сіра пустка. Пʼять рівнів, пʼять босів стоять на шляху. Кожна відповідь — удар різцем; із них я викую світ, що належить лише тобі.',
    levelBadge: 'Рівень {n} з {total}',
    forward: 'Вперед! →',
    bossLabel: 'Бос рівня',
    toFight: '⚔️ До бою!',
    attackBadge: '⚔️ Атака {n} / {total}',
    nextAttack: 'Наступна атака →',
    finishBoss: 'Добити боса! 🏆',
    nextQuestion: 'Далі →',
    logicChip: '🧩 Задачка на логіку',
    quizChip: '🎨 Твій вибір стилю',
    questionOf: 'Питання {n} / {total}',
    correctFeedback: 'Точний удар. +10 очок',
    wrongFeedback: 'Мимо. Ось істина:',
    goodChoice: 'Гідний вибір. Викарбувано в твоєму стилі.',
    nextLevel: 'Наступний рівень →',
    toFinale: 'До фіналу! 🏆',
    bossDefeated: '{bossName} повержений. Нова частина світу постає — «{partName}». Поглянь праворуч.',
    playAgain: 'Зіграти ще раз ↺',
    partsProgress: '{n}/{total} частин сайту',
    scorePoints: 'очок',
    scoreRight: 'правильних',
    scoreParts: 'частин сайту',
    critHit: 'КРИТИЧНИЙ УДАР! Бос відсахнувся. +15 очок',
    blocked: 'Бос відбив удар. Але його час спливає:',
    paletteLabel: 'Палітра',
    fontLabel: 'Шрифт',
    businessLabel: 'Справа',
    voiceLabel: 'Голос',
    imagesLabel: 'Картинки',
    shapeLabel: 'Форма',
    servicesLabel: 'Послуги',
    wixAppsLabel: 'Wix-сервіси',
    savePlaceholder: 'Назва твого сайту',
    saveBtn: '🚀 Опублікувати сайт',
    savingBtn: 'Публікую…',
    savedOk: '✅ Сайт опубліковано на Wix!',
    openSite: '🔗 Відкрити мій сайт',
    sitePreviewHead: '🔨 Твій сайт наживо',
    styleNotChosen: 'стиль ще не обрано',
    cmsLive: '● Рівні завантажено наживо з Wix CMS',
    cmsFallback: '○ Рівні з локальної копії (CMS недоступна)',
    resetTitle: 'Почати заново',
    partNames: {
      hero: 'Головний банер',
      about: 'Розділ «Про нас»',
      gallery: 'Галерея робіт',
      services: 'Послуги + контакти',
      features: 'Можливості сайту',
    },
    wixAppNames: {
      stores: 'Магазин',
      bookings: 'Записи',
      events: 'Заходи',
      blog: 'Блог',
      members: 'Учасники',
      forms: 'Форми',
      restaurants: 'Ресторан',
      pricing: 'Тарифи',
    },
    langLabel: 'Мова',
    wixIntegrations: 'Інтеграції Wix',
    customPlaceholder: 'Своя відповідь…',
    customConfirm: 'Підтвердити',
  },
  en: {
    startBtn: '▶ Start Game',
    startSpeech: 'I am Wixsus, guide of these lands. Right now your site is a gray wasteland. Five levels, five bosses stand in the way. Every answer is a strike of the chisel — from them I\'ll forge a world that belongs to you alone.',
    levelBadge: 'Level {n} of {total}',
    forward: 'Let\'s go! →',
    bossLabel: 'Level Boss',
    toFight: '⚔️ Fight!',
    attackBadge: '⚔️ Attack {n} / {total}',
    nextAttack: 'Next attack →',
    finishBoss: 'Finish the boss! 🏆',
    nextQuestion: 'Next →',
    logicChip: '🧩 Logic Puzzle',
    quizChip: '🎨 Your Style Choice',
    questionOf: 'Question {n} / {total}',
    correctFeedback: 'A clean strike. +10 points',
    wrongFeedback: 'Wide of the mark. Here\'s the truth:',
    goodChoice: 'A worthy choice. Carved into your style.',
    nextLevel: 'Next Level →',
    toFinale: 'To the Finale! 🏆',
    bossDefeated: '{bossName} has fallen. A new piece of your world rises — "{partName}". Look to the right.',
    playAgain: 'Play Again ↺',
    partsProgress: '{n}/{total} site parts',
    scorePoints: 'points',
    scoreRight: 'correct',
    scoreParts: 'site parts',
    critHit: 'CRITICAL HIT! The boss reels back. +15 points',
    blocked: 'The boss parries. But its time is running out:',
    paletteLabel: 'Palette',
    fontLabel: 'Font',
    businessLabel: 'Business',
    voiceLabel: 'Voice',
    imagesLabel: 'Images',
    shapeLabel: 'Shape',
    servicesLabel: 'Services',
    wixAppsLabel: 'Wix Services',
    savePlaceholder: 'Your site name',
    saveBtn: '🚀 Publish site',
    savingBtn: 'Publishing…',
    savedOk: '✅ Site published on Wix!',
    openSite: '🔗 Open My Site',
    sitePreviewHead: '🔨 Your Site Live',
    styleNotChosen: 'style not chosen yet',
    cmsLive: '● Levels loaded live from Wix CMS',
    cmsFallback: '○ Levels from local copy (CMS unavailable)',
    resetTitle: 'Start Over',
    partNames: {
      hero: 'Hero Banner',
      about: 'About Section',
      gallery: 'Gallery',
      services: 'Services',
      features: 'Site Features',
    },
    wixAppNames: {
      stores: 'Stores',
      bookings: 'Bookings',
      events: 'Events',
      blog: 'Blog',
      members: 'Members',
      forms: 'Forms',
      restaurants: 'Restaurants',
      pricing: 'Pricing Plans',
    },
    langLabel: 'Language',
    wixIntegrations: 'Wix Integrations',
    customPlaceholder: 'My own answer…',
    customConfirm: 'Confirm',
  },
  he: {
    startBtn: '▶ התחל משחק',
    startSpeech: 'אני Wixsus, מדריך הארצות האלה. כרגע האתר שלך הוא שממה אפורה. חמישה שלבים, חמישה בוסים ניצבים בדרך. כל תשובה היא מכת אזמל — מהן אחשל עולם ששייך לך בלבד.',
    levelBadge: 'שלב {n} מתוך {total}',
    forward: 'קדימה! →',
    bossLabel: 'בוס השלב',
    toFight: '⚔️ לקרב!',
    attackBadge: '⚔️ התקפה {n} / {total}',
    nextAttack: 'התקפה הבאה →',
    finishBoss: 'סיים את הבוס! 🏆',
    nextQuestion: 'הבא →',
    logicChip: '🧩 חידת לוגיקה',
    quizChip: '🎨 בחירת הסגנון שלך',
    questionOf: 'שאלה {n} / {total}',
    correctFeedback: 'מכה מדויקת. +10 נקודות',
    wrongFeedback: 'פספסת. הנה האמת:',
    goodChoice: 'בחירה ראויה. נחרתה בסגנון שלך.',
    nextLevel: 'שלב הבא →',
    toFinale: 'לסיום! 🏆',
    bossDefeated: '{bossName} נפל. חלק חדש בעולמך קם — "{partName}". הבט ימינה.',
    playAgain: 'שחק שוב ↺',
    partsProgress: '{n}/{total} חלקי אתר',
    scorePoints: 'נקודות',
    scoreRight: 'נכון',
    scoreParts: 'חלקי אתר',
    critHit: 'מכה קריטית! הבוס נרתע. +15 נקודות',
    blocked: 'הבוס הודף את המכה. אך זמנו אוזל:',
    paletteLabel: 'פלטה',
    fontLabel: 'גופן',
    businessLabel: 'עסק',
    voiceLabel: 'טון',
    imagesLabel: 'תמונות',
    shapeLabel: 'צורה',
    servicesLabel: 'שירותים',
    wixAppsLabel: 'שירותי Wix',
    savePlaceholder: 'שם האתר שלך',
    saveBtn: '🚀 פרסם אתר',
    savingBtn: 'מפרסם…',
    savedOk: '✅ האתר פורסם ב-Wix!',
    openSite: '🔗 פתח את האתר שלי',
    sitePreviewHead: '🔨 האתר שלך בשידור חי',
    styleNotChosen: 'הסגנון עוד לא נבחר',
    cmsLive: '● שלבים נטענו חי מ-Wix CMS',
    cmsFallback: '○ שלבים מעותק מקומי (CMS לא זמין)',
    resetTitle: 'התחל מחדש',
    partNames: {
      hero: 'כרזת הגיבור',
      about: 'אודות',
      gallery: 'גלריה',
      services: 'שירותים',
      features: 'תכונות האתר',
    },
    wixAppNames: {
      stores: 'חנות',
      bookings: 'הזמנות',
      events: 'אירועים',
      blog: 'בלוג',
      members: 'חברים',
      forms: 'טפסים',
      restaurants: 'מסעדות',
      pricing: 'תוכניות מחיר',
    },
    langLabel: 'שפה',
    wixIntegrations: 'אינטגרציות Wix',
    customPlaceholder: 'תשובה משלי…',
    customConfirm: 'אישור',
  },
};

export function t(lang: Lang, key: keyof Omit<Strings, 'partNames' | 'wixAppNames'>, vars?: Record<string, string | number>): string {
  let s = (UI[lang] as any)[key] as string;
  if (!s) return key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}
