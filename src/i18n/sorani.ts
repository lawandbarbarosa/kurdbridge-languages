// Kurdish (Sorani) UI strings. RTL, Arabic script.
const s = {
  // Common
  app_name: "زمانگە",
  tagline: "فێربوونی زمان بۆ کوردەکان",
  loading: "چاوەڕوانبە...",
  save: "پاشەکەوت",
  cancel: "پاشگەزبوونەوە",
  continue: "بەردەوامبە",
  start: "دەستپێبکە",
  next: "دواتر",
  back: "گەڕانەوە",
  submit: "بنێرە",
  finish: "کۆتایی",
  retry: "دووبارە هەوڵبدە",
  correct: "ڕاستە!",
  incorrect: "هەڵەیە",
  locked: "داخراوە",
  unlocked: "کراوەیە",
  completed: "تەواو",

  // Auth
  sign_in: "چوونەژوورەوە",
  sign_up: "خۆتۆمارکردن",
  sign_out: "چوونەدەرەوە",
  email: "ئیمەیل",
  password: "وشەی نهێنی",
  display_name: "ناوی نیشاندان",
  continue_with_google: "بەردەوامبە بە گووگڵ",
  or: "یان",
  no_account: "هەژمارت نییە؟",
  have_account: "هەژمارت هەیە؟",
  auth_welcome: "بەخێربێیت بۆ زمانگە",
  auth_welcome_sub: "زمان فێربە، بە کوردی",

  // Onboarding
  choose_language: "کام زمان دەتەوێت فێربیت؟",
  choose_language_sub: "لە هەر کاتێکدا دەتوانیت زیاتر زیاد بکەیت",
  take_placement: "تاقیکردنەوەی ئاست",
  skip_placement: "دەستپێبکە لە A1",

  // Dashboard
  dashboard: "سەرەکی",
  welcome_back: "بەخێرگەڕایتەوە",
  current_level: "ئاستی ئێستا",
  streak: "زنجیرەی ڕۆژانە",
  days: "ڕۆژ",
  continue_learning: "بەردەوامبە لە فێربوون",
  continue_lesson: "بەردەوامبە لە وانە",
  daily_goal: "ئامانجی ڕۆژانە",
  minutes: "خولەک",
  vocabulary: "وشەسازی",
  videos: "ڤیدیۆکان",
  lessons: "وانەکان",
  progress: "پێشکەوتن",
  words_learned: "وشەی فێربوو",
  lessons_completed: "وانەی تەواوکراو",
  due_for_review: "کاتی پێداچوونەوە",
  no_due: "هیچ شتێک نییە بۆ پێداچوونەوە",

  // Lesson / tree
  lesson_tree: "دارە وانەکان",
  level: "ئاست",
  lesson: "وانە",
  grammar: "ڕێزمان",
  dialogue: "دیالۆگ",
  exercises: "ڕاهێنانەکان",
  quiz: "تاقیکردنەوە",
  pass_threshold: "پێویستە ٧٠٪ بەدەست بهێنیت بۆ کردنەوەی وانەی داهاتوو",
  lesson_passed: "پیرۆزە! وانەت تەواوکرد",
  lesson_failed: "دیسان هەوڵبدە",
  your_score: "نمرەکەت",

  // Vocabulary
  flashcards: "کارتەکان",
  show_answer: "وەڵام پیشانبدە",
  i_knew_it: "دەمزانی",
  didnt_know: "نەمزانی",
  play_audio: "گوێبگرە",
  example: "نموونە",
  no_words: "هێشتا هیچ وشەیەک نییە",

  // Video
  video_practice: "ڕاهێنانی ڤیدیۆ",
  show_translation: "وەرگێڕان پیشانبدە",
  hide_translation: "وەرگێڕان شاردنەوە",
  transcript: "دەق",

  // Placement
  placement_title: "با ئاستەکەت بزانین",
  placement_sub: "چەند پرسیارێک، پاشان دەزانین لە کوێوە دەستپێبکەیت",
  question: "پرسیار",
  of: "لە",
  placement_result: "ئەنجامی تاقیکردنەوە",
  placement_assigned: "ئاستەکەت:",
  go_to_dashboard: "بڕۆ بۆ سەرەکی",

  // Settings
  settings: "ڕێکخستنەکان",
  language_dialect: "زاراوەی کوردی",
  sorani: "سۆرانی",
  badini: "بادینی",
  english: "English",
  target_language: "زمانی ئامانج",

  // Marketing / landing
  hero_title: "فێربوونی زمان، لە ڕوانگەیەکی کوردی",
  hero_sub: "ئینگلیزی، ئەڵمانی، عەرەبی، یان کۆری فێربە بە ڕێبەرێکی تەواو بە زمانی دایک",
  hero_cta: "بەخۆڕایی دەستپێبکە",
  feature_placement_title: "تاقیکردنەوەی ئاست",
  feature_placement_desc: "لە ئاستی گونجاو دەستپێبکە، نەک لە سفرەوە",
  feature_tree_title: "دارە وانەکان",
  feature_tree_desc: "لە A1 بۆ C2، بە ڕێگایەکی ڕوون",
  feature_video_title: "ڕاهێنانی ڤیدیۆ",
  feature_video_desc: "ڤیدیۆی ڕاستەقینە لەگەڵ وەرگێڕانی کوردی",
} as const;

export type TranslationKey = keyof typeof s;
export const sorani: Record<TranslationKey, string> = s;

