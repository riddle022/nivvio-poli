import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CadastrarCandidatos from './pages/CadastrarCandidatos';
import CadastrarCoordenador from './pages/CadastrarCoordenador';
import CadastrarMicros from './pages/CadastrarMicros';
import MockDataPage from './pages/MockDataPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a3d2a] to-[#45b896] flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'cadastrar-candidatos':
      case 'cadastro-eleitores':
        return <CadastrarCandidatos />;
      case 'cadastrar-coordenador':
        return <CadastrarCoordenador />;
      case 'cadastrar-micros':
        return <CadastrarMicros />;
      default:
        return <MockDataPage pageId={currentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
