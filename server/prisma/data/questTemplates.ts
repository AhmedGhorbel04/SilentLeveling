import type { Category, Difficulty, SkillLevel } from '../../src/game/config.js';

// The quest library the engine picks from (SRS §3.6).
// To add a quest, add a line here and run `npm run db:seed -w server`.
// Keys must never change: the seed uses them to update existing rows.

export type TemplateType = 'DAILY' | 'WEEKLY' | 'PENALTY' | 'ONBOARDING';

export type QuestTemplateDefinition = {
  key: string;
  type: TemplateType;
  category: Category;
  level: SkillLevel;
  minutes: number;
  difficulty: Difficulty;
  title: { en: string; fr: string; ar: string };
};

type Translations = [en: string, fr: string, ar: string];

function quest(
  type: TemplateType,
  key: string,
  category: Category,
  level: SkillLevel,
  minutes: number,
  difficulty: Difficulty,
  [en, fr, ar]: Translations,
): QuestTemplateDefinition {
  return { key, type, category, level, minutes, difficulty, title: { en, fr, ar } };
}

function daily(
  key: string,
  category: Category,
  level: SkillLevel,
  minutes: number,
  difficulty: Difficulty,
  title: Translations,
) {
  return quest('DAILY', key, category, level, minutes, difficulty, title);
}

function weekly(
  key: string,
  category: Category,
  level: SkillLevel,
  minutes: number,
  difficulty: Difficulty,
  title: Translations,
) {
  return quest('WEEKLY', key, category, level, minutes, difficulty, title);
}

export const QUEST_TEMPLATES: readonly QuestTemplateDefinition[] = [
  // ---------------- Fitness ----------------
  daily('fitness.beginner.1', 'FITNESS', 'BEGINNER', 30, 'EASY', [
    'Brisk walk for 30 minutes',
    'Marche rapide pendant 30 minutes',
    'امشِ بخطى سريعة لمدة 30 دقيقة',
  ]),
  daily('fitness.beginner.2', 'FITNESS', 'BEGINNER', 10, 'EASY', [
    'Do 3 sets of 10 squats',
    'Faire 3 séries de 10 squats',
    'قم بـ 3 مجموعات من 10 تمارين قرفصاء',
  ]),
  daily('fitness.beginner.3', 'FITNESS', 'BEGINNER', 15, 'NORMAL', [
    '15-minute bodyweight workout',
    'Séance de 15 minutes au poids du corps',
    'تمرين بوزن الجسم لمدة 15 دقيقة',
  ]),
  daily('fitness.intermediate.1', 'FITNESS', 'INTERMEDIATE', 25, 'NORMAL', [
    'Run 3 km',
    'Courir 3 km',
    'اركض 3 كيلومترات',
  ]),
  daily('fitness.intermediate.2', 'FITNESS', 'INTERMEDIATE', 30, 'HARD', [
    '30-minute full-body workout',
    'Séance complète de 30 minutes',
    'تمرين لكامل الجسم لمدة 30 دقيقة',
  ]),
  daily('fitness.intermediate.3', 'FITNESS', 'INTERMEDIATE', 10, 'NORMAL', [
    'Do 50 push-ups through the day',
    'Faire 50 pompes dans la journée',
    'قم بـ 50 تمرين ضغط خلال اليوم',
  ]),
  daily('fitness.advanced.1', 'FITNESS', 'ADVANCED', 50, 'HARD', [
    'Run 8 km',
    'Courir 8 km',
    'اركض 8 كيلومترات',
  ]),
  daily('fitness.advanced.2', 'FITNESS', 'ADVANCED', 45, 'HARD', [
    '45-minute strength training session',
    'Séance de musculation de 45 minutes',
    'حصة تمارين قوة لمدة 45 دقيقة',
  ]),
  daily('fitness.advanced.3', 'FITNESS', 'ADVANCED', 20, 'EXTREME', [
    '20 minutes of high-intensity interval training',
    "20 minutes d'entraînement fractionné intense",
    'تمرين متقطع عالي الشدة لمدة 20 دقيقة',
  ]),

  // ---------------- Studies / programming ----------------
  daily('studies.beginner.1', 'STUDIES', 'BEGINNER', 25, 'NORMAL', [
    'Study a new topic for 25 minutes (one Pomodoro)',
    'Étudier un nouveau sujet pendant 25 minutes (un Pomodoro)',
    'ادرس موضوعًا جديدًا لمدة 25 دقيقة (جلسة بومودورو)',
  ]),
  daily('studies.beginner.2', 'STUDIES', 'BEGINNER', 20, 'EASY', [
    'Solve 1 easy programming exercise',
    'Résoudre 1 exercice de programmation facile',
    'حلّ تمرين برمجة سهلًا واحدًا',
  ]),
  daily('studies.beginner.3', 'STUDIES', 'BEGINNER', 15, 'EASY', [
    'Review your notes from the last class',
    'Relire tes notes du dernier cours',
    'راجع ملاحظاتك من آخر درس',
  ]),
  daily('studies.intermediate.1', 'STUDIES', 'INTERMEDIATE', 45, 'HARD', [
    'Solve 2 algorithm problems',
    "Résoudre 2 problèmes d'algorithmique",
    'حلّ مسألتين خوارزميتين',
  ]),
  daily('studies.intermediate.2', 'STUDIES', 'INTERMEDIATE', 50, 'NORMAL', [
    'Two focused study sessions of 25 minutes',
    "Deux sessions d'étude concentrée de 25 minutes",
    'جلستا دراسة مركّزة مدة كل منهما 25 دقيقة',
  ]),
  daily('studies.intermediate.3', 'STUDIES', 'INTERMEDIATE', 25, 'NORMAL', [
    'Write a summary of a chapter or a lesson',
    "Rédiger le résumé d'un chapitre ou d'un cours",
    'اكتب ملخصًا لفصل أو درس',
  ]),
  daily('studies.advanced.1', 'STUDIES', 'ADVANCED', 60, 'EXTREME', [
    'Solve a hard algorithm problem',
    "Résoudre un problème d'algorithmique difficile",
    'حلّ مسألة خوارزمية صعبة',
  ]),
  daily('studies.advanced.2', 'STUDIES', 'ADVANCED', 90, 'HARD', [
    '90-minute deep-work study session',
    'Session de travail profond de 90 minutes',
    'جلسة عمل عميق لمدة 90 دقيقة',
  ]),
  daily('studies.advanced.3', 'STUDIES', 'ADVANCED', 25, 'HARD', [
    'Explain a complex concept in writing, as if teaching it',
    "Expliquer un concept complexe par écrit, comme pour l'enseigner",
    'اشرح مفهومًا معقّدًا كتابيًا كأنك تدرّسه',
  ]),

  // ---------------- Languages ----------------
  daily('languages.beginner.1', 'LANGUAGES', 'BEGINNER', 15, 'EASY', [
    'Learn 10 new words',
    'Apprendre 10 nouveaux mots',
    'تعلّم 10 كلمات جديدة',
  ]),
  daily('languages.beginner.2', 'LANGUAGES', 'BEGINNER', 10, 'EASY', [
    'Complete one lesson on a language-learning app',
    'Faire une leçon sur une application de langue',
    'أكمل درسًا واحدًا في تطبيق لتعلّم اللغات',
  ]),
  daily('languages.beginner.3', 'LANGUAGES', 'BEGINNER', 20, 'NORMAL', [
    'Listen to a podcast in your target language',
    'Écouter un podcast dans la langue cible',
    'استمع إلى بودكاست باللغة التي تتعلّمها',
  ]),
  daily('languages.intermediate.1', 'LANGUAGES', 'INTERMEDIATE', 20, 'NORMAL', [
    'Write a short paragraph in your target language',
    'Écrire un court paragraphe dans la langue cible',
    'اكتب فقرة قصيرة باللغة التي تتعلّمها',
  ]),
  daily('languages.intermediate.2', 'LANGUAGES', 'INTERMEDIATE', 30, 'NORMAL', [
    'Watch an episode without subtitles in your language',
    'Regarder un épisode sans sous-titres dans ta langue',
    'شاهد حلقة دون ترجمة إلى لغتك',
  ]),
  daily('languages.intermediate.3', 'LANGUAGES', 'INTERMEDIATE', 15, 'HARD', [
    'Practice speaking aloud for 15 minutes',
    "Pratiquer l'oral à voix haute pendant 15 minutes",
    'تدرّب على التحدث بصوت عالٍ لمدة 15 دقيقة',
  ]),
  daily('languages.advanced.1', 'LANGUAGES', 'ADVANCED', 20, 'HARD', [
    'Have a 20-minute conversation with a native speaker',
    'Avoir une conversation de 20 minutes avec un locuteur natif',
    'أجرِ محادثة لمدة 20 دقيقة مع متحدث أصلي',
  ]),
  daily('languages.advanced.2', 'LANGUAGES', 'ADVANCED', 30, 'HARD', [
    'Read a news article and summarize it aloud',
    "Lire un article de presse et le résumer à l'oral",
    'اقرأ مقالًا إخباريًا ولخّصه بصوت عالٍ',
  ]),
  daily('languages.advanced.3', 'LANGUAGES', 'ADVANCED', 45, 'EXTREME', [
    'Write a full page without a dictionary',
    'Écrire une page entière sans dictionnaire',
    'اكتب صفحة كاملة دون قاموس',
  ]),

  // ---------------- Reading ----------------
  daily('reading.beginner.1', 'READING', 'BEGINNER', 15, 'EASY', [
    'Read 10 pages',
    'Lire 10 pages',
    'اقرأ 10 صفحات',
  ]),
  daily('reading.beginner.2', 'READING', 'BEGINNER', 20, 'NORMAL', [
    'Read for 20 minutes without your phone',
    'Lire 20 minutes sans téléphone',
    'اقرأ لمدة 20 دقيقة دون هاتفك',
  ]),
  daily('reading.beginner.3', 'READING', 'BEGINNER', 5, 'EASY', [
    'Write down one idea from what you read',
    'Noter une idée tirée de ta lecture',
    'دوّن فكرة واحدة مما قرأته',
  ]),
  daily('reading.intermediate.1', 'READING', 'INTERMEDIATE', 40, 'NORMAL', [
    'Read 30 pages',
    'Lire 30 pages',
    'اقرأ 30 صفحة',
  ]),
  daily('reading.intermediate.2', 'READING', 'INTERMEDIATE', 25, 'NORMAL', [
    'Read a long-form article and note 3 key points',
    'Lire un article de fond et noter 3 points clés',
    'اقرأ مقالًا مطوّلًا ودوّن 3 نقاط رئيسية',
  ]),
  daily('reading.intermediate.3', 'READING', 'INTERMEDIATE', 45, 'HARD', [
    'Read for 45 minutes in one session',
    "Lire 45 minutes d'affilée",
    'اقرأ لمدة 45 دقيقة متواصلة',
  ]),
  daily('reading.advanced.1', 'READING', 'ADVANCED', 80, 'HARD', [
    'Read 60 pages',
    'Lire 60 pages',
    'اقرأ 60 صفحة',
  ]),
  daily('reading.advanced.2', 'READING', 'ADVANCED', 40, 'HARD', [
    'Write a one-page review of a chapter',
    "Écrire une critique d'une page sur un chapitre",
    'اكتب مراجعة من صفحة واحدة لفصل',
  ]),
  daily('reading.advanced.3', 'READING', 'ADVANCED', 20, 'HARD', [
    'Read for 20 minutes in a field you know nothing about',
    'Lire 20 minutes dans un domaine que tu ne connais pas',
    'اقرأ لمدة 20 دقيقة في مجال لا تعرف عنه شيئًا',
  ]),

  // ---------------- Career / projects ----------------
  daily('career.beginner.1', 'CAREER', 'BEGINNER', 25, 'NORMAL', [
    'Work on your personal project for 25 minutes',
    'Travailler 25 minutes sur ton projet personnel',
    'اعمل على مشروعك الشخصي لمدة 25 دقيقة',
  ]),
  daily('career.beginner.2', 'CAREER', 'BEGINNER', 15, 'EASY', [
    'Update one section of your CV',
    'Mettre à jour une section de ton CV',
    'حدّث قسمًا واحدًا من سيرتك الذاتية',
  ]),
  daily('career.beginner.3', 'CAREER', 'BEGINNER', 20, 'EASY', [
    'Watch a tutorial on a skill useful for your career',
    'Regarder un tutoriel sur une compétence utile à ta carrière',
    'شاهد درسًا تعليميًا عن مهارة تفيد مسيرتك المهنية',
  ]),
  daily('career.intermediate.1', 'CAREER', 'INTERMEDIATE', 45, 'HARD', [
    'Finish one small feature or task of your project',
    'Terminer une petite fonctionnalité ou tâche de ton projet',
    'أنجِز ميزة أو مهمة صغيرة في مشروعك',
  ]),
  daily('career.intermediate.2', 'CAREER', 'INTERMEDIATE', 30, 'NORMAL', [
    'Apply to one internship or job offer',
    "Postuler à une offre de stage ou d'emploi",
    'تقدّم لعرض تدريب أو وظيفة واحد',
  ]),
  daily('career.intermediate.3', 'CAREER', 'INTERMEDIATE', 25, 'NORMAL', [
    'Write a post about something you learned',
    'Écrire un post sur quelque chose que tu as appris',
    'اكتب منشورًا عن شيء تعلّمته',
  ]),
  daily('career.advanced.1', 'CAREER', 'ADVANCED', 120, 'EXTREME', [
    'Two hours of deep work on your main project',
    'Deux heures de travail profond sur ton projet principal',
    'ساعتان من العمل العميق على مشروعك الرئيسي',
  ]),
  daily('career.advanced.2', 'CAREER', 'ADVANCED', 20, 'HARD', [
    'Reach out to a professional in your field',
    'Contacter un professionnel de ton domaine',
    'تواصل مع محترف في مجالك',
  ]),
  daily('career.advanced.3', 'CAREER', 'ADVANCED', 60, 'HARD', [
    'Prepare and practice for a technical interview',
    "Préparer et t'entraîner pour un entretien technique",
    'استعدّ وتدرّب على مقابلة تقنية',
  ]),

  // ---------------- Health & habits ----------------
  daily('health.beginner.1', 'HEALTH', 'BEGINNER', 5, 'EASY', [
    'Drink 2 liters of water today',
    "Boire 2 litres d'eau aujourd'hui",
    'اشرب لترين من الماء اليوم',
  ]),
  daily('health.beginner.2', 'HEALTH', 'BEGINNER', 10, 'EASY', [
    'Meditate for 10 minutes',
    'Méditer pendant 10 minutes',
    'تأمّل لمدة 10 دقائق',
  ]),
  daily('health.beginner.3', 'HEALTH', 'BEGINNER', 30, 'NORMAL', [
    'No screens in the 30 minutes before bed',
    "Pas d'écran 30 minutes avant de dormir",
    'لا شاشات خلال 30 دقيقة قبل النوم',
  ]),
  daily('health.intermediate.1', 'HEALTH', 'INTERMEDIATE', 10, 'NORMAL', [
    'Go to bed before 23:00',
    'Te coucher avant 23 h',
    'نَم قبل الساعة 23:00',
  ]),
  daily('health.intermediate.2', 'HEALTH', 'INTERMEDIATE', 40, 'NORMAL', [
    'Cook a healthy meal',
    'Cuisiner un repas équilibré',
    'اطبخ وجبة صحية',
  ]),
  daily('health.intermediate.3', 'HEALTH', 'INTERMEDIATE', 20, 'HARD', [
    'Meditate for 20 minutes',
    'Méditer pendant 20 minutes',
    'تأمّل لمدة 20 دقيقة',
  ]),
  daily('health.advanced.1', 'HEALTH', 'ADVANCED', 15, 'HARD', [
    'A full day without sugar or junk food',
    'Une journée entière sans sucre ni malbouffe',
    'يوم كامل بلا سكر أو وجبات سريعة',
  ]),
  daily('health.advanced.2', 'HEALTH', 'ADVANCED', 30, 'HARD', [
    'Wake up at 6:00 and do your morning routine',
    'Te lever à 6 h et faire ta routine du matin',
    'استيقظ في السادسة وأنجِز روتينك الصباحي',
  ]),
  daily('health.advanced.3', 'HEALTH', 'ADVANCED', 20, 'HARD', [
    'Plan tomorrow in detail and review today',
    "Planifier demain en détail et faire le bilan d'aujourd'hui",
    'خطّط ليوم الغد بالتفصيل وراجع يومك',
  ]),

  // ---------------- Weekly quests ----------------
  weekly('weekly.fitness.beginner', 'FITNESS', 'BEGINNER', 90, 'NORMAL', [
    'Exercise 3 times this week',
    'Faire du sport 3 fois cette semaine',
    'مارس الرياضة 3 مرات هذا الأسبوع',
  ]),
  weekly('weekly.fitness.intermediate', 'FITNESS', 'INTERMEDIATE', 120, 'HARD', [
    'Run 15 km in total this week',
    'Courir 15 km au total cette semaine',
    'اركض ما مجموعه 15 كيلومترًا هذا الأسبوع',
  ]),
  weekly('weekly.fitness.advanced', 'FITNESS', 'ADVANCED', 240, 'EXTREME', [
    'Train 5 times this week',
    "T'entraîner 5 fois cette semaine",
    'تدرّب 5 مرات هذا الأسبوع',
  ]),
  weekly('weekly.studies.beginner', 'STUDIES', 'BEGINNER', 120, 'NORMAL', [
    'Finish one chapter or module of a course',
    'Terminer un chapitre ou un module de cours',
    'أنهِ فصلًا أو وحدة من دورة',
  ]),
  weekly('weekly.studies.intermediate', 'STUDIES', 'INTERMEDIATE', 240, 'HARD', [
    'Solve 10 algorithm problems this week',
    "Résoudre 10 problèmes d'algorithmique cette semaine",
    'حلّ 10 مسائل خوارزمية هذا الأسبوع',
  ]),
  weekly('weekly.studies.advanced', 'STUDIES', 'ADVANCED', 240, 'EXTREME', [
    'Build a small project with what you learned',
    'Réaliser un petit projet avec ce que tu as appris',
    'أنجِز مشروعًا صغيرًا بما تعلّمته',
  ]),
  weekly('weekly.languages.beginner', 'LANGUAGES', 'BEGINNER', 90, 'NORMAL', [
    'Learn 50 new words this week',
    'Apprendre 50 nouveaux mots cette semaine',
    'تعلّم 50 كلمة جديدة هذا الأسبوع',
  ]),
  weekly('weekly.languages.intermediate', 'LANGUAGES', 'INTERMEDIATE', 120, 'HARD', [
    'Watch a full movie in your target language',
    'Regarder un film entier dans la langue cible',
    'شاهد فيلمًا كاملًا باللغة التي تتعلّمها',
  ]),
  weekly('weekly.languages.advanced', 'LANGUAGES', 'ADVANCED', 120, 'EXTREME', [
    'Write a 500-word essay in your target language',
    'Écrire un texte de 500 mots dans la langue cible',
    'اكتب مقالًا من 500 كلمة باللغة التي تتعلّمها',
  ]),
  weekly('weekly.reading.beginner', 'READING', 'BEGINNER', 120, 'NORMAL', [
    'Read 70 pages this week',
    'Lire 70 pages cette semaine',
    'اقرأ 70 صفحة هذا الأسبوع',
  ]),
  weekly('weekly.reading.intermediate', 'READING', 'INTERMEDIATE', 240, 'HARD', [
    'Finish a book',
    'Terminer un livre',
    'أنهِ كتابًا',
  ]),
  weekly('weekly.reading.advanced', 'READING', 'ADVANCED', 240, 'EXTREME', [
    'Read 300 pages this week',
    'Lire 300 pages cette semaine',
    'اقرأ 300 صفحة هذا الأسبوع',
  ]),
  weekly('weekly.career.beginner', 'CAREER', 'BEGINNER', 120, 'NORMAL', [
    'Spend 2 hours on your personal project this week',
    'Consacrer 2 heures à ton projet personnel cette semaine',
    'خصّص ساعتين لمشروعك الشخصي هذا الأسبوع',
  ]),
  weekly('weekly.career.intermediate', 'CAREER', 'INTERMEDIATE', 120, 'HARD', [
    'Apply to 3 internship or job offers',
    "Postuler à 3 offres de stage ou d'emploi",
    'تقدّم لـ 3 عروض تدريب أو وظيفة',
  ]),
  weekly('weekly.career.advanced', 'CAREER', 'ADVANCED', 240, 'EXTREME', [
    'Release a new version of your project',
    'Publier une nouvelle version de ton projet',
    'أطلق نسخة جديدة من مشروعك',
  ]),
  weekly('weekly.health.beginner', 'HEALTH', 'BEGINNER', 60, 'NORMAL', [
    'Sleep 7 hours or more for 5 nights',
    'Dormir 7 heures ou plus pendant 5 nuits',
    'نَم 7 ساعات أو أكثر لمدة 5 ليالٍ',
  ]),
  weekly('weekly.health.intermediate', 'HEALTH', 'INTERMEDIATE', 90, 'HARD', [
    'Meditate every day this week',
    'Méditer tous les jours cette semaine',
    'تأمّل كل يوم هذا الأسبوع',
  ]),
  weekly('weekly.health.advanced', 'HEALTH', 'ADVANCED', 60, 'EXTREME', [
    'One full week without social media',
    'Une semaine entière sans réseaux sociaux',
    'أسبوع كامل بلا وسائل التواصل الاجتماعي',
  ]),

  // ---------------- Penalty quests (after a missed day) ----------------
  quest('PENALTY', 'penalty.1', 'FITNESS', 'BEGINNER', 20, 'HARD', [
    'Penalty: 50 push-ups and 50 squats',
    'Pénalité : 50 pompes et 50 squats',
    'عقوبة: 50 تمرين ضغط و50 تمرين قرفصاء',
  ]),
  quest('PENALTY', 'penalty.2', 'CAREER', 'BEGINNER', 45, 'HARD', [
    'Penalty: 45 minutes of focused work without your phone',
    'Pénalité : 45 minutes de travail concentré sans téléphone',
    'عقوبة: 45 دقيقة من العمل المركّز دون هاتف',
  ]),
  quest('PENALTY', 'penalty.3', 'HEALTH', 'BEGINNER', 15, 'NORMAL', [
    'Penalty: write why you missed yesterday and your plan for today',
    "Pénalité : écrire pourquoi tu as manqué hier et ton plan pour aujourd'hui",
    'عقوبة: اكتب لماذا فاتك الأمس وخطتك لليوم',
  ]),

  // ---------------- First quest, right after onboarding (FR-13) ----------------
  quest('ONBOARDING', 'onboarding.first', 'HEALTH', 'BEGINNER', 5, 'EASY', [
    'Accept the System: write down your number one goal for this year',
    'Accepter le Système : écrire ton objectif numéro un pour cette année',
    'اقبل النظام: اكتب هدفك الأول لهذا العام',
  ]),
];
