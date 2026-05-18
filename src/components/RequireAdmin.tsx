import type { JSX, ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useIsAdmin, useIsBootstrapping } from '@/store/sessionStore';

interface Props {
  children: ReactNode;
}

export default function RequireAdmin({ children }: Props): JSX.Element | null {
  const isAdmin = useIsAdmin();
  const bootstrapping = useIsBootstrapping();

  if (bootstrapping) return null;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
