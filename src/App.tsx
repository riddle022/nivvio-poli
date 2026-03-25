import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CadastrarCandidatos from './pages/CadastrarCandidatos';
import CadastrarEleitores from './pages/CadastrarEleitores';
import CadastrarCoordenador from './pages/CadastrarCoordenador';
import CadastrarMicros from './pages/CadastrarMicros';
import MetasEleitorais from './pages/MetasEleitorais';
import ControleMateriais from './pages/ControleMateriais';
import MapaEstadual from './pages/MapaEstadual';
import MetricasCampanha from './pages/MetricasCampanha';
import MetasRegionais from './pages/MetasRegionais';
import OrganizarReunioes from './pages/OrganizarReunioes';
import RelatoriosVisitas from './pages/RelatoriosVisitas';
import RelatoriosCoordenadores from './pages/RelatoriosCoordenadores';
import MapaRegional from './pages/MapaRegional';
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
        return <CadastrarCandidatos />;
      case 'cadastro-eleitores':
        return <CadastrarEleitores />;
      case 'cadastrar-coordenador':
        return <CadastrarCoordenador />;
      case 'cadastrar-micros':
        return <CadastrarMicros />;
      case 'metas-eleitorais':
        return <MetasEleitorais />;
      case 'materiais-campanha':
        return <ControleMateriais />;
      case 'mapa-estadual':
        return <MapaEstadual />;
      case 'metricas-campanha':
        return <MetricasCampanha />;
      case 'metas-regionais':
        return <MetasRegionais />;
      case 'organizar-reunioes':
        return <OrganizarReunioes />;
      case 'relatorios-visitas':
        return <RelatoriosVisitas />;
      case 'relatorios-coordenadores':
        return <RelatoriosCoordenadores />;
      case 'mapa-regional':
        return <MapaRegional />;
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
