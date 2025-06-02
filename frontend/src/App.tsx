import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import BoardPage from '@/pages/BoardPage';
import InvitePage from '@/pages/InvitePage';
import Layout from '@/components/Layout';

function App() {
  const { token, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/" />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      
      {/* Protected routes */}
      <Route element={token ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/board/:boardId" element={<BoardPage />} />
      </Route>
    </Routes>
  );
}

export default App;