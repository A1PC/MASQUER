/* eslint-disable react-refresh/only-export-components -- router.tsx mixes
   the `router` export with lazy() component bindings by necessity. */
import { lazy, Suspense, type JSX, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import RequireAdmin from '@/components/RequireAdmin';
import AppLayout from '@/components/AppLayout';
import RouteFallback from '@/components/RouteFallback';
import { registerPrefetcher } from '@/router/usePrefetchOnHover';

// --- lazy bindings ---------------------------------------------------------
//
// Every route-level component is lazy() so the entry chunk stays small.
// Each lazy() is paired with a `registerPrefetcher` call using the SAME
// dynamic import path — Vite dedupes the two so a hover-prefetch resolves
// the very chunk React.lazy will await on click.
//
// PR C of Phase 15 sub-project #15 consolidates the remaining 10 eager
// imports (auth, lobby, profile, settings + 5 game pages) into this list.

// Auth + shell
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const LobbyPage = lazy(() => import('@/pages/LobbyPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

registerPrefetcher('login', () => import('@/pages/LoginPage'));
registerPrefetcher('register', () => import('@/pages/RegisterPage'));
registerPrefetcher('lobby', () => import('@/pages/LobbyPage'));
registerPrefetcher('profile', () => import('@/pages/ProfilePage'));
registerPrefetcher('settings', () => import('@/pages/SettingsPage'));

// Stats + leaderboard
const StatsPage = lazy(() => import('@/pages/stats/StatsPage'));
const StatsOverviewPage = lazy(() => import('@/pages/stats/StatsOverviewPage'));
const StatsPerGamePage = lazy(() => import('@/pages/stats/StatsPerGamePage'));
registerPrefetcher('stats', () => import('@/pages/stats/StatsPage'));

const LeaderboardPage = lazy(() => import('@/pages/leaderboard/LeaderboardPage'));
const LeaderboardOverviewPage = lazy(() => import('@/pages/leaderboard/LeaderboardOverviewPage'));
const LeaderboardPerGamePage = lazy(() => import('@/pages/leaderboard/LeaderboardPerGamePage'));
registerPrefetcher('leaderboard', () => import('@/pages/leaderboard/LeaderboardPage'));

// Lottery
const LotteryPage = lazy(() => import('@/pages/lottery/LotteryPage'));
registerPrefetcher('lottery', () => import('@/pages/lottery/LotteryPage'));

// Games
const CoinFlipPage = lazy(() => import('@/games/coin-flip/CoinFlipPage'));
const BlackjackPage = lazy(() => import('@/games/blackjack/BlackjackPage'));
const RoulettePage = lazy(() => import('@/games/roulette/RoulettePage'));
const SlotsPage = lazy(() => import('@/games/slots/SlotsPage'));
const BaccaratPage = lazy(() => import('@/games/baccarat/BaccaratPage'));
const BingoPage = lazy(() => import('@/games/bingo/BingoPage'));
const PlinkoPage = lazy(() => import('@/games/plinko/PlinkoPage'));
const CrapsPage = lazy(() => import('@/games/craps/CrapsPage'));
const HoldemPage = lazy(() => import('@/games/poker/holdem/HoldemPage'));
const FiveCardDrawPage = lazy(() => import('@/games/poker/five-card-draw/FiveCardDrawPage'));
const OmahaPage = lazy(() => import('@/games/poker/omaha/OmahaPage'));
const PokerLobbyPage = lazy(() => import('@/games/poker/_shared/PokerLobbyPage'));

registerPrefetcher('coin-flip', () => import('@/games/coin-flip/CoinFlipPage'));
registerPrefetcher('blackjack', () => import('@/games/blackjack/BlackjackPage'));
registerPrefetcher('roulette', () => import('@/games/roulette/RoulettePage'));
registerPrefetcher('slots', () => import('@/games/slots/SlotsPage'));
registerPrefetcher('baccarat', () => import('@/games/baccarat/BaccaratPage'));
registerPrefetcher('bingo', () => import('@/games/bingo/BingoPage'));
registerPrefetcher('plinko', () => import('@/games/plinko/PlinkoPage'));
registerPrefetcher('craps', () => import('@/games/craps/CrapsPage'));
registerPrefetcher('poker', () => import('@/games/poker/_shared/PokerLobbyPage'));
registerPrefetcher('poker-holdem', () => import('@/games/poker/holdem/HoldemPage'));
registerPrefetcher(
  'poker-five-card-draw',
  () => import('@/games/poker/five-card-draw/FiveCardDrawPage'),
);
registerPrefetcher('poker-omaha', () => import('@/games/poker/omaha/OmahaPage'));

// Admin
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage'));
const AdminUsersListPage = lazy(() => import('@/pages/admin/AdminUsersListPage'));
const AdminUserPage = lazy(() => import('@/pages/admin/AdminUserPage'));
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage'));
const AdminSessionsPage = lazy(() => import('@/pages/admin/AdminSessionsPage'));
const AdminLeaderboardPage = lazy(() => import('@/pages/admin/AdminLeaderboardPage'));
const AdminLotteryPage = lazy(() => import('@/pages/admin/AdminLotteryPage'));
const AdminBingoPage = lazy(() => import('@/pages/admin/AdminBingoPage'));
const AdminRoulettePage = lazy(() => import('@/pages/admin/AdminRoulettePage'));
const AdminSlotsPage = lazy(() => import('@/pages/admin/AdminSlotsPage'));
const AdminBaccaratPage = lazy(() => import('@/pages/admin/AdminBaccaratPage'));
const AdminPlinkoPage = lazy(() => import('@/pages/admin/AdminPlinkoPage'));
const AdminPokerPage = lazy(() => import('@/pages/admin/AdminPokerPage'));
const AdminCrapsPage = lazy(() => import('@/pages/admin/AdminCrapsPage'));
const AdminBlackjackPage = lazy(() => import('@/pages/admin/AdminBlackjackPage'));
const AdminCoinFlipPage = lazy(() => import('@/pages/admin/AdminCoinFlipPage'));

// --- helpers ---------------------------------------------------------------

/** Wrap a JSX element in a Suspense boundary with the branded fallback. */
function withFallback(label: string, children: ReactNode): JSX.Element {
  return <Suspense fallback={<RouteFallback label={label} />}>{children}</Suspense>;
}

// --- routes ----------------------------------------------------------------

export const router = createBrowserRouter([
  { path: '/login', element: withFallback('Loading…', <LoginPage />) },
  { path: '/register', element: withFallback('Loading…', <RegisterPage />) },
  {
    path: '/admin/login',
    element: withFallback('Loading admin…', <AdminLoginPage />),
  },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <Suspense fallback={<RouteFallback label="Loading admin…" />}>
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
      { path: 'leaderboard', element: <AdminLeaderboardPage /> },
      { path: 'lottery', element: <AdminLotteryPage /> },
      { path: 'bingo', element: <AdminBingoPage /> },
      { path: 'roulette', element: <AdminRoulettePage /> },
      { path: 'slots', element: <AdminSlotsPage /> },
      { path: 'baccarat', element: <AdminBaccaratPage /> },
      { path: 'plinko', element: <AdminPlinkoPage /> },
      { path: 'poker', element: <AdminPokerPage /> },
      { path: 'craps', element: <AdminCrapsPage /> },
      { path: 'blackjack', element: <AdminBlackjackPage /> },
      { path: 'coin-flip', element: <AdminCoinFlipPage /> },
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
      { path: 'lobby', element: withFallback('Loading lobby…', <LobbyPage />) },
      {
        path: 'stats',
        element: (
          <Suspense fallback={<RouteFallback label="Loading stats…" />}>
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
          <Suspense fallback={<RouteFallback label="Loading leaderboard…" />}>
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
          <Suspense fallback={<RouteFallback label="Loading lottery…" />}>
            <LotteryPage />
          </Suspense>
        ),
      },
      { path: 'profile', element: withFallback('Loading profile…', <ProfilePage />) },
      { path: 'profile/edit', element: withFallback('Loading profile…', <ProfilePage edit />) },
      { path: 'settings', element: withFallback('Loading settings…', <SettingsPage />) },
      { path: 'play/coin-flip', element: withFallback('Loading coin flip…', <CoinFlipPage />) },
      { path: 'play/blackjack', element: withFallback('Loading blackjack…', <BlackjackPage />) },
      { path: 'play/roulette', element: withFallback('Loading roulette…', <RoulettePage />) },
      { path: 'play/slots', element: withFallback('Loading slots…', <SlotsPage />) },
      { path: 'play/baccarat', element: withFallback('Loading baccarat…', <BaccaratPage />) },
      { path: 'play/bingo', element: withFallback('Loading bingo…', <BingoPage />) },
      { path: 'play/plinko', element: withFallback('Loading plinko…', <PlinkoPage />) },
      { path: 'play/craps', element: withFallback('Loading craps…', <CrapsPage />) },
      { path: 'play/poker', element: withFallback('Loading poker…', <PokerLobbyPage />) },
      {
        path: 'play/poker/holdem',
        element: withFallback("Loading Hold'em…", <HoldemPage />),
      },
      {
        path: 'play/poker/five-card-draw',
        element: withFallback('Loading Five-Card Draw…', <FiveCardDrawPage />),
      },
      { path: 'play/poker/omaha', element: withFallback('Loading Omaha…', <OmahaPage />) },
    ],
  },
  { path: '*', element: <Navigate to="/lobby" replace /> },
]);
