import type { JSX } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSessionStore } from '@/store/sessionStore';
import { Card, Field, Input, Button } from '@/components/ui';
import MaskMark from '@/components/brand/MaskMark';

export default function AdminLoginPage(): JSX.Element {
  const navigate = useNavigate();
  const loginAdmin = useSessionStore((s) => s.loginAdmin);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = loginAdmin({ username, password });
    if (result.ok) {
      void navigate('/admin', { replace: true });
    } else {
      setError('Invalid credentials.');
    }
  }

  return (
    // min-h-full + Card/Field/Input/Button aligns admin auth to the player
    // LoginPage chrome; see audit §1.3 — was previously min-h-screen +
    // bg-felt-deep with bespoke <input>s that bypassed the design system.
    <main className="mx-auto grid min-h-full max-w-md place-items-center p-6">
      <Card surface="velvet" className="w-full">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <MaskMark size={64} />
            <div>
              <h1 className="font-display text-2xl tracking-[0.18em] text-gold-bright">
                Admin access
              </h1>
              <p className="mt-1 font-body text-xs text-ivory/60">Restricted to staff.</p>
            </div>
          </div>

          <Field id="admin-username" label="Username">
            <Input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoFocus
              required
              state={error ? 'error' : 'default'}
            />
          </Field>

          <Field id="admin-password" label="Password">
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              required
              state={error ? 'error' : 'default'}
            />
          </Field>

          {error ? (
            <p role="alert" className="text-[11px] text-casino-red">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" className="w-full">
            Sign in
          </Button>
        </form>
      </Card>
    </main>
  );
}
