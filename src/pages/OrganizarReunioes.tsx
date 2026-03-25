import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Video, 
  Clock, 
  Plus, 
  X, 
  Trash2, 
  Link as LinkIcon, 
  Search, 
  AlignLeft, 
  CheckCircle2, 
  Info 
} from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location_type: 'online' | 'presencial';
  location_address: string;
  audience_type: 'region' | 'city' | 'specific';
  region_id?: string;
  city_id?: string;
  micro_id?: string;
  status: 'agendada' | 'realizada' | 'cancelada';
  created_at: string;
  // relations
  cities?: { name: string };
  regions?: { name: string };
  profiles?: { full_name: string };
}

interface Option {
  id: string;
  name: string;
}

export default function OrganizarReunioes() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown data
  const [cities, setCities] = useState<Option[]>([]);
  const [micros, setMicros] = useState<Option[]>([]);
  const [userRegion, setUserRegion] = useState<Option | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location_type: 'online' as 'online' | 'presencial',
    location_address: '',
    audience_type: 'region' as 'region' | 'city' | 'specific',
    audience_id: '' // Guardará o ID dependendo do audience_type
  });

  useEffect(() => {
    if (profile?.id) {
      loadInitialData();
    }
  }, [profile]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Identificar a região do coordenador
      const regionName = profile?.region_name;
      let regionId = null;
      let regionOpt = null;

      if (regionName) {
        const { data: regionData } = await supabase
          .from('regions')
          .select('id, name')
          .eq('name', regionName)
          .single();

        if (regionData) {
          regionId = regionData.id;
          regionOpt = regionData;
          setUserRegion(regionData);
        }
      }

      const promises = [
        supabase.from('campaign_meetings').select('*, cities:city_id(name), regions:region_id(name), profiles:micro_id(full_name)').eq('created_by', profile?.id).order('date', { ascending: true }),
        supabase.from('profiles').select('id, full_name').eq('supervisor_id', profile?.id)
      ];

      if (regionId) {
        promises.push(supabase.from('cities').select('id, name').eq('region_id', regionId));
      }

      const results = await Promise.all(promises);
      
      const { data: meetingsData } = results[0];
      const { data: microsData } = results[1];
      const { data: citiesData } = regionId ? results[2] : { data: null };

      if (meetingsData) setMeetings(meetingsData as Meeting[]);
      if (microsData) setMicros(microsData.map(m => ({ id: m.id, name: m.full_name || 'Agente sem nome' })));
      if (citiesData) setCities(citiesData as Option[]);
      
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location_type: 'online',
      location_address: '',
      audience_type: 'region',
      audience_id: userRegion?.id || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dbPayload: any = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time + ':00',
        location_type: formData.location_type,
        location_address: formData.location_address,
        audience_type: formData.audience_type,
        created_by: profile?.id,
        status: 'agendada'
      };

      if (formData.audience_type === 'region') dbPayload.region_id = userRegion?.id;
      if (formData.audience_type === 'city') dbPayload.city_id = formData.audience_id;
      if (formData.audience_type === 'specific') dbPayload.micro_id = formData.audience_id;

      const { error } = await supabase.from('campaign_meetings').insert(dbPayload);

      if (error) throw error;
      
      setIsModalOpen(false);
      loadInitialData();
    } catch (error) {
      console.error('Erro ao agendar reunião:', error);
      alert('Erro ao agendar reunião. Verifique as configurações de banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja cancelar e excluir esta reunião permanentemente?')) return;
    setLoading(true);
    await supabase.from('campaign_meetings').delete().eq('id', id);
    loadInitialData();
    setLoading(false);
  };

  const handleMarkCompleted = async (id: string, currentStatus: string) => {
    setLoading(true);
    await supabase.from('campaign_meetings').update({ status: currentStatus === 'agendada' ? 'realizada' : 'agendada' }).eq('id', id);
    loadInitialData();
    setLoading(false);
  }

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAudienceDisplay = (meeting: Meeting) => {
    if (meeting.audience_type === 'region') return <span className="bg-[#def3cd] text-[#1a3d2a] px-2 py-1 rounded-md text-xs font-bold uppercase">Toda a Região ({meeting.regions?.name})</span>;
    if (meeting.audience_type === 'city') return <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md text-xs font-bold uppercase">Cidade de {meeting.cities?.name}</span>;
    if (meeting.audience_type === 'specific') return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-xs font-bold uppercase">Apenas {meeting.profiles?.full_name}</span>;
    return null;
  };

  return (
    <div className="p-4 md:p-6 lg:ml-0 pb-20 lg:pb-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              Gestão de Equipes
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#1a3d2a] flex items-center gap-3">
            <Calendar className="text-[#45b896]" size={36} />
            Reuniões Estratégicas
          </h1>
          <p className="text-gray-600 mt-1 max-w-xl">Agende alinhamentos e treinamentos com sua base de cabos eleitorais ('micros'). Notifique, planeje e alcance suas metas.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#45b896]" size={18} />
            <input 
              type="text" 
              placeholder="Buscar pauta..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#45b896] focus:border-transparent transition-all outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={handleOpenModal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1a3d2a] to-[#45b896] text-white rounded-xl hover:shadow-lg transition-all font-bold whitespace-nowrap shadow-sm hover:scale-105"
          >
            <Plus size={20} /> Agendar
          </button>
        </div>
      </div>

      {/* DASHBOARD CENTRAL DE REUNIÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Painel Histórico */}
        <div className="lg:col-span-4 space-y-4">
          
          {filteredMeetings.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-dashed border-gray-200 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <Calendar size={32} className="text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-600">Sua agenda está vazia</h3>
              <p className="text-sm text-gray-400 mt-2 max-w-sm">Use reuniões para treinar seus articuladores e coordenar a distribuição de materiais nos bairros e cidades.</p>
              <button 
                onClick={handleOpenModal}
                className="mt-6 px-6 py-2 border-2 border-[#1a3d2a] text-[#1a3d2a] font-bold rounded-xl hover:bg-[#1a3d2a] hover:text-white transition-colors"
              >
                Agendar Primeira Reunião
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredMeetings.map((meeting) => {
                const isPast = new Date(`${meeting.date}T${meeting.time}`) < new Date();
                const isCompleted = meeting.status === 'realizada';
                const opacity = (isPast || isCompleted) ? 'opacity-70 grayscale-[30%]' : 'opacity-100 hover:shadow-xl hover:-translate-y-1';

                return (
                  <div key={meeting.id} className={`bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 transition-all duration-300 group ${opacity} relative`}>
                    
                    {isCompleted && (
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-green-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md">
                        <CheckCircle2 size={12} /> Realizada
                      </div>
                    )}
                    
                    {/* Header Card */}
                    <div className="p-6 bg-gradient-to-br from-[#1a3d2a] to-[#2d5c41] text-white">
                      <div className="text-xs font-bold text-[#def3cd] mb-2 uppercase tracking-widest">{new Date(meeting.date).toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
                      <h3 className="text-xl font-black mb-1 line-clamp-1">{meeting.title}</h3>
                      <div className="flex items-center gap-3 text-[#9ed689] text-sm font-semibold">
                        <div className="flex items-center gap-1"><Calendar size={14} /> {new Date(meeting.date).toLocaleDateString()}</div>
                        <div className="flex items-center gap-1"><Clock size={14} /> {meeting.time.substring(0, 5)}</div>
                      </div>
                    </div>

                    {/* Body Card */}
                    <div className="p-6 space-y-4">
                      <div>
                        {getAudienceDisplay(meeting)}
                      </div>

                      <div className="flex items-start gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="mt-0.5">
                          {meeting.location_type === 'online' ? <Video size={18} className="text-blue-500" /> : <MapPin size={18} className="text-[#45b896]" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-gray-400 uppercase">{meeting.location_type === 'online' ? 'Plataforma / Link' : 'Endereço Local'}</p>
                          <p className="text-sm font-medium text-[#1a3d2a] truncate w-full" title={meeting.location_address}>
                            {meeting.location_address}
                          </p>
                        </div>
                      </div>

                      {meeting.description && (
                        <div className="flex items-start gap-3 text-gray-600">
                          <AlignLeft size={18} className="text-gray-400 mt-1 shrink-0" />
                          <p className="text-sm line-clamp-2 text-gray-500">{meeting.description}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Footer Action */}
                    <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                      <button 
                        onClick={() => handleMarkCompleted(meeting.id, meeting.status)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${isCompleted ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' : 'bg-[#e2f0d9] text-[#1a3d2a] hover:bg-[#cde4bc]'}`}
                      >
                         <CheckCircle2 size={14} /> {isCompleted ? 'Desmarcar' : 'Marcar Concluída'}
                      </button>

                      <button 
                        onClick={() => handleDelete(meeting.id)}
                        className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Cancelar Reunião"
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE AGENDAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1a3d2a]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
            <div className="p-6 bg-gradient-to-br from-[#1a3d2a] to-[#4a8b3a] text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl"><Calendar size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold">Agendar Reunião</h3>
                  <p className="text-white/70 text-sm">Convocar bases políticas e lideranças</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Quem participará? */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold text-[#1a3d2a] uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Users size={16} className="text-[#45b896]" /> Público Alvo (Convidados)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {(['region', 'city', 'specific'] as const).map(type => (
                    <label key={type} className={`cursor-pointer border p-3 rounded-xl flex items-center gap-2 transition-all ${formData.audience_type === type ? 'border-[#45b896] bg-[#def3cd]/30 shadow-sm' : 'border-gray-200 bg-white hover:border-[#45b896]/50'}`}>
                      <input 
                        type="radio" 
                        name="audience" 
                        value={type}
                        checked={formData.audience_type === type}
                        onChange={() => setFormData({...formData, audience_type: type, audience_id: ''})}
                        className="text-[#45b896] focus:ring-[#45b896]"
                      />
                      <span className="text-sm font-bold text-gray-700">
                        {type === 'region' && 'Toda Região'}
                        {type === 'city' && 'Por Cidade'}
                        {type === 'specific' && 'Agente Específico'}
                      </span>
                    </label>
                  ))}
                </div>

                {formData.audience_type === 'city' && (
                  <select 
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-semibold text-gray-700 shadow-sm"
                    required
                    value={formData.audience_id}
                    onChange={(e) => setFormData({...formData, audience_id: e.target.value})}
                  >
                    <option value="">Selecione o município...</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}

                {formData.audience_type === 'specific' && (
                  <select 
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-semibold text-gray-700 shadow-sm"
                    required
                    value={formData.audience_id}
                    onChange={(e) => setFormData({...formData, audience_id: e.target.value})}
                  >
                    <option value="">Selecione o coordenador micro...</option>
                    {micros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
                
                {formData.audience_type === 'region' && (
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-1 bg-white p-2 rounded-lg border border-gray-100">
                     <Info size={14} className="text-blue-400" /> Todos os articuladores da sua zona receberão pauta desta reunião
                  </div>
                )}
              </div>

              {/* Informações da Pauta */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Assunto / Título</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Treinamento de abordagem Porta a Porta"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-bold text-gray-800 shadow-sm"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Data</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-semibold text-gray-700 shadow-sm"
                      required
                      value={formData.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Hora</label>
                    <input 
                      type="time" 
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-semibold text-gray-700 shadow-sm"
                      required
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-4 mb-2 ml-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Formato da Reunião</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 text-sm font-semibold cursor-pointer">
                        <input type="radio" checked={formData.location_type === 'presencial'} onChange={() => setFormData({...formData, location_type: 'presencial', location_address: ''})} className="text-[#45b896]" /> Presencial
                      </label>
                      <label className="flex items-center gap-1 text-sm font-semibold cursor-pointer">
                        <input type="radio" checked={formData.location_type === 'online'} onChange={() => setFormData({...formData, location_type: 'online', location_address: ''})} className="text-[#45b896]" /> Online
                      </label>
                    </div>
                  </div>
                  
                  <div className="relative">
                    {formData.location_type === 'online' ? <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /> : <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />}
                    <input 
                      type={formData.location_type === 'online' ? "url" : "text"}
                      placeholder={formData.location_type === 'online' ? "https://meet.google.com/abc-xyz" : "Rua das Flores, 123 - Centro, Sala 4"}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-medium text-gray-700 shadow-sm"
                      required
                      value={formData.location_address}
                      onChange={(e) => setFormData({...formData, location_address: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block">Pauta / Observações (Opcional)</label>
                  <textarea 
                    placeholder="Descreva a pauta da reunião ou os itens que devem ser trazidos..."
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-medium text-gray-700 shadow-sm h-28 resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="w-1/3 py-4 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-all text-sm uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-gradient-to-r from-[#1a3d2a] to-[#4a8b3a] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#1a3d2a]/20 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 transition-all active:scale-95"
                >
                  {loading ? 'Processando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
