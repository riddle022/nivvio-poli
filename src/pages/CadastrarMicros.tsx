import { useState, useEffect } from 'react';
import { Plus, Globe, Loader2, Pencil, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Region {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  region_id: string;
}

interface Micro {
  id: string;
  name: string;
  email: string;
  phone: string;
  baseCity: string;
  region: string;
}

export default function CadastrarMicros() {
  const { profile } = useAuth();
  const [micros, setMicros] = useState<Micro[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    baseCity: '',
    region: '',
  });

  useEffect(() => {
    loadData();
    loadMicros();
  }, [profile]);

  const loadData = async () => {
    try {
      setDataLoading(true);
      const { data: regionsData } = await supabase.from('regions').select('*').order('name');
      const { data: citiesData } = await supabase.from('cities').select('*').order('name');

      setAllRegions(regionsData || []);
      setAllCities(citiesData || []);

      // Si es coordinador, forzamos su región
      if (profile?.role === 'coordinator' && profile.region_id) {
          const coordinatorRegion = regionsData?.find(r => r.id === profile.region_id);
          if (coordinatorRegion) {
              setFormData(prev => ({ ...prev, region: coordinatorRegion.name }));
          }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const loadMicros = async () => {
    if (!profile) return;
    try {
        let query = supabase.from('profiles').select('*').eq('role', 'micro');
        
        // El coordinador solo ve sus propios micros
        if (profile.role === 'coordinator') {
            query = query.eq('supervisor_id', profile.id);
        }

        const { data } = await query.order('full_name');
        if (data) {
            setMicros(data.map(m => {
                const regionObj = allRegions.find(r => r.id === m.region_id);
                const cityObj = allCities.find(c => c.id === m.city_id);
                return {
                    id: m.id,
                    name: m.full_name || '',
                    email: m.username || '',
                    phone: m.phone || '',
                    baseCity: cityObj?.name || '',
                    region: regionObj?.name || '', 
                };
            }));
        }
    } catch (error) {
        console.error('Erro ao carregar micros:', error);
    }
  };

  const handleEdit = (m: Micro) => {
    setEditingId(m.id);
    setFormData({
        name: m.name,
        email: m.email,
        password: '', // Senha no se muestra
        phone: m.phone,
        baseCity: m.baseCity,
        region: m.region,
    });
    // Si la región es fija para el coordinador, se mantiene
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este Micro?')) return;
    try {
        setLoading(true);
        // Intentamos llamar a una función edge para borrar el usuario de Auth si existe
        // Por ahora, simplemente desactivamos o eliminamos de profiles
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        
        alert('Micro excluído com sucesso!');
        loadMicros();
    } catch (error: any) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao excluir: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  const currentCities = formData.region 
    ? allCities.filter(c => c.region_id === allRegions.find(r => r.name === formData.region)?.id) 
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedCityObj = allCities.find(c => c.name === formData.baseCity);
      const selectedRegionObj = allRegions.find(r => r.name === formData.region);

      if (editingId) {
        // Actualizar perfil existente
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.name,
            phone: formData.phone,
            region_id: selectedRegionObj?.id,
            city_id: selectedCityObj?.id,
          })
          .eq('id', editingId);

        if (error) throw error;
        alert('Micro atualizado com sucesso!');
      } else {
        // Crear nuevo usuario vía Edge Function
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            full_name: formData.name,
            phone: formData.phone,
            role: 'micro', 
            region_id: selectedRegionObj?.id,
            city_id: selectedCityObj?.id,
            supervisor_id: profile?.id, 
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        alert('Micro cadastrado com sucesso!');
      }

      loadMicros();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao processar:', error);
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      baseCity: '',
      region: profile?.role === 'coordinator' ? formData.region : '',
    });
  };

  if (dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-[#45b896] animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Carregando dados da base...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">Cadastrar Micros</h1>
        <p className="text-gray-600">Gerencie os agentes de campo (Micros)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-[#1a3d2a] mb-6">
                {editingId ? 'Editar Micro' : 'Novo Micro'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!editingId} // No permitimos cambiar email aquí por seguridad (sería otra lógica)
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none disabled:bg-gray-50"
                    required
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                      required
                      placeholder="******"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Região</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  disabled={profile?.role === 'coordinator'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] bg-gray-100 disabled:opacity-75 outline-none"
                  required
                >
                  <option value="">Selecione una região...</option>
                  {allRegions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade Base</label>
                <select
                  value={formData.baseCity}
                  onChange={(e) => setFormData({ ...formData, baseCity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  required
                >
                  <option value="">Selecione a cidade base...</option>
                  {currentCities.map(city => <option key={city.id} value={city.name}>{city.name}</option>)}
                </select>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#1a3d2a] to-[#4a8b3a] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transform transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (editingId ? <Save size={18} /> : <Plus size={18} />)}
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
                {editingId && (
                    <button
                        type="button"
                        onClick={resetForm}
                        className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                        <X size={20} />
                    </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-[#1a3d2a] mb-6 flex items-center gap-2">
                    <Globe size={20} className="text-[#45b896]" />
                    Micros Gerenciados ({micros.length})
                </h2>
                <div className="grid grid-cols-1 gap-4">
                    {micros.map(m => (
                        <div key={m.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#def3cd] rounded-full flex items-center justify-center font-bold text-[#1a3d2a]">
                                    {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#1a3d2a]">{m.name}</h3>
                                    <p className="text-sm text-gray-500">{m.email}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                        {m.region} • {m.baseCity}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="hidden md:inline bg-[#f0f9eb] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-semibold">
                                    {m.phone}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleEdit(m)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(m.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {micros.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum micro cadastrado.</p>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
