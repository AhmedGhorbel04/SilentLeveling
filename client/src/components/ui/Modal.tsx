import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// Accessible dialog: announced as a dialog with its title, closes with Escape or a
// click outside, moves focus inside when it opens and back to where it was on close.
export function Modal({ title, onClose, children }: ModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Focus the first form field (not the ✕ button, which comes first in the page);
    // fall back to a button for dialogs without fields
    const panel = panelRef.current;
    const firstField =
      panel?.querySelector<HTMLElement>('input, textarea, select') ??
      panel?.querySelector<HTMLElement>('button');
    firstField?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  // Rendered at the end of <body>: a parent with a blur or transform (like our panels)
  // would otherwise trap the fixed overlay inside its own box
  return createPortal(
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-void/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="system-panel w-full max-w-lg animate-fade-up p-6 shadow-glow"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-display text-2xl font-bold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
