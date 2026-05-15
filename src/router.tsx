import { createBrowserRouter, Navigate } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/lobby" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/lobby',
    element: (
      <RequireAuth>
        <LobbyPage />
      </RequireAuth>
    ),
  },
  {
    path: '/stats',
    element: (
      <RequireAuth>
        <StatsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/leaderboard',
    element: (
      <RequireAuth>
        <LeaderboardPage />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/lobby" replace /> },
]);
