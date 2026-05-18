import type { JSX } from 'react';
import { useParams } from 'react-router';

export default function AdminUserPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <h1 className="mb-4 font-display text-base tracking-wider text-gold">USER · {id}</h1>
      <p className="text-sm text-white/50">Per-user stats will appear here in PR E.</p>
    </div>
  );
}
