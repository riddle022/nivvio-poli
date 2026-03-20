import { 
  Target, Package, FileText, Map as MapIcon, 
  TrendingUp, Users, Filter, Download
} from 'lucide-react';

interface MockDataPageProps {
  pageId: string;
}

export default function MockDataPage({ pageId }: MockDataPageProps) {
  
  const renderContent = () => {
    switch (pageId) {
      case 'metas-eleitorais':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Meta de Votos Estadual</p>
                <p className="text-3xl font-bold text-[#1a3d2a]">250.000</p>
                <div className="mt-4 bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#45b896] w-3/4 h-full rounded-full"></div>
                </div>
                <p className="text-xs text-[#45b896] mt-2 font-medium">75% Atingido</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Novos Eleitores (Semana)</p>
                <p className="text-3xl font-bold text-[#4a8b3a]">12.450</p>
                <p className="text-xs text-green-500 mt-2 font-medium">↑ 12% em relação à anterior</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Regiões em Destaque</p>
                <p className="text-3xl font-bold text-[#45b896]">Litoral & Norte</p>
                <p className="text-xs text-gray-400 mt-2">Crescimento constante</p>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-[#1a3d2a] mb-6 flex items-center gap-2">
                <Target className="text-[#45b896]" /> Detalhamento por Região
              </h3>
              <table className="w-full">
                <thead className="text-left text-sm text-gray-500 border-b border-gray-50">
                  <tr>
                    <th className="pb-4 font-medium">Região</th>
                    <th className="pb-4 font-medium">Base de Dados</th>
                    <th className="pb-4 font-medium">Meta 2026</th>
                    <th className="pb-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {['Região Leste', 'Região Norte', 'Litoral', 'Central'].map((r, i) => (
                    <tr key={r} className="group hover:bg-gray-50">
                      <td className="py-4 font-bold text-gray-700">{r}</td>
                      <td className="py-4">{(45000 + (i * 12000)).toLocaleString()}</td>
                      <td className="py-4 text-[#4a8b3a] font-semibold">{(75000 + (i * 15000)).toLocaleString()}</td>
                      <td className="py-4">
                        <span className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-bold">EM PROGRESSO</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'materiais-campanha':
      case 'distribuir-materiais':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Adesivos Carro', stock: 15400, color: 'text-blue-600' },
              { name: 'Santinhos 4x0', stock: 450000, color: 'text-green-600' },
              { name: 'Praguinhas', stock: 8500, color: 'text-yellow-600' },
              { name: 'Bandeiras G', stock: 240, color: 'text-red-600' },
            ].map(m => (
              <div key={m.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <Package size={24} className={`mb-4 ${m.color}`} />
                <h3 className="font-bold text-gray-800">{m.name}</h3>
                <p className="text-2xl font-bold text-[#1a3d2a] mt-2">{m.stock.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Em estoque central</p>
                <button className="w-full mt-4 bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
                  Solicitar Envio
                </button>
              </div>
            ))}
          </div>
        );

      case 'relatorios-coordenadores':
      case 'relatorios-visitas':
      case 'relatorio-visitas-micro':
        return (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-[#1a3d2a] flex items-center gap-2">
                <FileText className="text-[#45b896]" /> Relatórios de Campo
              </h3>
              <div className="flex gap-2">
                <button className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100"><Filter size={18} /></button>
                <button className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100"><Download size={18} /></button>
              </div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-50 rounded-xl hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#def3cd] rounded-full flex items-center justify-center text-[#1a3d2a]">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Relatório Automático - Dia {20 - i} de Março</p>
                      <p className="text-xs text-gray-500">Enviado por Coordenador Regional Leste</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">PDF • 2.4 MB</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'mapa-estadual':
      case 'mapa-regional':
        return (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[500px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white relative">
            <MapIcon size={80} className="text-[#9ed689] opacity-20 mb-4" />
            <p className="text-gray-400 font-medium">Mapa Georreferenciado Carregando...</p>
            <div className="absolute inset-0 p-12 opacity-10 pointer-events-none">
                <div className="grid grid-cols-12 gap-1 h-full">
                    {Array.from({ length: 48 }).map((_, i) => (
                        <div key={i} className="bg-[#45b896] rounded-sm transform scale-x-75"></div>
                    ))}
                </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white shadow-lg z-10">
                <p className="text-[#1a3d2a] font-bold text-center mb-2">Presença por Cidade</p>
                <div className="flex gap-2 items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div><span className="text-xs text-gray-600">Forte</span>
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div><span className="text-xs text-gray-600">Média</span>
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div><span className="text-xs text-gray-600">Fraca</span>
                </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg border-2 border-dashed border-gray-100">
            <TrendingUp size={64} className="mx-auto text-[#45b896] mb-6 opacity-30" />
            <h1 className="text-4xl font-extrabold text-[#1a3d2a] uppercase tracking-wider mb-4">Em Desenvolvimento</h1>
            <p className="text-xl text-gray-500 max-w-lg mx-auto leading-relaxed">
                Estamos preparando os melhores gráficos e métricas para a seção <span className="text-[#45b896] font-bold">{pageId}</span>. 
            </p>
            <div className="mt-8 flex justify-center gap-4">
                <div className="w-3 h-3 bg-[#45b896] rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-[#45b896] rounded-full animate-bounce delay-75"></div>
                <div className="w-3 h-3 bg-[#45b896] rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        );
    }
  };

  const getPageTitle = () => {
      const titles: Record<string, string> = {
          'metas-eleitorais': 'Gestão de Metas Eleitorais',
          'materiais-campanha': 'Controle de Materiais',
          'cards-motivacionais': 'Comunicação Motivacional',
          'metricas-campanha': 'Análise de Desempenho Estatístico',
          'mapa-estadual': 'Inteligência Territorial Estadual',
          'desempenho-micros': 'Ranking de Fidelidade de Micros',
          'organizar-reunioes': 'Planejamento de Reuniões Estratégicas',
          'envio-fotos': 'Relatório Fotográfico Diário',
          'avaliacao-fidelidade': 'Auditoria de Fidelidade do Eleitor'
      };
      return titles[pageId] || pageId.charAt(0).toUpperCase() + pageId.slice(1).replace('-', ' ');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">{getPageTitle()}</h1>
        <p className="text-gray-600">Informações atualizadas para apresentação estratégica</p>
      </div>

      {renderContent()}
    </div>
  );
}
