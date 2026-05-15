import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSessionStore, useCurrentUser } from '@/store/sessionStore';
import { registerSchema, type RegisterInput } from '@/systems/auth-schemas';

export default function RegisterPage() {
  const registerUser = useSessionStore((s) => s.register);
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (currentUser) navigate('/lobby', { replace: true });
  }, [currentUser, navigate]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await registerUser({
      username: values.username,
      password: values.password,
    });
    if (!result.ok) {
      if (result.error === 'username_taken') {
        setError('username', { message: 'That username is already taken.' });
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
      return;
    }
    navigate('/lobby', { replace: true });
  });

  return (
    <main className="mx-auto grid min-h-full max-w-md place-items-center p-6">
      <form
        onSubmit={(e) => void onSubmit(e)}
        noValidate
        className="w-full space-y-4 rounded-lg border border-gold/30 bg-felt p-6 shadow-gold-glow"
      >
        <h1 className="text-center text-2xl text-gold">Create an account</h1>

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
            autoComplete="new-password"
            {...register('password')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.password.message}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-white/80">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="mt-1 w-full rounded border border-white/20 bg-felt-deep px-3 py-2"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-casino-red" role="alert">
              {errors.confirmPassword.message}
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
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-white/70">
          Already have one?{' '}
          <Link to="/login" className="text-gold underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
