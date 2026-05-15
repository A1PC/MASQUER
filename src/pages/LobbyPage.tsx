import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useSessionStore } from '@/store/sessionStore';

export default function LobbyPage() {
  const user = useCurrentUser();
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-label="avatar"
            className="inline-block h-10 w-10 rounded-full"
            style={{ backgroundColor: user.avatarColor }}
          />
          <h1 className="text-2xl">
            Welcome, <span className="text-gold">{user.username}</span>
          </h1>
        </div>
        <button
          onClick={() => void handleLogout()}
          className="rounded border border-white/30 px-3 py-1 text-sm hover:bg-white/10"
        >
          Log out
        </button>
      </header>

      <p className="text-white/60">
        Phase 1 placeholder. Wallet, game grid, and stats land in upcoming phases.
      </p>
    </main>
  );
}
