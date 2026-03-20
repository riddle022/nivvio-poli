import { useState, useEffect } from 'react';
import { Plus, Globe, Loader2 } from 'lucide-react';
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

        const { data } = await query;
        if (data) {
            setMicros(data.map(m => ({
                id: m.id,
                name: m.full_name || '',
                email: m.username || '',
                phone: m.phone || '',
                baseCity: '', // Se podría buscar el nombre si fuera necesario
                region: '', 
            })));
        }
    } catch (error) {
        console.error('Erro ao carregar micros:', error);
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

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          role: 'micro', 
          region_id: selectedRegionObj?.id,
          city_id: selectedCityObj?.id,
          supervisor_id: profile?.id, // El supervisor es el actual coordinador
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      alert('Micro cadastrado com sucesso!');
      loadMicros(); // Recargar lista
      resetForm();
    } catch (error: any) {
      console.error('Erro ao cadastrar:', error);
      alert('Erro ao cadastrar micro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
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
            <h2 className="text-xl font-bold text-[#1a3d2a] mb-6">Novo Micro</h2>

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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                    required
                  />
                </div>
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

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#1a3d2a] to-[#4a8b3a] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transform transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Plus size={18} />}
                  Cadastrar Micro
                </button>
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
                        <div key={m.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#def3cd] rounded-full flex items-center justify-center font-bold text-[#1a3d2a]">
                                    {m.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-[#1a3d2a]">{m.name}</h3>
                                    <p className="text-sm text-gray-500">{m.email}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <span className="bg-[#f0f9eb] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-semibold">
                                    {m.phone}
                                </span>
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
