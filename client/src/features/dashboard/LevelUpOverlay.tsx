import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { rankLabel } from '../../game/ranks';

type LevelUpOverlayProps = {
  level: number;
  newRank: string | null; // rank code when the rank changed too
  onClose: () => void;
};

// Full-screen "LEVEL UP" announcement after a level-up or rank-up (FR-43).
// Closes with the button, Escape or a click outside; animations respect "reduce motion".
export function LevelUpOverlay({ level, newRank, onClose }: LevelUpOverlayProps) {
  const { t } = useTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus(); // keyboard users can close it with Enter right away
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
      className="fixed inset-0 z-50 grid place-items-center bg-void/85 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="system-panel animate-level-up w-full max-w-sm p-8 text-center shadow-glow"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-semibold tracking-[0.4em] text-arcane-400 uppercase">
          {t('levelUp.eyebrow')}
        </p>
        <h2
          id="level-up-title"
          className="mt-3 font-display text-5xl font-bold tracking-wide text-white drop-shadow-[0_0_18px_rgb(139_92_246/0.8)]"
        >
          {t('levelUp.title')}
        </h2>
        <p className="mt-4 text-lg text-slate-200">{t('levelUp.level', { level })}</p>
        {newRank && (
          <p className="mt-2 font-display text-2xl font-bold text-amber-300">
            {t('levelUp.rank', { rank: rankLabel(newRank) })}
          </p>
        )}
        <Button ref={buttonRef} onClick={onClose} className="mt-8 w-full">
          {t('levelUp.continue')}
        </Button>
      </div>
    </div>
  );
}
