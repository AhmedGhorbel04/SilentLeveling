import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '../components/ui/buttonClasses';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-7xl font-bold text-arcane-500">404</p>
      <h1 className="font-display text-2xl font-bold text-white">{t('notFound.title')}</h1>
      <p className="text-slate-400">{t('notFound.text')}</p>
      <Link to="/" className={buttonClasses('secondary', 'mt-2')}>
        {t('common.backHome')}
      </Link>
    </main>
  );
}
