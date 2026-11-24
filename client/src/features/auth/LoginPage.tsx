import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ApiError } from '../../api/client';
import { loginFormSchema, type LoginFormValues } from './authSchemas';
import { useLogin } from './useAuth';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  // After login, go back to the page the player originally wanted (if any)
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => navigate(redirectTo, { replace: true }) });
  });

  const serverError = login.error instanceof ApiError ? login.error.code : login.error && 'UNKNOWN';

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white">{t('auth.login.title')}</h1>
        <p className="mt-1 text-slate-400">{t('auth.login.subtitle')}</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {serverError && <Alert>{t(`errors.${serverError}`, t('errors.UNKNOWN'))}</Alert>}

        <TextField
          label={t('auth.login.identifier')}
          autoComplete="username"
          error={errors.identifier && t(`errors.${errors.identifier.message}`)}
          {...register('identifier')}
        />
        <TextField
          label={t('auth.login.password')}
          type="password"
          autoComplete="current-password"
          error={errors.password && t(`errors.${errors.password.message}`)}
          {...register('password')}
        />

        <Button type="submit" isLoading={login.isPending} className="mt-2 w-full">
          {t('auth.login.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-arcane-400 hover:text-arcane-300">
          {t('auth.login.registerLink')}
        </Link>
      </p>
    </>
  );
}
