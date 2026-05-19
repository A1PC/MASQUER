/* eslint-disable react-refresh/only-export-components -- router.tsx mixes
   the `router` export with lazy() component bindings by necessity. */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import RequireAdmin from '@/components/RequireAdmin';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import ProfileStubPage from '@/pages/ProfileStubPage';
import CoinFlipPage from '@/games/coin-flip/CoinFlipPage';
import BlackjackPage from '@/games/blackjack/BlackjackPage';
import RoulettePage from '@/games/roulette/RoulettePage';
import SlotsPage from '@/games/slots/SlotsPage';
import BaccaratPage from '@/games/baccarat/BaccaratPage';

const StatsPage = lazy(() => import('@/pages/stats/StatsPage'));
const StatsOverviewPage = lazy(() => import('@/pages/stats/StatsOverviewPage'));
const StatsPerGamePage = lazy(() => import('@/pages/stats/StatsPerGamePage'));

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage'));
const AdminUsersListPage = lazy(() => import('@/pages/admin/AdminUsersListPage'));
const AdminUserPage = lazy(() => import('@/pages/admin/AdminUserPage'));
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'));
const AdminSessionsPage = lazy(() => import('@/pages/admin/AdminSessionsPage'));

const adminFallback = (
  <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
    Loading admin…
  </div>
);

const statsFallback = (
  <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
    Loading stats…
  </div>
);

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={adminFallback}>
        <AdminLoginPage />
      </Suspense>
    ),
  },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <Suspense fallback={adminFallback}>
          <AdminLayout />
        </Suspense>
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <AdminOverviewPage /> },
      { path: 'users', element: <AdminUsersListPage /> },
      { path: 'users/:id', element: <AdminUserPage /> },
      { path: 'adjustments', element: <AdminAuditPage /> },
      { path: 'sessions', element: <AdminSessionsPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/lobby" replace /> },
      { path: 'lobby', element: <LobbyPage /> },
      {
        path: 'stats',
        element: (
          <Suspense fallback={statsFallback}>
            <StatsPage />
          </Suspense>
        ),
        children: [
          { index: true, element: <StatsOverviewPage /> },
          { path: ':game', element: <StatsPerGamePage /> },
        ],
      },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'profile', element: <ProfileStubPage feature="Your profile" /> },
      { path: 'profile/edit', element: <ProfileStubPage feature="Edit profile" /> },
      { path: 'settings', element: <ProfileStubPage feature="Settings" /> },
      { path: 'play/coin-flip', element: <CoinFlipPage /> },
      { path: 'play/blackjack', element: <BlackjackPage /> },
      { path: 'play/roulette', element: <RoulettePage /> },
      { path: 'play/slots', element: <SlotsPage /> },
      { path: 'play/baccarat', element: <BaccaratPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/lobby" replace /> },
]);
