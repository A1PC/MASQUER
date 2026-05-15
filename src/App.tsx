import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import LobbyPage from '@/pages/LobbyPage';
import StatsPage from '@/pages/StatsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  );
}
