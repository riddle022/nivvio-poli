import { useEffect, useState } from 'react';
import { supabase, Candidate } from '../lib/supabase';
import { Users, TrendingUp, Activity, UserCheck, MessageSquare, Camera, GraduationCap, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    cidades: 0,
    partidos: 0,
    micros: 0,
    coordenadores: 0,
    votosEstimados: 0,
    visitas: 0,
    eleitores: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Consultas paralelas para otimizar tempo de carregamento
      const [
        { data: candidateData },
        { count: votersCount },
        { count: reportsCount },
        { count: coordsCount },
        { count: microsCount }
      ] = await Promise.all([
        supabase.from('candidates').select('*').order('created_at', { ascending: false }),
        supabase.from('voters').select('*', { count: 'exact', head: true }),
        supabase.from('field_reports').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coordinator'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'micro')
      ]);

      if (candidateData) {
        setCandidates(candidateData);
        
        const uniqueCities = new Set(candidateData.map(c => c.city)).size;
        const uniqueParties = new Set(candidateData.map(c => c.party)).size;
        const activeCount = candidateData.filter(c => c.status === 'Ativo').length;

        setStats({
          total: candidateData.length,
          ativos: activeCount,
          cidades: uniqueCities,
          partidos: uniqueParties,
          micros: microsCount || 0,
          coordenadores: coordsCount || 0,
          votosEstimados: votersCount || 0,
          visitas: reportsCount || 0,
          eleitores: votersCount || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatCards = () => {
    const role = profile?.role || 'micro';

    if (role === 'admin') {
      return [
        { title: 'Total de Micros', value: stats.micros, icon: Users, color: 'from-[#4a8b3a] to-[#45b896]', textColor: 'text-[#4a8b3a]' },
        { title: 'Coordenadores', value: stats.coordenadores, icon: UserCheck, color: 'from-[#45b896] to-[#9ed689]', textColor: 'text-[#45b896]' },
        { title: 'Eleitores Geral', value: stats.votosEstimados.toLocaleString(), icon: TrendingUp, color: 'from-[#1a3d2a] to-[#4a8b3a]', textColor: 'text-[#1a3d2a]' },
        { title: 'Relatórios Campo', value: stats.visitas, icon: Activity, color: 'from-[#9ed689] to-[#def3cd]', textColor: 'text-[#4a8b3a]' },
      ];
    }

    if (role === 'coordinator') {
      return [
        { title: 'Micros Ativos', value: stats.micros, icon: Users, color: 'from-[#4a8b3a] to-[#45b896]', textColor: 'text-[#4a8b3a]' },
        { title: 'Visitas da Região', value: stats.visitas, icon: MessageSquare, color: 'from-[#45b896] to-[#9ed689]', textColor: 'text-[#45b896]' },
        { title: 'Eleitores Geral', value: stats.eleitores, icon: UserPlus, color: 'from-[#1a3d2a] to-[#4a8b3a]', textColor: 'text-[#1a3d2a]' },
        { title: 'Desempenho Regional', value: '85%', icon: Activity, color: 'from-[#9ed689] to-[#def3cd]', textColor: 'text-[#4a8b3a]' },
      ];
    }

    return [
      { title: 'Suas Visitas', value: stats.visitas, icon: MessageSquare, color: 'from-[#4a8b3a] to-[#45b896]', textColor: 'text-[#4a8b3a]' },
      { title: 'Eleitores Captados', value: stats.eleitores, icon: UserPlus, color: 'from-[#45b896] to-[#9ed689]', textColor: 'text-[#45b896]' },
      { title: 'Fotos Enviadas', value: 28, icon: Camera, color: 'from-[#1a3d2a] to-[#4a8b3a]', textColor: 'text-[#1a3d2a]' },
      { title: 'Fidelidade Média', value: '4.8', icon: GraduationCap, color: 'from-[#9ed689] to-[#def3cd]', textColor: 'text-[#4a8b3a]' },
    ];
  };

  const statCards = getStatCards();

  return (
    <div>
      <div className="mb-8 flex items-end gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">Painel de Controle</h1>
          <p className="text-gray-600">Visão estratégica em tempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{card.title}</p>
              <p className={`text-3xl font-black ${card.textColor}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-[#1a3d2a] mb-6 flex items-center gap-2">
            <Users size={20} className="text-[#45b896]" />
            Candidatos em Destaque
        </h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#45b896]"></div>
            Carregando inteligência...
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum candidato cadastrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-3 px-4 font-semibold text-gray-700">Nome</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Partido</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Cargo</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Cidade</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Número</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {candidates.slice(0, 10).map((candidate: any) => (
                  <tr key={candidate.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-medium">{candidate.name}</td>
                    <td className="py-4 px-4 text-gray-600">{candidate.parties?.name || 'N/A'}</td>
                    <td className="py-4 px-4 text-gray-600">{candidate.positions?.name || 'N/A'}</td>
                    <td className="py-4 px-4 text-gray-600">{candidate.cities?.name || 'N/A'}</td>
                    <td className="py-4 px-4">
                      <span className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                        {candidate.number}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          candidate.status === 'Ativo'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {candidate.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
