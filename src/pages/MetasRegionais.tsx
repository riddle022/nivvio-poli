import { useState, useEffect } from 'react';
import { supabase, Candidate, CampaignGoal } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Target, TrendingUp, Users, X, MapPin, Search } from 'lucide-react';

export default function MetasRegionais() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cities, setCities] = useState<{ id: string, name: string, votantes?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [goals, setGoals] = useState<CampaignGoal[]>([]);
  const [votersCounts, setVotersCounts] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    target_votes: '',
    city_id: '',
    candidate_id: '',
    deadline: ''
  });

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile?.region_name || profile?.region) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Identificar a região do coordenador
      const regionName = profile?.region_name || profile?.region;
      
      const { data: regionData } = await supabase
        .from('regions')
        .select('id')
        .eq('name', regionName)
        .single();

      if (!regionData) {
        console.warn('Região do coordenador não encontrada:', regionName);
        setLoading(false);
        return;
      }

      const [
        { data: candidatesData },
        { data: citiesData },
        { data: goalsData },
        { data: votersData }
      ] = await Promise.all([
        supabase.from('candidates').select('*, parties(*), positions(*), states(*)'),
        supabase.from('cities').select('*').eq('region_id', regionData.id),
        supabase.from('campaign_goals').select('*, candidates(*), cities:city_id(*)')
          .not('city_id', 'is', null),
        supabase.from('voters').select('id, city')
      ]);

      if (candidatesData) setCandidates(candidatesData);
      if (citiesData) setCities(citiesData);
      if (goalsData) setGoals(goalsData as any[]);
      
      // Contagem de eleitores por cidade para progresso real
      if (votersData) {
        const counts: Record<string, number> = {};
        votersData.forEach(v => {
          counts[v.city] = (counts[v.city] || 0) + 1;
        });
        setVotersCounts(counts);
      }

    } catch (error) {
      console.error('Erro ao buscar dados de metas:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (candidate: Candidate | null) => {
    setSelectedCandidate(candidate);
    setFormData({
      target_votes: '',
      city_id: '',
      candidate_id: candidate?.id || '',
      deadline: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const candId = formData.candidate_id || selectedCandidate?.id;
    if (!candId || !formData.city_id) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('campaign_goals').insert({
        candidate_id: candId,
        city_id: formData.city_id,
        target_votes: parseInt(formData.target_votes),
        deadline: formData.deadline || null,
        created_by: profile?.id
      });

      if (error) throw error;
      
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      alert('Erro ao salvar meta. Verifique se já existe uma meta para esta cidade.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Deseja excluir esta meta?')) return;
    setLoading(true);
    await supabase.from('campaign_goals').delete().eq('id', id);
    loadData();
    setLoading(false);
  };

  const filteredCandidates = candidates.filter(candidate => 
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:ml-0 pb-20 lg:pb-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              Gestão Regional
            </span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-[#45b896] text-xs font-bold uppercase tracking-widest">{profile?.region_name}</span>
          </div>
          <h1 className="text-3xl font-black text-[#1a3d2a] flex items-center gap-3">
            <Target className="text-[#45b896]" size={36} />
            Metas Municipais
          </h1>
          <p className="text-gray-600 mt-1 max-w-md">Estipule objetivos de votação para cada município da sua região e acompanhe o progresso em tempo real.</p>
        </div>
        
        <div className="relative group w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#45b896]" size={18} />
          <input 
            type="text" 
            placeholder="Buscar candidato..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#45b896] focus:border-transparent transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de Candidatos */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#1a3d2a] flex items-center gap-2">
          <Users size={20} /> Candidatos e Suas Metas Municipais
        </h2>

        {filteredCandidates.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow border border-dashed">
            {candidates.length > 0 ? 'Nenhum candidato encontrado com a busca.' : 'Nenhum candidato cadastrado para atribuir metas.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredCandidates.map((cand) => (
              <div key={cand.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-gray-100 shadow-sm flex-shrink-0">
                      {cand.photo_url ? (
                        <img src={cand.photo_url} alt={cand.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#1a3d2a] font-bold text-xl">
                          {cand.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#1a3d2a]">{cand.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs bg-[#def3cd] text-[#1a3d2a] px-2 py-1 rounded-full font-semibold uppercase tracking-wider">
                          {(cand as any).parties?.name || 'Sem Partido'}
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-semibold uppercase tracking-wider">
                          {(cand as any).positions?.name || 'Sem Cargo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openModal(cand)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#def3cd] text-[#1a3d2a] rounded-lg hover:bg-[#cde4bc] transition-colors text-sm font-semibold"
                    >
                      <Target size={16} /> Nova Meta Municipal
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mt-2">
                    <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <MapPin size={16} className="text-[#45b896]" />
                      Detalhamento por Município
                    </h4>

                    {goals.filter(g => g.candidate_id === cand.id && g.city_id).length === 0 ? (
                      <p className="text-xs text-gray-400 font-medium italic p-4 bg-gray-50 rounded-xl border border-dashed">
                        Nenhuma meta municipal definida para este candidato na sua região.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50/80">
                            <tr>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b">Município</th>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b text-right">Meta (Votos)</th>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b text-center">Progresso</th>
                              <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest border-b text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {goals.filter(g => g.candidate_id === cand.id && g.city_id).map(cityGoal => {
                               const cityName = cityGoal.cities?.name || 'Desconhecido';
                               const currentVoters = votersCounts[cityName] || 0;
                               const progress = Math.min(100, Math.round((currentVoters / cityGoal.target_votes) * 100));
                               
                               return (
                                <tr key={cityGoal.id} className="hover:bg-gray-50/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <h5 className="font-bold text-[#1a3d2a] flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-[#45b896]"></div>
                                      {cityName}
                                    </h5>
                                    {cityGoal.deadline && (
                                      <p className="text-[10px] text-gray-400 font-semibold ml-4">
                                        Vence em: {new Date(cityGoal.deadline).toLocaleDateString()}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-lg font-black text-[#45b896]">{cityGoal.target_votes.toLocaleString()} votos</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col items-center justify-center gap-1 w-full max-w-[150px] mx-auto">
                                      <span className="text-xs font-bold text-[#1a3d2a]">{progress}%</span>
                                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-[#1a3d2a] to-[#45b896] rounded-full"
                                          style={{ width: `${progress}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => handleDeleteGoal(cityGoal.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Excluir meta"
                                    >
                                      <X size={16} />
                                    </button>
                                  </td>
                                </tr>
                               )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Nova Meta */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1a3d2a]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-br from-[#1a3d2a] to-[#4a8b3a] text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Definir Meta Municipal</h3>
                <p className="text-white/70 text-sm">Candidato: {selectedCandidate?.name}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Município para atuar</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all"
                  required
                  value={formData.city_id}
                  onChange={(e) => setFormData({...formData, city_id: e.target.value})}
                >
                  <option value="">Selecione a cidade</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Meta de Votos Captados</label>
                <div className="relative">
                  <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-[#45b896]" size={20} />
                  <input 
                    type="number" 
                    placeholder="Ex: 500"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-bold text-gray-700"
                    required
                    value={formData.target_votes}
                    onChange={(e) => setFormData({...formData, target_votes: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Prazo para conclusão</label>
                <input 
                  type="date"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-bold text-gray-700"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#1a3d2a] to-[#4a8b3a] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-[#1a3d2a]/20 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 transition-all active:scale-95"
              >
                {loading ? 'Salvando...' : 'Confirmar Meta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
