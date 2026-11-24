import type { Category } from '../../game/constants';

// Suggested breakdowns for common goals (FR-33). They only pre-fill the goal form:
// the player edits them, then saves a normal goal. That is why they live in the
// frontend and not in the database.

type Text = { en: string; fr: string; ar: string };

export type GoalTemplate = {
  id: string;
  category: Category;
  title: Text;
  milestones: Text[];
};

export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  {
    id: 'internship',
    category: 'CAREER',
    title: {
      en: 'Get a developer internship',
      fr: 'Décrocher un stage de développeur',
      ar: 'الحصول على تدريب كمطوّر',
    },
    milestones: [
      { en: 'Update my CV', fr: 'Mettre à jour mon CV', ar: 'تحديث سيرتي الذاتية' },
      {
        en: 'Build a portfolio project',
        fr: 'Réaliser un projet pour mon portfolio',
        ar: 'إنجاز مشروع لملف أعمالي',
      },
      {
        en: 'Practice 30 algorithm problems',
        fr: "M'entraîner sur 30 problèmes d'algorithmique",
        ar: 'التدرّب على 30 مسألة خوارزمية',
      },
      {
        en: 'Apply to 10 companies',
        fr: 'Postuler dans 10 entreprises',
        ar: 'التقدّم إلى 10 شركات',
      },
      {
        en: 'Prepare for interviews',
        fr: 'Préparer les entretiens',
        ar: 'الاستعداد للمقابلات',
      },
    ],
  },
  {
    id: 'run10k',
    category: 'FITNESS',
    title: { en: 'Run 10 km', fr: 'Courir 10 km', ar: 'الجري لمسافة 10 كيلومترات' },
    milestones: [
      {
        en: 'Run 2 km without stopping',
        fr: 'Courir 2 km sans m’arrêter',
        ar: 'الجري كيلومترين دون توقف',
      },
      {
        en: 'Run 3 times a week for a month',
        fr: 'Courir 3 fois par semaine pendant un mois',
        ar: 'الجري 3 مرات أسبوعيًا لمدة شهر',
      },
      { en: 'Run 5 km', fr: 'Courir 5 km', ar: 'الجري 5 كيلومترات' },
      { en: 'Run 8 km', fr: 'Courir 8 km', ar: 'الجري 8 كيلومترات' },
      { en: 'Run 10 km', fr: 'Courir 10 km', ar: 'الجري 10 كيلومترات' },
    ],
  },
  {
    id: 'languageB1',
    category: 'LANGUAGES',
    title: {
      en: 'Reach B1 level in a language',
      fr: 'Atteindre le niveau B1 dans une langue',
      ar: 'بلوغ المستوى B1 في لغة',
    },
    milestones: [
      {
        en: 'Learn the 500 most common words',
        fr: 'Apprendre les 500 mots les plus courants',
        ar: 'تعلّم الكلمات الـ500 الأكثر استخدامًا',
      },
      {
        en: 'Finish a beginner course',
        fr: 'Terminer un cours pour débutants',
        ar: 'إنهاء دورة للمبتدئين',
      },
      {
        en: 'Hold a 10-minute conversation',
        fr: 'Tenir une conversation de 10 minutes',
        ar: 'إجراء محادثة لمدة 10 دقائق',
      },
      {
        en: 'Watch an episode without subtitles',
        fr: 'Regarder un épisode sans sous-titres',
        ar: 'مشاهدة حلقة دون ترجمة',
      },
      {
        en: 'Pass a B1 practice test',
        fr: 'Réussir un test blanc de niveau B1',
        ar: 'اجتياز اختبار تجريبي للمستوى B1',
      },
    ],
  },
  {
    id: 'books',
    category: 'READING',
    title: {
      en: 'Read 12 books this year',
      fr: 'Lire 12 livres cette année',
      ar: 'قراءة 12 كتابًا هذا العام',
    },
    milestones: [
      { en: 'Choose my 12 books', fr: 'Choisir mes 12 livres', ar: 'اختيار كتبي الـ12' },
      { en: 'Read 3 books', fr: 'Lire 3 livres', ar: 'قراءة 3 كتب' },
      { en: 'Read 6 books', fr: 'Lire 6 livres', ar: 'قراءة 6 كتب' },
      { en: 'Read 9 books', fr: 'Lire 9 livres', ar: 'قراءة 9 كتب' },
      { en: 'Read 12 books', fr: 'Lire 12 livres', ar: 'قراءة 12 كتابًا' },
    ],
  },
  {
    id: 'project',
    category: 'STUDIES',
    title: {
      en: 'Build and publish a personal project',
      fr: 'Créer et publier un projet personnel',
      ar: 'إنشاء مشروع شخصي ونشره',
    },
    milestones: [
      {
        en: 'Define the project and its features',
        fr: 'Définir le projet et ses fonctionnalités',
        ar: 'تحديد المشروع وميزاته',
      },
      {
        en: 'Build a first working version',
        fr: 'Réaliser une première version fonctionnelle',
        ar: 'إنجاز نسخة أولى تعمل',
      },
      {
        en: 'Write tests and documentation',
        fr: 'Écrire les tests et la documentation',
        ar: 'كتابة الاختبارات والتوثيق',
      },
      { en: 'Deploy it online', fr: 'Le mettre en ligne', ar: 'نشره على الإنترنت' },
      {
        en: 'Share it and collect feedback',
        fr: 'Le partager et recueillir des retours',
        ar: 'مشاركته وجمع الآراء',
      },
    ],
  },
  {
    id: 'routine',
    category: 'HEALTH',
    title: {
      en: 'Build a healthy morning routine',
      fr: 'Mettre en place une routine matinale saine',
      ar: 'بناء روتين صباحي صحي',
    },
    milestones: [
      {
        en: 'Go to bed before 23:00 for a week',
        fr: 'Me coucher avant 23 h pendant une semaine',
        ar: 'النوم قبل الساعة 23:00 لمدة أسبوع',
      },
      {
        en: 'Wake up at the same time for 2 weeks',
        fr: 'Me lever à la même heure pendant 2 semaines',
        ar: 'الاستيقاظ في الوقت نفسه لمدة أسبوعين',
      },
      {
        en: 'Add 10 minutes of exercise',
        fr: "Ajouter 10 minutes d'exercice",
        ar: 'إضافة 10 دقائق من التمارين',
      },
      {
        en: 'Add 10 minutes of reading or planning',
        fr: 'Ajouter 10 minutes de lecture ou de planification',
        ar: 'إضافة 10 دقائق من القراءة أو التخطيط',
      },
      {
        en: 'Keep the routine for 30 days',
        fr: 'Tenir la routine pendant 30 jours',
        ar: 'الالتزام بالروتين لمدة 30 يومًا',
      },
    ],
  },
];
