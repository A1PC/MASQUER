import { createBrowserRouter, Navigate } from 'react-router';
import RequireAuth from '@/components/RequireAuth';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import ProfileStubPage from '@/pages/ProfileStubPage';
import CoinFlipPage from '@/games/coin-flip/CoinFlipPage';
import StubGamePage from '@/games/_shared/StubGamePage';
import BlackjackPage from '@/games/blackjack/BlackjackPage';
import RoulettePage from '@/games/roulette/RoulettePage';
import SlotsPage from '@/games/slots/SlotsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
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
      { path: 'stats', element: <StatsPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'profile', element: <ProfileStubPage feature="Your profile" /> },
      { path: 'profile/edit', element: <ProfileStubPage feature="Edit profile" /> },
      { path: 'settings', element: <ProfileStubPage feature="Settings" /> },
      { path: 'play/coin-flip', element: <CoinFlipPage /> },
      { path: 'play/blackjack', element: <BlackjackPage /> },
      { path: 'play/roulette', element: <RoulettePage /> },
      { path: 'play/slots', element: <SlotsPage /> },
      { path: 'play/baccarat', element: <StubGamePage game="baccarat" phase={6} /> },
    ],
  },
  { path: '*', element: <Navigate to="/lobby" replace /> },
]);
