import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSessionStore, useCurrentUser } from '@/store/sessionStore';
import { loginSchema, type LoginInput } from '@/systems/auth-schemas';
import DevWipeButton from '@/components/DevWipeButton';

export default function LoginPage() {
  const login = useSessionStore((s) => s.login);
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/lobby';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    if (currentUser) void navigate(from, { replace: true });
  }, [currentUser, from, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await login(values);
    if (!result.ok) {
      setSubmitError('Invalid username or password.');
      return;
    }
    await navigate(from, { replace: true });
  });

  return (
    <main className="mx-auto grid min-h-full max-w-md place-items-center p-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full space-y-4 rounded-lg border border-gold/30 bg-felt p-6 shadow-gold-glow"
        noValidate
      >
        <h1 className="text-center text-2xl text-gold">Sign in</h1>

        <label className="block">
          <span className="text-sm text-white/80">Username</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            {...register('username')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.username.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.password.message}
            </p>
          )}
        </label>

        {submitError && (
          <p className="text-sm text-casino-red" role="alert">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-casino-red px-4 py-2 font-display tracking-wide text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-white/70">
          New here?{' '}
          <Link to="/register" className="text-gold underline">
            Create an account
          </Link>
        </p>

        <DevWipeButton />
      </form>
    </main>
  );
}
