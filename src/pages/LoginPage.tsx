import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSessionStore, useCurrentUser } from '@/store/sessionStore';
import { loginSchema, type LoginInput } from '@/systems/auth-schemas';
import { Card, Field, Input, Button } from '@/components/ui';
import MaskMark from '@/components/brand/MaskMark';
import DevWipeButton from '@/components/DevWipeButton';

export default function LoginPage(): JSX.Element {
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
      <Card surface="velvet" className="w-full">
        <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <MaskMark size={64} />
            <div>
              <h1 className="font-display text-2xl tracking-[0.16em] text-gold">Sign in</h1>
              <p className="mt-1 font-body text-xs text-ivory/60">Welcome back to MASQUER.</p>
            </div>
          </div>

          <Field id="login-username" label="Username" error={errors.username?.message}>
            <Input
              id="login-username"
              type="text"
              autoComplete="username"
              autoFocus
              state={errors.username ? 'error' : 'default'}
              {...register('username')}
            />
          </Field>

          <Field id="login-password" label="Password" error={errors.password?.message}>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              state={errors.password ? 'error' : 'default'}
              {...register('password')}
            />
          </Field>

          {submitError ? (
            <p role="alert" className="text-[11px] text-[#e3a8af]">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="text-center font-body text-xs text-ivory/60">
            New here?{' '}
            <Link to="/register" className="text-gold underline">
              Create an account
            </Link>
          </p>

          <DevWipeButton />
        </form>
      </Card>
    </main>
  );
}
