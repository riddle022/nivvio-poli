import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X, Phone, MapPin, Map, Globe, Users, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Region {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  region_id: string;
}

interface Coordinator {
  id: string;
  name: string;
  email?: string;
  phone: string;
  baseCity: string;
  region: string;
  cities: string[];
}

export default function CadastrarCoordenador() {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [allCities, setAllCities] = useState<City[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    baseCity: '',
    region: '',
    cities: [] as string[],
  });

  useEffect(() => {
    loadData();
    loadCoordinators();
  }, []);

  const loadData = async () => {
    try {
      setDataLoading(true);
      console.log('Iniciando carga de datos de Supabase...');
      
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .order('name');
        
      const { data: citiesData, error: citiesError } = await supabase
        .from('cities')
        .select('*')
        .order('name');

      if (regionsError) {
        console.error('Error cargando regiones:', regionsError);
        throw regionsError;
      }
      if (citiesError) {
        console.error('Error cargando ciudades:', citiesError);
        throw citiesError;
      }

      console.log('Datos cargados:', { regions: regionsData?.length, cities: citiesData?.length });
      setAllRegions(regionsData || []);
      setAllCities(citiesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar regiões e cidades. Verifique a conexão.');
    } finally {
      setDataLoading(false);
    }
  };

  const loadCoordinators = async () => {
    try {
      console.log('Buscando coordenadores na base...');
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          username,
          phone,
          region_id,
          city_id,
          regions (name),
          cities (name)
        `)
        .eq('role', 'coordinator');

      if (error) throw error;

      if (data) {
        setCoordinators(data.map(m => ({
          id: m.id,
          name: m.full_name || '',
          email: m.username || '',
          phone: m.phone || '',
          baseCity: (m as any).cities?.name || '',
          region: (m as any).regions?.name || '',
          cities: [], 
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadores:', error);
    }
  };

  const handleRegionChange = (regionName: string) => {
    setFormData(prev => ({
      ...prev,
      region: regionName,
      cities: [] // Limpiar ciudades al cambiar de región
    }));
  };

  // Get selected region object
  const selectedRegion = allRegions.find(r => r.name === formData.region);
  
  // Filter cities by the selected region's ID
  const currentCities = selectedRegion 
    ? allCities.filter(c => c.region_id === selectedRegion.id) 
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedCityObj = allCities.find(c => c.name === formData.baseCity);
      const selectedRegionObj = allRegions.find(r => r.name === formData.region);

      // If editing, we might want a different function or update logic
      if (editingId) {
        // This part is not covered by the instruction, but for a real app,
        // you'd have an update function here.
        // For now, we'll just update the local state as before for editing.
        setCoordinators(prev =>
          prev.map(c => (c.id === editingId ? { ...formData, id: editingId } : c))
        );
        alert('Coordenador atualizado com sucesso localmente!');
      } else {
        // Create new coordinator
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          role: 'coordinator',
          region_id: selectedRegionObj?.id,
          city_id: selectedCityObj?.id,
          managed_cities_ids: formData.cities.map(name => 
            allCities.find(c => c.name === name)?.id
          ).filter(id => id), // Filtra los IDs válidos
        }
      });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        alert('Coordenador cadastrado com sucesso!');
        loadCoordinators(); // Recargar lista real de la base de datos
      }
      
      resetForm();
    } catch (error: any) {
      console.error('Erro ao cadastrar/atualizar:', error);
      alert('Erro ao cadastrar/atualizar coordenador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coordinator: Coordinator) => {
    setEditingId(coordinator.id);
    setFormData({
      name: coordinator.name,
      email: coordinator.email || '', 
      password: '', 
      phone: coordinator.phone,
      baseCity: coordinator.baseCity,
      region: coordinator.region,
      cities: coordinator.cities,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este coordenador?')) return;
    setCoordinators(prev => prev.filter(c => c.id !== id));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      baseCity: '',
      region: '',
      cities: [],
    });
    setEditingId(null);
  };

  const toggleCity = (city: string) => {
    setFormData(prev => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter(c => c !== city)
        : [...prev.cities, city]
    }));
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
        <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">Cadastrar Coordenador</h1>
        <p className="text-gray-600">Gerencie os coordenadores regionais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
            <h2 className="text-xl font-bold text-[#1a3d2a] mb-6">
              {editingId ? 'Editar Coordenador' : 'Novo Coordenador'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Plus size={16} className="invisible" /> {/* spacing */}
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                    placeholder="Nome do coordenador"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha (mín. 6 caracteres)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                    placeholder="******"
                    required={!editingId}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade Base
                </label>
                <select
                  value={formData.baseCity}
                  onChange={(e) => setFormData({ ...formData, baseCity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none transition-all"
                  required
                >
                  <option value="">Selecione a cidade base...</option>
                  {allCities.map(city => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Região
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none transition-all"
                  required
                >
                  <option value="">Selecione una região...</option>
                  {allRegions.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              {formData.region && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidades da Região
                  </label>
                  <div className="space-y-3">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          toggleCity(e.target.value);
                          e.target.value = ''; // Reset select
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none transition-all"
                    >
                      <option value="">Adicionar cidade da região...</option>
                      {currentCities.filter(c => !formData.cities.includes(c.name)).map(city => (
                        <option key={city.id} value={city.name}>{city.name}</option>
                      ))}
                    </select>

                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      {formData.cities.map(city => (
                        <span key={city} className="bg-white text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-medium border border-[#def3cd] flex items-center gap-1 group">
                          {city}
                          <button 
                            type="button" 
                            onClick={() => toggleCity(city)}
                            className="text-gray-400 group-hover:text-red-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      {formData.cities.length === 0 && (
                        <span className="text-gray-400 text-xs italic italic py-1">Nenhuma cidade selecionada</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
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
            <h2 className="text-xl font-bold text-[#1a3d2a] mb-6 flex items-center gap-2">
              <Globe size={20} className="text-[#45b896]" />
              Lista de Coordenadores ({coordinators.length})
            </h2>

            {coordinators.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhum coordenador cadastrado ainda.</p>
                <p className="text-sm text-gray-400 mt-1">Os coordenadores que você cadastrar aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coordinators.map((coordinator) => (
                  <div
                    key={coordinator.id}
                    className="group border border-gray-200 rounded-2xl p-5 hover:border-[#45b896] hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-[#def3cd] rounded-full flex items-center justify-center text-[#1a3d2a] font-bold">
                            {coordinator.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-[#1a3d2a]">{coordinator.name}</h3>
                            <p className="text-sm text-[#45b896] font-medium flex items-center gap-1">
                              <Map size={14} /> {coordinator.region}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={16} className="text-[#4a8b3a]" />
                            <span>{coordinator.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin size={16} className="text-[#4a8b3a]" />
                            <span><strong>Base:</strong> {coordinator.baseCity}</span>
                          </div>
                        </div>

                        {coordinator.cities.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {coordinator.cities.map(city => (
                              <span key={city} className="bg-[#f0f9eb] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-medium border border-[#def3cd]">
                                {city}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(coordinator)}
                          className="p-2 text-[#45b896] hover:bg-[#def3cd] rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(coordinator.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
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
    </div>
  );
}
