import type { JSX } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSessionStore } from '@/store/sessionStore';

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
    <div className="flex min-h-screen items-center justify-center bg-felt-deep px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gold/60 bg-felt-deep p-6 shadow-gold-glow"
      >
        <h1 className="mb-1 font-display text-lg tracking-[0.18em] text-gold">ADMIN ACCESS</h1>
        <p className="mb-6 text-xs text-white/50">Restricted — staff only.</p>

        <label
          htmlFor="admin-username"
          className="mb-1 block text-xs uppercase tracking-wider text-white/70"
        >
          Username
        </label>
        <input
          id="admin-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          autoFocus
          required
          className="mb-4 w-full rounded-sm border border-white/20 bg-felt-deep px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
        />

        <label
          htmlFor="admin-password"
          className="mb-1 block text-xs uppercase tracking-wider text-white/70"
        >
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          required
          className="mb-4 w-full rounded-sm border border-white/20 bg-felt-deep px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
        />

        {error && <p className="mb-3 text-xs text-casino-red">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-sm bg-gold py-2 font-display text-sm tracking-wider text-felt-deep hover:bg-gold-bright"
        >
          SIGN IN
        </button>
      </form>
    </div>
  );
}
