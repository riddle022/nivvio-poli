import { useState, useEffect } from 'react';
import { supabase, Candidate, State, CampaignGoal } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Target, TrendingUp, Users, X, ChevronRight, MapPin, Pencil, Trash2 } from 'lucide-react';

export default function MetasEleitorais() {
  const {  } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [regions, setRegions] = useState<{ id: string, name: string, votantes_total?: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [goals, setGoals] = useState<CampaignGoal[]>([]);
  const [editingGoal, setEditingGoal] = useState<CampaignGoal | null>(null);

  const [formData, setFormData] = useState({
    target_votes: '',
    state_id: '',
    region_id: '',
    candidate_id: '',
    type: 'state' as 'state' | 'region',
    deadline: ''
  });

  const [filterStateId, setFilterStateId] = useState<string>('');
  const [filterCandidateId, setFilterCandidateId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [
      { data: candidatesData },
      { data: statesData },
      { data: regionsData },
      { data: goalsData },
      { data: citiesData }
    ] = await Promise.all([
      supabase.from('candidates').select('*, parties(*), positions(*), states(*)'),
      supabase.from('states').select('*'),
      supabase.from('regions').select('*'),
      supabase.from('campaign_goals').select('*, candidates(*), regions(*), states(*)'),
      supabase.from('cities').select('region_id, votantes')
    ]);

    if (regionsData && citiesData) {
      const regionVotantes = regionsData.map(r => {
        const sum = (citiesData as any[])
          .filter(c => c.region_id === r.id)
          .reduce((acc, curr) => acc + (Number(curr.votantes) || 0), 0);
        return { ...r, votantes_total: sum };
      });
      setRegions(regionVotantes);
    } else if (regionsData) {
      setRegions(regionsData);
    }

    if (candidatesData) setCandidates(candidatesData);
    if (statesData) setStates(statesData);
    if (goalsData) setGoals(goalsData as any[]);
    setLoading(false);
  };

  // Abrir modal para criar nova meta
  const openModal = (candidate: Candidate | null, type?: 'state' | 'region') => {
    setEditingGoal(null);
    setSelectedCandidate(candidate);
    setFormData({
      target_votes: '',
      state_id: candidate?.state_id || '',
      region_id: '',
      candidate_id: candidate?.id || '',
      type: type || 'state',
      deadline: ''
    });
    setIsModalOpen(true);
  };

  // Abrir modal para editar meta existente
  const openEditModal = (goal: CampaignGoal) => {
    setEditingGoal(goal);
    const cand = candidates.find(c => c.id === goal.candidate_id) || null;
    setSelectedCandidate(cand);
    setFormData({
      target_votes: String(goal.target_votes),
      state_id: goal.state_id || '',
      region_id: goal.region_id || '',
      candidate_id: goal.candidate_id || '',
      type: goal.state_id ? 'state' : 'region',
      deadline: goal.deadline || ''
    });
    setIsModalOpen(true);
  };

  // Confirmar e deletar meta
  const handleDelete = async (goal: CampaignGoal) => {
    const isState = !!goal.state_id;
    const label = isState
      ? `meta estadual "${goal.states?.name}" (${goal.target_votes.toLocaleString()} votos)`
      : `meta regional "${goal.regions?.name}" (${goal.target_votes.toLocaleString()} votos)`;

    if (!confirm(`Tem certeza que deseja excluir a ${label}?`)) return;

    setLoading(true);
    const { error } = await supabase.from('campaign_goals').delete().eq('id', goal.id);
    if (error) {
      alert('Erro ao excluir meta');
      console.error(error);
    } else {
      loadData();
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const candId = formData.candidate_id || selectedCandidate?.id;
    if (!candId) return;
    setLoading(true);

    const newTarget = parseInt(formData.target_votes);

    // Validações
    if (formData.type === 'region') {
      const stateGoal = goals.find(g => g.candidate_id === candId && g.state_id);
      const regionalSum = goals
        .filter(g => g.candidate_id === candId && g.region_id && g.id !== editingGoal?.id)
        .reduce((acc, curr) => acc + (curr.target_votes || 0), 0);

      if (stateGoal && regionalSum + newTarget > stateGoal.target_votes) {
        alert(`Erro: A soma das metas regionais (${(regionalSum + newTarget).toLocaleString()}) não pode ultrapassar a meta estadual (${stateGoal.target_votes.toLocaleString()}). Saldo disponível: ${(stateGoal.target_votes - regionalSum).toLocaleString()} votos.`);
        setLoading(false);
        return;
      }
    }

    if (formData.type === 'state') {
      const regionalSum = goals
        .filter(g => g.candidate_id === candId && g.region_id)
        .reduce((acc, curr) => acc + (curr.target_votes || 0), 0);
      if (regionalSum > newTarget) {
        if (!confirm(`Aviso: A nova meta estadual (${newTarget.toLocaleString()}) é menor que a soma das metas regionais atuais (${regionalSum.toLocaleString()}). Deseja continuar mesmo assim?`)) {
          setLoading(false);
          return;
        }
      }
    }

    const goalData = {
      candidate_id: candId,
      target_votes: newTarget,
      deadline: formData.deadline || null,
      state_id: (formData.type === 'state' && formData.state_id) ? formData.state_id : null,
      region_id: (formData.type === 'region' && formData.region_id) ? formData.region_id : null,
    };

    let error;
    if (editingGoal) {
      ({ error } = await supabase.from('campaign_goals').update(goalData).eq('id', editingGoal.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from('campaign_goals').insert([{ ...goalData, created_by: user?.id }]));
    }

    if (error) {
      alert('Erro ao salvar meta');
      console.error(error);
    } else {
      setIsModalOpen(false);
      loadData();
    }
    setLoading(false);
  };

  return (
    <div className="pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">Gestão de Metas Eleitorais</h1>
          <p className="text-gray-600">Planejamento estratégico e projeção de votos por candidato</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="w-full md:w-64">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Filtrar por Estado</label>
              <select 
                value={filterStateId}
                onChange={(e) => {
                  setFilterStateId(e.target.value);
                  setFilterCandidateId('');
                }}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-semibold"
              >
                <option value="">Todos os Estados</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="w-full md:w-64">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Filtrar por Candidato</label>
              <select 
                value={filterCandidateId}
                onChange={(e) => setFilterCandidateId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-semibold"
              >
                <option value="">Todos os Candidatos</option>
                {candidates
                  .filter(c => !filterStateId || c.state_id === filterStateId)
                  .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                }
              </select>
            </div>
          </div>
          <button 
            onClick={() => openModal(null)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#1a3d2a] to-[#45b896] text-white rounded-xl hover:shadow-lg transition-all font-bold whitespace-nowrap"
          >
            <Plus size={20} /> Cadastrar Meta
          </button>
        </div>
      </div>

      {/* Grid de Candidatos */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[#1a3d2a] flex items-center gap-2">
          <Users size={20} /> Candidatos e Suas Metas
        </h2>

        {candidates
          .filter(c => {
            const matchesState = !filterStateId || c.state_id === filterStateId;
            const matchesCandidate = !filterCandidateId || c.id === filterCandidateId;
            return matchesState && matchesCandidate;
          }).length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 shadow border border-dashed">
            {filterStateId || filterCandidateId 
              ? 'Nenhum candidato encontrado com os filtros selecionados.' 
              : 'Nenhum candidato cadastrado para atribuir metas.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {candidates
              .filter(c => {
                const matchesState = !filterStateId || c.state_id === filterStateId;
                const matchesCandidate = !filterCandidateId || c.id === filterCandidateId;
                return matchesState && matchesCandidate;
              })
              .map((cand) => (
              <div key={cand.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-6 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b">
                  <div>
                    <h3 className="text-xl font-bold text-[#1a3d2a]">{cand.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-xs bg-[#def3cd] text-[#1a3d2a] px-2 py-1 rounded-full font-semibold uppercase tracking-wider">
                        {cand.parties?.name || 'Sem Partido'}
                      </span>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-semibold uppercase tracking-wider">
                        {cand.positions?.name || 'Sem Cargo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openModal(cand)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#def3cd] text-[#1a3d2a] rounded-lg hover:bg-[#cde4bc] transition-colors text-sm font-semibold"
                    >
                      <Plus size={16} /> Nova Meta
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Metas Estaduais */}
                  {goals.filter(g => g.candidate_id === cand.id && g.state_id).map(stateGoal => (
                    <div key={stateGoal.id} className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100 text-blue-600">
                          <Target size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Meta Estadual</p>
                          <h4 className="text-xl font-black text-[#1a3d2a]">{stateGoal.states?.name}</h4>
                          {stateGoal.deadline && (
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                              Prazo: {new Date(stateGoal.deadline).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center md:text-right">
                          <p className="text-xs text-gray-500 font-medium">Objetivo de Votos</p>
                          <p className="text-3xl font-black text-blue-700">{stateGoal.target_votes.toLocaleString()}</p>
                        </div>
                        {/* Ações */}
                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(stateGoal)}
                            title="Editar meta"
                            className="p-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100 shadow-sm transition-all hover:scale-105"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(stateGoal)}
                            title="Excluir meta"
                            className="p-2 bg-white text-red-500 hover:bg-red-50 rounded-lg border border-red-100 shadow-sm transition-all hover:scale-105"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Metas Regionais */}
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <MapPin size={16} className="text-purple-500" /> Detalhamento por Região
                    </h4>
                    
                    {goals.filter(g => g.candidate_id === cand.id && g.region_id).length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm italic border rounded-xl border-dashed">
                        Nenhuma meta regional cadastrada para este candidato.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
                              <th className="px-4 py-3">Região</th>
                              <th className="px-4 py-3">Eleitores (Total)</th>
                              <th className="px-4 py-3">Meta 2026</th>
                              <th className="px-4 py-3">Progresso</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {goals.filter(g => g.candidate_id === cand.id && g.region_id).map(goal => {
                              const regionData = regions.find(r => r.id === goal.region_id);
                              const baseCount = 0; 
                              const progress = goal.target_votes > 0 ? (baseCount / goal.target_votes) * 100 : 0;
                              
                              return (
                                <tr key={goal.id} className="hover:bg-gray-50 transition-colors group">
                                  <td className="px-4 py-4 font-bold text-[#1a3d2a]">{goal.regions?.name}</td>
                                  <td className="px-4 py-4 text-gray-600">
                                    {regionData?.votantes_total?.toLocaleString() || '0'}
                                  </td>
                                  <td className="px-4 py-4 font-black text-gray-700">
                                    {goal.target_votes.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-[#45b896] to-blue-400"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 mt-1 block">
                                      {progress.toFixed(1)}% Atingido
                                    </span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                      progress >= 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {progress >= 100 ? 'CONCLUÍDO' : 'EM PROGRESSO'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => openEditModal(goal)}
                                        title="Editar meta"
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-all hover:scale-110"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(goal)}
                                        title="Excluir meta"
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
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

      {/* Modal Cadastro/Edição de Meta */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#def3cd] text-[#1a3d2a]">
                  {editingGoal ? <Pencil size={20} /> : <Target size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#1a3d2a]">
                    {editingGoal ? 'Editar Meta' : 'Cadastrar Meta'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedCandidate ? `Candidato: ${selectedCandidate.name}` : 'Planejamento Estratégico'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo - desabilitado ao editar */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => !editingGoal && setFormData(prev => ({ ...prev, type: 'state' }))}
                  disabled={!!editingGoal}
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${
                    formData.type === 'state' ? 'bg-white text-[#1a3d2a] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  } ${editingGoal ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  Estadual
                </button>
                <button
                  type="button"
                  onClick={() => !editingGoal && setFormData(prev => ({ ...prev, type: 'region' }))}
                  disabled={!!editingGoal}
                  className={`py-2 text-sm font-bold rounded-lg transition-all ${
                    formData.type === 'region' ? 'bg-white text-[#1a3d2a] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  } ${editingGoal ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  Regional
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidato</label>
                <select 
                  value={formData.candidate_id || selectedCandidate?.id || ''}
                  onChange={(e) => setFormData({ ...formData, candidate_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  required
                  disabled={!!editingGoal}
                >
                  <option value="">Selecione o Candidato...</option>
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'state' ? 'Estado' : 'Região'}
                </label>
                {formData.type === 'state' ? (
                  <select 
                    value={formData.state_id}
                    onChange={(e) => setFormData({ ...formData, state_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                    required
                    disabled={!!editingGoal}
                  >
                    <option value="">Selecione...</option>
                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <select 
                    value={formData.region_id}
                    onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                    required
                    disabled={!!editingGoal}
                  >
                    <option value="">Selecione...</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta de Votos</label>
                <div className="relative">
                  <TrendingUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={formData.target_votes}
                    onChange={(e) => setFormData({ ...formData, target_votes: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                    placeholder="Ex: 50.000"
                    required
                    min="1"
                  />
                </div>
                {formData.type === 'region' && (formData.candidate_id || selectedCandidate?.id) && (
                  <div className="mt-2">
                    {(() => {
                      const candId = formData.candidate_id || selectedCandidate?.id;
                      const stateTarget = goals.find(g => g.candidate_id === candId && g.state_id)?.target_votes || 0;
                      const currentRegSum = goals
                        .filter(g => g.candidate_id === candId && g.region_id && g.id !== editingGoal?.id)
                        .reduce((a, b) => a + b.target_votes, 0);
                      const balance = stateTarget - currentRegSum;
                      
                      if (stateTarget === 0) return <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tighter">* Candidato sem meta estadual definida</p>;
                      return (
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-tighter">
                          <span className={balance < 0 ? 'text-red-500' : 'text-blue-500'}>
                            Saldo para Distribuição: {balance.toLocaleString()}
                          </span>
                          <span className="text-gray-400">Total: {stateTarget.toLocaleString()}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Limite (Opcional)</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none text-gray-700"
                />
              </div>

              <div className="flex gap-2 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-semibold"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-gradient-to-r from-[#1a3d2a] to-[#45b896] text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : editingGoal ? 'Atualizar Meta' : 'Salvar Meta'}
                  {!loading && <ChevronRight size={18} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
