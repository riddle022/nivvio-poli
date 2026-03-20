import { useEffect, useState } from 'react';
import { supabase, Candidate } from '../lib/supabase';
import { Users, TrendingUp, MapPin, Activity, UserCheck, MessageSquare, Camera, GraduationCap, UserPlus } from 'lucide-react';
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
    setLoading(true);
    const { data: candidateData } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (candidateData) {
      setCandidates(candidateData);
      
      const uniqueCities = new Set(candidateData.map(c => c.city)).size;
      const uniqueParties = new Set(candidateData.map(c => c.party)).size;
      const activeCount = candidateData.filter(c => c.status === 'Ativo').length;

      // Mock de dados adicionais para visualização da nova estrutura
      setStats({
        total: candidateData.length,
        ativos: activeCount,
        cidades: uniqueCities,
        partidos: uniqueParties,
        micros: 154,
        coordenadores: 12,
        votosEstimados: 12500,
        visitas: profile?.role === 'micro' ? 45 : 890,
        eleitores: profile?.role === 'micro' ? 120 : 3450,
      });
    }
    setLoading(false);
  };

  const getStatCards = () => {
    const role = profile?.role || 'micro';

    if (role === 'admin') {
      return [
        { title: 'Total de Micros', value: stats.micros, icon: Users, color: 'from-[#4a8b3a] to-[#45b896]', textColor: 'text-[#4a8b3a]' },
        { title: 'Coordenadores', value: stats.coordenadores, icon: UserCheck, color: 'from-[#45b896] to-[#9ed689]', textColor: 'text-[#45b896]' },
        { title: 'Estimativa de Votos', value: stats.votosEstimados.toLocaleString(), icon: TrendingUp, color: 'from-[#1a3d2a] to-[#4a8b3a]', textColor: 'text-[#1a3d2a]' },
        { title: 'Métricas Ativas', value: stats.ativos, icon: Activity, color: 'from-[#9ed689] to-[#def3cd]', textColor: 'text-[#4a8b3a]' },
      ];
    }

    if (role === 'coordinator') {
      return [
        { title: 'Micros Ativos', value: stats.micros, icon: Users, color: 'from-[#4a8b3a] to-[#45b896]', textColor: 'text-[#4a8b3a]' },
        { title: 'Visitas Realizadas', value: stats.visitas, icon: MessageSquare, color: 'from-[#45b896] to-[#9ed689]', textColor: 'text-[#45b896]' },
        { title: 'Eleitores Cadastrados', value: stats.eleitores, icon: UserPlus, color: 'from-[#1a3d2a] to-[#4a8b3a]', textColor: 'text-[#1a3d2a]' },
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral da campanha eleitoral</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">{card.title}</p>
              <p className={`text-3xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-[#1a3d2a] mb-6">Candidatos Recentes</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Carregando...
          </div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum candidato cadastrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Partido</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cargo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cidade</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Número</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {candidates.slice(0, 10).map((candidate) => (
                  <tr key={candidate.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{candidate.name}</td>
                    <td className="py-3 px-4">{candidate.party}</td>
                    <td className="py-3 px-4">{candidate.position}</td>
                    <td className="py-3 px-4">{candidate.city}</td>
                    <td className="py-3 px-4">
                      <span className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-sm font-semibold">
                        {candidate.number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
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
