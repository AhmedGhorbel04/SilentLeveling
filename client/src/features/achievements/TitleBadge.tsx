import { useTranslation } from 'react-i18next';
import type { Title } from '../../api/achievements';
import type { LanguageCode } from '../../i18n';
import { RARITY_TEXT } from './achievementStyles';

// A title in the player's language, coloured by rarity
export function TitleBadge({ title }: { title: Title }) {
  const { t, i18n } = useTranslation();
  const name = title.name[(i18n.resolvedLanguage ?? 'en') as LanguageCode];

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold ${RARITY_TEXT[title.rarity]}`}
      title={t(`rarity.${title.rarity}`)}
    >
      ✦ {name}
    </span>
  );
}
