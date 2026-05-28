import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useNavigate, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSessionStore, useCurrentUser } from '@/store/sessionStore';
import { registerSchema, type RegisterInput } from '@/systems/auth-schemas';
import { Card, Field, Input, Button } from '@/components/ui';
import MaskMark from '@/components/brand/MaskMark';

export default function RegisterPage(): JSX.Element {
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
    if (currentUser) void navigate('/lobby', { replace: true });
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
      } else if (result.error === 'reserved_username') {
        setError('username', { message: 'That username is reserved.' });
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
      return;
    }
    await navigate('/lobby', { replace: true });
  });

  return (
    <main className="mx-auto grid min-h-full max-w-md place-items-center p-6">
      <Card surface="velvet" className="w-full">
        <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <MaskMark size={64} />
            <div>
              <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
                Create an account
              </h1>
              <p className="mt-1 font-body text-xs text-ivory/60">
                Join the table. Chips are on the house.
              </p>
            </div>
          </div>

          <Field
            id="register-username"
            label="Username"
            {...(errors.username?.message ? { error: errors.username.message } : {})}
          >
            <Input
              id="register-username"
              type="text"
              autoComplete="username"
              autoFocus
              state={errors.username ? 'error' : 'default'}
              {...register('username')}
            />
          </Field>

          <Field
            id="register-password"
            label="Password"
            {...(errors.password?.message ? { error: errors.password.message } : {})}
          >
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              state={errors.password ? 'error' : 'default'}
              {...register('password')}
            />
          </Field>

          <Field
            id="register-confirm"
            label="Confirm password"
            {...(errors.confirmPassword?.message ? { error: errors.confirmPassword.message } : {})}
          >
            <Input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              state={errors.confirmPassword ? 'error' : 'default'}
              {...register('confirmPassword')}
            />
          </Field>

          {submitError ? (
            <p role="alert" className="text-[11px] text-casino-red">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating…' : 'Create account'}
          </Button>

          <p className="text-center font-body text-xs text-ivory/60">
            Already have one?{' '}
            <Link to="/login" className="text-gold-bright underline hover:text-ivory">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
