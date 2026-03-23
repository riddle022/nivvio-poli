import { useState, useEffect } from 'react';
import { supabase, Candidate, Party, Position, City } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

export default function CadastrarCandidatos() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    party_id: '',
    position_id: '',
    city_id: '',
    number: '',
    status: 'Ativo',
  });
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyDesc, setNewPartyDesc] = useState('');

  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionDesc, setNewPositionDesc] = useState('');

  useEffect(() => {
    loadCandidates();
    loadOptions();
  }, []);

  const loadOptions = async () => {
    const [
      { data: partiesData },
      { data: positionsData },
      { data: citiesData }
    ] = await Promise.all([
      supabase.from('parties').select('*').order('name'),
      supabase.from('positions').select('*').order('name'),
      supabase.from('cities').select('*').order('name'),
    ]);

    if (partiesData) setParties(partiesData);
    if (positionsData) setPositions(positionsData);
    if (citiesData) setCities(citiesData);
  };

  const loadCandidates = async () => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*, parties(*), positions(*), cities(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar candidatos:', error);
    } else if (data) {
      setCandidates(data as Candidate[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Sessão expirada. Por favor, faça login novamente.');
      return;
    }
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from('candidates')
        .update(formData)
        .eq('id', editingId);

      if (error) {
        alert('Erro ao atualizar candidato');
        console.error(error);
      } else {
        setEditingId(null);
        resetForm();
        loadCandidates();
      }
    } else {
      const { error } = await supabase.from('candidates').insert([
        {
          name: formData.name,
          party_id: formData.party_id,
          position_id: formData.position_id,
          city_id: formData.city_id,
          number: formData.number,
          status: formData.status,
          created_by: user.id,
        },
      ]);

      if (error) {
        alert('Erro ao cadastrar candidato');
        console.error(error);
      } else {
        resetForm();
        loadCandidates();
      }
    }

    setLoading(false);
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingId(candidate.id);
    setFormData({
      name: candidate.name,
      party_id: candidate.party_id,
      position_id: candidate.position_id,
      city_id: candidate.city_id,
      number: candidate.number,
      status: candidate.status,
    });
  };

  const handleAddParty = () => {
    setIsPartyModalOpen(true);
  };

  const submitNewParty = async () => {
    if (!newPartyName) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('parties')
      .insert([{ name: newPartyName, description: newPartyDesc }])
      .select()
      .single();

    if (error) {
      alert('Erro ao cadastrar partido');
      console.error(error);
    } else {
      setParties([...parties, data as Party]);
      setFormData(prev => ({ ...prev, party_id: data.id }));
      setIsPartyModalOpen(false);
      setNewPartyName('');
      setNewPartyDesc('');
    }
    setLoading(false);
  };

  const handleAddPosition = () => {
    setIsPositionModalOpen(true);
  };

  const submitNewPosition = async () => {
    if (!newPositionName) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('positions')
      .insert([{ name: newPositionName, description: newPositionDesc }])
      .select()
      .single();

    if (error) {
      alert('Erro ao cadastrar cargo');
      console.error(error);
    } else {
      setPositions([...positions, data as Position]);
      setFormData(prev => ({ ...prev, position_id: data.id }));
      setIsPositionModalOpen(false);
      setNewPositionName('');
      setNewPositionDesc('');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este candidato?')) return;

    const { error } = await supabase.from('candidates').delete().eq('id', id);

    if (error) {
      alert('Erro ao excluir candidato');
      console.error(error);
    } else {
      loadCandidates();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      party_id: '',
      position_id: '',
      city_id: '',
      number: '',
      status: 'Ativo',
    });
    setEditingId(null);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">Cadastrar Candidatos</h1>
        <p className="text-gray-600">Gerencie os candidatos da campanha</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-[#1a3d2a] mb-6">
              {editingId ? 'Editar Candidato' : 'Novo Candidato'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partido
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.party_id}
                    onChange={(e) => setFormData({ ...formData, party_id: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {parties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddParty}
                    className="p-2 bg-[#def3cd] text-[#1a3d2a] rounded-lg hover:bg-[#cde4bc] transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cargo
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.position_id}
                    onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddPosition}
                    className="p-2 bg-[#def3cd] text-[#1a3d2a] rounded-lg hover:bg-[#cde4bc] transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade
                </label>
                <select
                  value={formData.city_id}
                  onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                  required
                >
                  <option value="">Selecione...</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                  placeholder="Ex: 13123"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#4a8b3a] to-[#45b896] text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {editingId ? (
                    <>
                      <Save size={18} />
                      {loading ? 'Salvando...' : 'Atualizar'}
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      {loading ? 'Cadastrando...' : 'Cadastrar'}
                    </>
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-[#1a3d2a] mb-6">
              Lista de Candidatos ({candidates.length})
            </h2>

            {candidates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nenhum candidato cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-[#1a3d2a]">{candidate.name}</h3>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Partido:</span>
                            <p className="font-semibold text-[#4a8b3a]">{candidate.parties?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Cargo:</span>
                            <p className="font-semibold">{candidate.positions?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Cidade:</span>
                            <p className="font-semibold">{candidate.cities?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Número:</span>
                            <p className="font-semibold bg-[#def3cd] text-[#1a3d2a] px-2 py-1 rounded inline-block">
                              {candidate.number}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(candidate)}
                          className="p-2 text-[#45b896] hover:bg-[#def3cd] rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(candidate.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Novo Partido */}
      {isPartyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#1a3d2a]">Novo Partido</h3>
              <button onClick={() => setIsPartyModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Partido</label>
                <input
                  type="text"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                  placeholder="Ex: Partido X"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={newPartyDesc}
                  onChange={(e) => setNewPartyDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none min-h-[100px]"
                  placeholder="Descrição do partido (opcional)"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setIsPartyModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitNewParty}
                  disabled={loading || !newPartyName}
                  className="px-4 py-2 bg-gradient-to-r from-[#4a8b3a] to-[#45b896] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Cargo */}
      {isPositionModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#1a3d2a]">Novo Cargo</h3>
              <button onClick={() => setIsPositionModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cargo</label>
                <input
                  type="text"
                  value={newPositionName}
                  onChange={(e) => setNewPositionName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                  placeholder="Ex: Deputado Estadual"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={newPositionDesc}
                  onChange={(e) => setNewPositionDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none min-h-[100px]"
                  placeholder="Descrição do cargo (opcional)"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setIsPositionModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitNewPosition}
                  disabled={loading || !newPositionName}
                  className="px-4 py-2 bg-gradient-to-r from-[#4a8b3a] to-[#45b896] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
