import { useState, useEffect } from 'react';
import { supabase, Voter } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Edit, Save, X, Star } from 'lucide-react';

const getFidelityLabel = (score: number) => {
  switch(score) {
    case 1: return 'Eleitor não confiável';
    case 2: return 'Eleitor indeciso';
    case 3: return 'Eleitor interessado';
    case 4: return 'Eleitor favorável';
    case 5: return 'Eleitor praticamente confirmado';
    default: return 'Não avaliado';
  }
};


export default function CadastrarEleitores() {
  const { user } = useAuth();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    neighborhood: '',
    fidelity_score: 3,
    observations: ''
  });

  useEffect(() => {
    loadVoters();
  }, []);

  const loadVoters = async () => {
    const { data, error } = await supabase
      .from('voters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar eleitores:', error);
    } else if (data) {
      setVoters(data as Voter[]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from('voters')
        .update(formData)
        .eq('id', editingId);

      if (error) {
        alert('Erro ao atualizar eleitor');
      } else {
        setEditingId(null);
        resetForm();
        loadVoters();
      }
    } else {
      const { error } = await supabase.from('voters').insert([
        {
          ...formData,
          created_by: user.id,
        },
      ]);

      if (error) {
        alert('Erro ao cadastrar eleitor');
      } else {
        resetForm();
        loadVoters();
      }
    }
    setLoading(false);
  };

  const handleEdit = (voter: Voter) => {
    setEditingId(voter.id);
    setFormData({
      name: voter.name || '',
      phone: voter.phone || '',
      city: voter.city || '',
      neighborhood: voter.neighborhood || '',
      fidelity_score: voter.fidelity_score || 3,
      observations: voter.observations || ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este eleitor?')) return;
    const { error } = await supabase.from('voters').delete().eq('id', id);
    if (!error) loadVoters();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      city: '',
      neighborhood: '',
      fidelity_score: 3,
      observations: ''
    });
    setEditingId(null);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">Cadastrar Eleitores</h1>
        <p className="text-gray-600">Gerencie a base de eleitores de forma simples</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-[#1a3d2a] mb-6">
              {editingId ? 'Editar Eleitor' : 'Novo Eleitor'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  placeholder="Nome do eleitor"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  placeholder="Ex: Curitiba"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bairro</label>
                <input
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  placeholder="Ex: Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nível de Fidelidade
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, fidelity_score: star })}
                        className={`p-1 transition-colors ${
                          formData.fidelity_score >= star ? 'text-yellow-400' : 'text-gray-300'
                        } hover:scale-110`}
                      >
                        <Star 
                          size={32} 
                          fill={formData.fidelity_score >= star ? 'currentColor' : 'none'} 
                          strokeWidth={1.5} 
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-[#45b896] bg-[#def3cd] inline-block px-3 py-1 rounded-full w-max">
                    {getFidelityLabel(formData.fidelity_score)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                <textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  placeholder="Alguma nota sobre este eleitor?"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#4a8b3a] to-[#45b896] text-white py-3 rounded-lg font-semibold hover:shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  {editingId ? <Save size={18} /> : <Plus size={18} />}
                  {loading ? 'Salvando...' : (editingId ? 'Atualizar' : 'Cadastrar')}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <X size={18} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-[#1a3d2a] mb-6">Lista de Eleitores ({voters.length})</h2>
            {voters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Nenhum eleitor cadastrado ainda.</div>
            ) : (
              <div className="space-y-3">
                {voters.map((voter) => (
                  <div key={voter.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-[#1a3d2a]">{voter.name}</h3>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><span className="text-gray-500 block">Telefone:</span><p className="font-semibold">{voter.phone || '-'}</p></div>
                          <div><span className="text-gray-500 block">Cidade:</span><p className="font-semibold">{voter.city || '-'}</p></div>
                          <div className="col-span-2">
                            <span className="text-gray-500 block mb-1">Fidelidade:</span>
                            <div className="flex flex-col gap-1">
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star} 
                                    size={16} 
                                    className={voter.fidelity_score >= star ? 'text-yellow-400' : 'text-gray-300'} 
                                    fill={voter.fidelity_score >= star ? 'currentColor' : 'none'} 
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-semibold text-gray-500">
                                {getFidelityLabel(voter.fidelity_score)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button onClick={() => handleEdit(voter)} className="p-2 text-[#45b896] hover:bg-[#def3cd] rounded-lg transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(voter.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
