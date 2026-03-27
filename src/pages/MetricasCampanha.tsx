import { useState, useEffect } from 'react';
import { supabase, Voter, Profile, Candidate } from '../lib/supabase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  BarChart3, 
  Map as MapIcon,
  Briefcase,
  Calendar,
  ChevronDown
} from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#4ade80', '#22c55e'];

interface Region {
  id: string;
  name: string;
}

export default function MetricasCampanha() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegions();
    fetchData();
  }, []);

  async function fetchRegions() {
    const { data } = await supabase.from('regions').select('id, name').order('name');
    setRegions(data || []);
  }

  async function fetchData() {
    try {
      setLoading(true);
      const [
        { data: vData },
        { data: pData },
        { data: cData }
      ] = await Promise.all([
        supabase.from('voters').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('candidates').select('*')
      ]);

      setVoters(vData || []);
      setProfiles(pData || []);
      setCandidates(cData || []);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filtrar eleitores pela região selecionada
  const filteredVoters = selectedRegionId === 'all'
    ? voters
    : voters.filter(v => v.region_id === selectedRegionId);

  const selectedRegionName = selectedRegionId === 'all'
    ? 'Todas as Regiões'
    : regions.find(r => r.id === selectedRegionId)?.name || 'Região';

  // Processamento de dados para gráficos (usando filteredVoters)
  
  // 1. Distribuição de Fidelidade (Pizza)
  const fidelityData = [1, 2, 3, 4, 5].map(score => ({
    name: `Nível ${score}`,
    value: filteredVoters.filter(v => v.fidelity_score === score).length
  })).filter(d => d.value > 0);

  // 2. Crescimento Cronológico (Linha) - Agrupado por Data
  const growthData = Object.entries(
    filteredVoters.reduce((acc: any, curr) => {
      const date = new Date(curr.created_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {})
  ).map(([date, count]) => ({ date, count }))
   .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
   .slice(-15); // Últimos 15 dias

  // 3. Desempenho por Cidade (Barra)
  const cityData = Object.entries(
    filteredVoters.reduce((acc: any, curr) => {
      acc[curr.city || 'Outros'] = (acc[curr.city || 'Outros'] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a,b) => b.value - a.value)
   .slice(0, 8); // Top 8 cidades

  // 4. Ranking de Micros (Barra Horizontal)
  const teamRanking = profiles
    .filter(p => p.role === 'micro')
    .map(p => ({
      name: p.full_name,
      voters: filteredVoters.filter(v => v.created_by === p.id).length
    }))
    .sort((a,b) => b.voters - a.voters)
    .slice(0, 5);

  const avgFidelity = filteredVoters.length > 0 
    ? (filteredVoters.reduce((acc, curr) => acc + curr.fidelity_score, 0) / filteredVoters.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#45b896]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:ml-0 pb-20 lg:pb-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3d2a] flex items-center gap-2">
            <BarChart3 className="text-[#45b896]" />
            Métricas de Campanha
          </h1>
          <p className="text-gray-600 text-sm">Análise de desempenho e engajamento eleitoral</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filtro de Região */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 cursor-pointer hover:border-[#45b896] hover:shadow-md transition-all group">
              <MapIcon size={15} className="text-[#45b896] shrink-0" />
              <select
                id="filtro-regiao"
                value={selectedRegionId}
                onChange={e => setSelectedRegionId(e.target.value)}
                className="appearance-none bg-transparent text-sm font-semibold text-[#1a3d2a] cursor-pointer outline-none pr-5 min-w-[160px]"
              >
                <option value="all">Todas as Regiões</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="text-gray-400 absolute right-3 pointer-events-none" />
            </div>
          </div>

          {/* Data de atualização */}
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-500">Dados atualizados em {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Badge de região ativa */}
      {selectedRegionId !== 'all' && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-[#def3cd] text-[#1a3d2a] text-xs font-bold px-3 py-1.5 rounded-full border border-[#45b896]/30">
            <MapIcon size={12} className="text-[#45b896]" />
            Filtrando por: {selectedRegionName}
            <button
              onClick={() => setSelectedRegionId('all')}
              className="ml-1 text-[#1a3d2a]/50 hover:text-[#1a3d2a] transition-colors font-black leading-none"
              title="Remover filtro"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Cards de KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-[#def3cd] p-3 rounded-xl text-[#1a3d2a]">
            <Users size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Eleitores</p>
            <h3 className="text-2xl font-black text-[#1a3d2a]">{filteredVoters.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                < Award size={24} />
            </div>
            <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Fidelidade Média</p>
                <h3 className="text-2xl font-black text-[#1a3d2a]">{avgFidelity} <span className="text-xs text-gray-400">/ 5.0</span></h3>
            </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-[#def3cd] p-3 rounded-xl text-[#45b896]">
                <TrendingUp size={24} />
            </div>
            <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Meta Estadual</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-[#1a3d2a]">12%</h3>
                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#45b896] w-[12%]"></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                <CheckCircle2 size={24} />
            </div>
            <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Conversão</p>
                <h3 className="text-2xl font-black text-[#1a3d2a]">88%</h3>
            </div>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Crescimento Cronológico */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-[#1a3d2a] mb-6 flex items-center gap-2 uppercase tracking-wider">
            <TrendingUp size={16} className="text-[#45b896]" />
            Crescimento da Base (15 dias)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" fontSize={10} tickMargin={10} tick={{fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="count" stroke="#45b896" strokeWidth={3} dot={{ r: 4, fill: '#45b896', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Distribuição de Fidelidade */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-[#1a3d2a] mb-6 flex items-center gap-2 uppercase tracking-wider">
            <Award size={16} className="text-[#45b896]" />
            Distribuição de Fidelidade
          </h3>
          <div className="h-[250px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fidelityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {fidelityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Desempenho Regional (Top Cidades) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-[#1a3d2a] mb-6 flex items-center gap-2 uppercase tracking-wider">
            <MapIcon size={16} className="text-[#45b896]" />
            Volume por Cidade (Top 8)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={10} tickMargin={10} tick={{fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" fill="#1a3d2a" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Performance da Equipe */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-[#1a3d2a] mb-6 flex items-center gap-2 uppercase tracking-wider">
            <Briefcase size={16} className="text-[#45b896]" />
            Produtividade da Equipe (Micro)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={teamRanking}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <YAxis dataKey="name" type="category" width={100} fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="voters" fill="#45b896" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
