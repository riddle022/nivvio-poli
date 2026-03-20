import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  UserPlus, 
  LogOut, 
  Menu, 
  X, 
  Users, 
  Target, 
  Package, 
  Send, 
  BarChart3, 
  Map as MapIcon, 
  FileText, 
  Calendar, 
  Truck, 
  MapPin, 
  Camera, 
  CheckCircle2 
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: any) => void;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { signOut, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getMenuItems = () => {
    const role = profile?.role || 'micro';
    console.log('Layout - Rol actual detectado para el menú:', role);
    console.log('Layout - Perfil completo:', profile);
    
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    if (role === 'admin') {
      items.push(
        { id: 'cadastrar-candidatos', label: 'Cadastrar Candidatos', icon: UserPlus },
        { id: 'cadastrar-coordenador', label: 'Cadastrar Coordenador', icon: Users },
        { id: 'metas-eleitorais', label: 'Metas Eleitorais', icon: Target },
        { id: 'materiais-campanha', label: 'Materiais de Campanha', icon: Package },
        { id: 'cards-motivacionais', label: 'Cards Motivacionais', icon: Send },
        { id: 'metricas-campanha', label: 'Métricas da Campanha', icon: BarChart3 },
        { id: 'mapa-estadual', label: 'Mapa Estadual', icon: MapIcon },
        { id: 'relatorios-coordenadores', label: 'Relatórios Coordenadores', icon: FileText },
        { id: 'desempenho-micros', label: 'Desempenho dos Micros', icon: Target }
      );
    } else if (role === 'coordinator') {
      items.push(
        { id: 'cadastrar-micros', label: 'Cadastrar Micros', icon: Users },
        { id: 'organizar-reunioes', label: 'Organizar Reuniões', icon: Calendar },
        { id: 'distribuir-materiais', label: 'Distribuir Materiais', icon: Truck },
        { id: 'relatorios-visitas', label: 'Relatórios de Visitas', icon: FileText },
        { id: 'metas-regionais', label: 'Metas Regionais', icon: Target },
        { id: 'mapa-regional', label: 'Mapa da Região', icon: MapIcon }
      );
    } else if (role === 'micro') {
      items.push(
        { id: 'cadastro-eleitores', label: 'Cadastro de Eleitores', icon: UserPlus },
        { id: 'envio-fotos', label: 'Envio de Fotos', icon: Camera },
        { id: 'relatorio-visitas-micro', label: 'Relatório de Visitas', icon: FileText },
        { id: 'avaliacao-fidelidade', label: 'Avaliação de Fidelidade', icon: CheckCircle2 }
      );
    }

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-gradient-to-r from-[#1a3d2a] to-[#4a8b3a] text-white p-4 z-50 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">NIVVIO POLI</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <aside
        className={`
          fixed top-0 left-0 h-full bg-gradient-to-b from-[#1a3d2a] via-[#2d5940] to-[#1a3d2a] text-white w-72
          transform transition-transform duration-300 ease-in-out z-40 shadow-2xl
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold mb-1">NIVVIO POLI</h1>
          <p className="text-sm text-[#9ed689]">Inteligência Territorial</p>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-[#45b896] to-[#4a8b3a] shadow-lg'
                      : 'hover:bg-white/5'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/20 transition-all text-red-300"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-72 pt-20 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
