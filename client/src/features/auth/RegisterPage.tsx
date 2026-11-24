import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ApiError } from '../../api/client';
import type { LanguageCode } from '../../i18n';
import { registerFormSchema, type RegisterFormValues } from './authSchemas';
import { useRegister } from './useAuth';

// Server errors that belong to a specific field are shown under that field
const fieldForErrorCode: Record<string, keyof RegisterFormValues> = {
  USERNAME_TAKEN: 'username',
  EMAIL_TAKEN: 'email',
};

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  const onSubmit = handleSubmit(({ username, email, password }) => {
    registerMutation.mutate(
      {
        username,
        email,
        password,
        // The account remembers the current interface language and the browser's time zone
        language: (i18n.resolvedLanguage ?? 'en') as LanguageCode,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      {
        onSuccess: () => navigate('/dashboard', { replace: true }),
        onError: (error) => {
          if (!(error instanceof ApiError)) return;
          const field = fieldForErrorCode[error.code];
          if (field) setError(field, { message: error.code });
          // Per-field validation errors from the backend
          for (const [name, code] of Object.entries(error.details ?? {})) {
            if (name in registerFormSchema.shape) {
              setError(name as keyof RegisterFormValues, { message: code });
            }
          }
        },
      },
    );
  });

  const error = registerMutation.error;
  const formError =
    error instanceof ApiError
      ? !fieldForErrorCode[error.code] && error.code !== 'VALIDATION_ERROR' && error.code
      : error && 'UNKNOWN';

  const fieldError = (name: keyof RegisterFormValues) => {
    const code = errors[name]?.message;
    return code ? t(`errors.${code}`, t('errors.UNKNOWN')) : undefined;
  };

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white">{t('auth.register.title')}</h1>
        <p className="mt-1 text-slate-400">{t('auth.register.subtitle')}</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Alert>{t(`errors.${formError}`, t('errors.UNKNOWN'))}</Alert>}

        <TextField
          label={t('auth.register.username')}
          hint={t('auth.register.usernameHint')}
          autoComplete="username"
          maxLength={20}
          error={fieldError('username')}
          {...register('username')}
        />
        <TextField
          label={t('auth.register.email')}
          type="email"
          autoComplete="email"
          dir="ltr"
          error={fieldError('email')}
          {...register('email')}
        />
        <TextField
          label={t('auth.register.password')}
          hint={t('auth.register.passwordHint')}
          type="password"
          autoComplete="new-password"
          error={fieldError('password')}
          {...register('password')}
        />
        <TextField
          label={t('auth.register.confirmPassword')}
          type="password"
          autoComplete="new-password"
          error={fieldError('confirmPassword')}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={registerMutation.isPending} className="mt-2 w-full">
          {t('auth.register.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {t('auth.register.hasAccount')}{' '}
        <Link to="/login" className="font-semibold text-arcane-400 hover:text-arcane-300">
          {t('auth.register.loginLink')}
        </Link>
      </p>
    </>
  );
}
