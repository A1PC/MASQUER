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
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import CoinFlipPage from '@/games/coin-flip/CoinFlipPage';
import BlackjackPage from '@/games/blackjack/BlackjackPage';
import RoulettePage from '@/games/roulette/RoulettePage';
import SlotsPage from '@/games/slots/SlotsPage';
import BaccaratPage from '@/games/baccarat/BaccaratPage';

const StatsPage = lazy(() => import('@/pages/stats/StatsPage'));
const StatsOverviewPage = lazy(() => import('@/pages/stats/StatsOverviewPage'));
const StatsPerGamePage = lazy(() => import('@/pages/stats/StatsPerGamePage'));

const LeaderboardPage = lazy(() => import('@/pages/leaderboard/LeaderboardPage'));

const LotteryPage = lazy(() => import('@/pages/lottery/LotteryPage'));
const LeaderboardOverviewPage = lazy(() => import('@/pages/leaderboard/LeaderboardOverviewPage'));
const LeaderboardPerGamePage = lazy(() => import('@/pages/leaderboard/LeaderboardPerGamePage'));

const BingoPage = lazy(() => import('@/games/bingo/BingoPage'));
const PlinkoPage = lazy(() => import('@/games/plinko/PlinkoPage'));
const CrapsPage = lazy(() => import('@/games/craps/CrapsPage'));
const HoldemPage = lazy(() => import('@/games/poker/holdem/HoldemPage'));
const FiveCardDrawPage = lazy(() => import('@/games/poker/five-card-draw/FiveCardDrawPage'));
const OmahaPage = lazy(() => import('@/games/poker/omaha/OmahaPage'));
const PokerLobbyPage = lazy(() => import('@/games/poker/_shared/PokerLobbyPage'));

const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage'));
const AdminUsersListPage = lazy(() => import('@/pages/admin/AdminUsersListPage'));
const AdminUserPage = lazy(() => import('@/pages/admin/AdminUserPage'));
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'));
const AdminSessionsPage = lazy(() => import('@/pages/admin/AdminSessionsPage'));
const AdminLotteryPage = lazy(() => import('@/pages/admin/AdminLotteryPage'));
const AdminBingoPage = lazy(() => import('@/pages/admin/AdminBingoPage'));
const AdminRoulettePage = lazy(() => import('@/pages/admin/AdminRoulettePage'));
const AdminSlotsPage = lazy(() => import('@/pages/admin/AdminSlotsPage'));

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
      { path: 'lottery', element: <AdminLotteryPage /> },
      { path: 'bingo', element: <AdminBingoPage /> },
      { path: 'roulette', element: <AdminRoulettePage /> },
      { path: 'slots', element: <AdminSlotsPage /> },
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
      {
        path: 'leaderboard',
        element: (
          <Suspense fallback={statsFallback}>
            <LeaderboardPage />
          </Suspense>
        ),
        children: [
          { index: true, element: <LeaderboardOverviewPage /> },
          { path: ':game', element: <LeaderboardPerGamePage /> },
        ],
      },
      {
        path: 'lottery',
        element: (
          <Suspense fallback={statsFallback}>
            <LotteryPage />
          </Suspense>
        ),
      },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/edit', element: <ProfilePage edit /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'play/coin-flip', element: <CoinFlipPage /> },
      { path: 'play/blackjack', element: <BlackjackPage /> },
      { path: 'play/roulette', element: <RoulettePage /> },
      { path: 'play/slots', element: <SlotsPage /> },
      { path: 'play/baccarat', element: <BaccaratPage /> },
      {
        path: 'play/bingo',
        element: (
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
                Loading bingo…
              </div>
            }
          >
            <BingoPage />
          </Suspense>
        ),
      },
      {
        path: 'play/plinko',
        element: (
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
                Loading plinko…
              </div>
            }
          >
            <PlinkoPage />
          </Suspense>
        ),
      },
      {
        path: 'play/craps',
        element: (
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
                Loading craps…
              </div>
            }
          >
            <CrapsPage />
          </Suspense>
        ),
      },
      {
        path: 'play/poker',
        element: (
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
                Loading poker…
              </div>
            }
          >
            <PokerLobbyPage />
          </Suspense>
        ),
      },
      {
        path: 'play/poker/holdem',
        element: (
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
                Loading Hold&apos;em…
              </div>
            }
          >
            <HoldemPage />
          </Suspense>
        ),
      },
      {
        path: 'play/poker/five-card-draw',
        element: (
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
                Loading Five-Card Draw…
              </div>
            }
          >
            <FiveCardDrawPage />
          </Suspense>
        ),
      },
      {
        path: 'play/poker/omaha',
        element: (
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-felt-deep text-xs text-white/40">
                Loading Omaha…
              </div>
            }
          >
            <OmahaPage />
          </Suspense>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/lobby" replace /> },
]);
