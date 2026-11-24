import { useId, useState, type InputHTMLAttributes, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
};

// Text input with a label, an optional hint and an error message.
// The input is linked to its hint and error with aria-describedby so screen
// readers announce them.
export function TextField({ label, hint, error, type = 'text', ref, ...props }: TextFieldProps) {
  const { t } = useTranslation();
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={isPassword && showPassword ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`w-full rounded-md border bg-void/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 transition focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-500/70 focus:ring-rose-500/40'
              : 'border-abyss-border focus:border-arcane-500 focus:ring-arcane-500/30'
          } ${isPassword ? 'pe-16' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 end-0 px-3 text-slate-400 hover:text-arcane-300"
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            aria-pressed={showPassword}
          >
            <EyeIcon crossed={showPassword} />
          </button>
        )}
      </div>

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M4 4l16 16" strokeLinecap="round" />}
    </svg>
  );
}
