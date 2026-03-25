import { useState, useEffect } from 'react';
import { supabase, Voter, Candidate } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Users, 
  MapPin, 
  Search, 
  Loader2, 
  Filter, 
  Layout, 
  Info,
  Building2,
  Calendar,
  Plus,
  Minus,
  Maximize
} from 'lucide-react';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const getFidelityColor = (score: number) => {
    switch(score) {
        case 1: return '#ef4444'; // Vermelho
        case 2: return '#f97316'; // Laranja
        case 3: return '#eab308'; // Amarelo
        case 4: return '#4ade80'; // Verde claro
        case 5: return '#22c55e'; // Verde
        default: return '#94a3b8'; // Cinza
    }
};

const getFidelityLabel = (score: number) => {
    switch(score) {
      case 1: return 'Não confiável';
      case 2: return 'Indeciso';
      case 3: return 'Interessado';
      case 4: return 'Favorável';
      case 5: return 'Confirmado';
      default: return 'Não avaliado';
    }
};

function FixMapSize() {
  const map = useMap();
  useEffect(() => {
    const timer1 = setTimeout(() => map.invalidateSize(), 200);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);
    const timer3 = setTimeout(() => map.invalidateSize(), 1000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [map]);
  return null;
}

function CustomZoomControl({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    return (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <button 
                onClick={() => map.zoomIn()}
                className="bg-white p-2 rounded-xl shadow-lg border border-gray-100 text-[#1a3d2a] hover:bg-gray-50 transition-all active:scale-95"
                title="Ampliar"
            >
                <Plus size={20} />
            </button>
            <button 
                onClick={() => map.zoomOut()}
                className="bg-white p-2 rounded-xl shadow-lg border border-gray-100 text-[#1a3d2a] hover:bg-gray-50 transition-all active:scale-95"
                title="Reduzir"
            >
                <Minus size={20} />
            </button>
            <button 
                onClick={() => map.setView(center, zoom)}
                className="bg-white p-2 rounded-xl shadow-lg border border-gray-100 text-[#45b896] hover:bg-gray-50 transition-all active:scale-95 mt-2"
                title="Centralizar na Região"
            >
                <Maximize size={20} />
            </button>
        </div>
    );
}

export default function MapaRegional() {
  const { profile } = useAuth();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cities, setCities] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterCandidateId, setFilterCandidateId] = useState('');
  const [filterCityId, setFilterCityId] = useState('');
  const [filterFidelity, setFilterFidelity] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Centro inicial: Paraná
  const mapCenter: [number, number] = [-24.8918, -51.5540];
  const mapZoom = 7;

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    try {
      setLoading(true);
      
      let regionId = profile?.region_id;

      if (!regionId && profile?.region_name) {
        // 1. Obter a ID da região do coordenador se tiver apenas no nome
        const { data: regionData } = await supabase
          .from('regions')
          .select('id')
          .eq('name', profile.region_name)
          .maybeSingle();
        
        regionId = regionData?.id;
      }

      // 2. Buscar dados (voters já são filtrados pelo RLS para serem apenas os da região deste coordenador)
      const promises = [
        supabase.from('voters').select('*'),
        supabase.from('candidates').select('*')
      ];

      if (regionId) {
        promises.push(supabase.from('cities').select('*').eq('region_id', regionId));
      } else {
        promises.push(Promise.resolve({ data: [] as any }));
      }

      const [
        { data: vData },
        { data: candData },
        { data: cityData }
      ] = await Promise.all(promises);

      setVoters(vData || []);
      setCandidates(candData || []);
      setCities((cityData as any) || []);
    } catch (error) {
      console.error('Erro ao buscar dados do mapa regional:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredVoters = voters.filter(v => {
    const lat = v.latitude ? Number(v.latitude) : null;
    const lng = v.longitude ? Number(v.longitude) : null;

    if (!lat || !lng) return false;

    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCandidate = !filterCandidateId || true; 
    const matchesCity = !filterCityId || v.city === cities.find(c => c.id === filterCityId)?.name;
    const matchesFidelity = filterFidelity === '' || v.fidelity_score === filterFidelity;

    return matchesSearch && matchesCandidate && matchesCity && matchesFidelity;
  });

  return (
    <div className="p-4 md:p-6 lg:ml-0 pb-20 lg:pb-6 flex flex-col h-[calc(100vh-80px)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header e Filtros */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              Visão Tática
            </span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-[#45b896] text-xs font-bold uppercase tracking-widest">{profile?.region_name}</span>
          </div>
          <h1 className="text-3xl font-black text-[#1a3d2a] flex items-center gap-3 mt-2">
            <Layout className="text-[#45b896]" size={32} />
            Mapa Regional
          </h1>
          <p className="text-gray-600 text-sm mt-1 max-w-lg">
            Monitoramento geoespacial em tempo real e distribuição dos eleitores na sua área de atuação.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
            <div className="bg-[#45b896]/10 text-[#1a3d2a] px-4 py-2 border border-[#45b896]/20 rounded-xl text-sm font-bold flex items-center gap-2">
                <Users size={18} className="text-[#45b896]" />
                {filteredVoters.length} Eleitores Mapeados
            </div>
        </div>
      </div>

      {/* Grid Lateral de Filtros + Mapa */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Painel Lateral de Filtros */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-[#1a3d2a] mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Filter size={16} className="text-[#45b896]" />
                Filtros de Busca
            </h3>

            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Buscar Nome</label>
                  <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                     <input 
                        type="text" 
                        placeholder="Nome do eleitor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#45b896] outline-none transition-all"
                     />
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Candidato</label>
                  <select 
                    value={filterCandidateId}
                    onChange={(e) => setFilterCandidateId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#45b896] outline-none transition-all"
                  >
                    <option value="">Todos os Candidatos</option>
                    {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Cidades da Região</label>
                  <select 
                    value={filterCityId}
                    onChange={(e) => setFilterCityId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#45b896] outline-none transition-all"
                  >
                    <option value="">Todas as Cidades</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block mb-1">Nível de Engajamento</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map(num => (
                        <button
                            key={num}
                            onClick={() => setFilterFidelity(filterFidelity === num ? '' : num)}
                            className={`py-3 rounded-lg text-xs font-bold border transition-all shadow-sm ${
                                filterFidelity === num 
                                    ? 'bg-[#1a3d2a] text-white border-[#1a3d2a] scale-105' 
                                    : 'bg-white text-gray-400 border-gray-200 hover:border-[#45b896]'
                            }`}
                        >
                            {num}★
                        </button>
                    ))}
                  </div>
               </div>
               
               <button 
                onClick={() => {
                    setFilterCityId('');
                    setFilterFidelity('');
                    setSearchTerm('');
                    setFilterCandidateId('');
                }}
                className="w-full py-3 mt-4 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors uppercase tracking-widest"
               >
                Limpar Filtros
               </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-sm font-bold text-[#1a3d2a] mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Info size={16} className="text-[#45b896]" />
                Classificação
            </h3>
            <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(score => (
                    <div key={score} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-transparent hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: getFidelityColor(score) }}></div>
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{getFidelityLabel(score)}</span>
                        </div>
                        <span className="font-black text-[#1a3d2a] text-xs">
                           {filteredVoters.filter(v => v.fidelity_score === score).length}
                        </span>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="lg:col-span-3 h-full rounded-3xl shadow-lg border border-gray-100 overflow-hidden relative bg-gray-100">
          {loading ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
               <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#45b896]" size={40} />
                  <p className="text-sm font-bold text-[#1a3d2a]">Mapeando dados geográficos da região...</p>
               </div>
            </div>
          ) : (
            <MapContainer 
                center={mapCenter} 
                zoom={mapZoom} 
                className="h-full w-full"
                scrollWheelZoom={true}
                zoomControl={false}
            >
              <FixMapSize />
              <CustomZoomControl center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {filteredVoters.map((voter) => (
                <Marker 
                    key={voter.id} 
                    position={[Number(voter.latitude), Number(voter.longitude)]}
                    icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: ${getFidelityColor(voter.fidelity_score)}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
                        iconSize: [14, 14],
                        iconAnchor: [7, 7]
                    })}
                >
                  <Popup className="rounded-2xl">
                    <div className="min-w-[220px] p-2">
                        <div className="flex flex-col gap-1 mb-3 border-b border-gray-100 pb-3">
                             <h4 className="font-black text-lg text-[#1a3d2a] m-0 leading-none">{voter.name}</h4>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm" style={{ backgroundColor: getFidelityColor(voter.fidelity_score), color: 'white' }}>
                                    Engajamento Nível {voter.fidelity_score}
                                </span>
                             </div>
                        </div>
                        
                        <div className="space-y-3 mt-1">
                            <div className="flex items-start gap-3 bg-gray-50 p-2 rounded-xl">
                                <Building2 size={16} className="text-[#45b896] mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Município / Bairro</p>
                                    <p className="text-xs font-bold text-gray-700">{voter.city}</p>
                                    {voter.neighborhood && <p className="text-[10px] text-gray-500">{voter.neighborhood}</p>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold">
                                    <Calendar size={12} className="text-blue-400" />
                                    {new Date(voter.created_at).toLocaleDateString('pt-BR')}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold">
                                    <MapPin size={12} className="text-orange-400" />
                                    Visita Pessoal
                                </div>
                            </div>
                        </div>

                        {voter.observations && (
                            <div className="mt-3 p-3 bg-blue-50/50 rounded-xl text-xs text-blue-900 border border-blue-100 italic">
                                "{voter.observations}"
                            </div>
                        )}
                        
                        <a 
                            href={`https://www.google.com/maps?q=${voter.latitude},${voter.longitude}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-4 block w-full text-center py-2.5 bg-gradient-to-r from-[#1a3d2a] to-[#2d5940] text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all"
                        >
                            Traçar Rota Mapas
                        </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          {/* Overlay de Resumo Lateral Inferior */}
          <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-md p-5 rounded-2xl text-gray-800 shadow-2xl border border-gray-100 hidden sm:block max-w-[260px]">
             <h5 className="text-[10px] uppercase font-bold text-[#45b896] mb-3 tracking-widest">Resumo {profile?.region_name}</h5>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Mapeados</p>
                   <p className="text-2xl font-black text-[#1a3d2a]">{filteredVoters.length}</p>
                </div>
                <div>
                   <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Méd. Fidelidade</p>
                   <p className="text-2xl font-black text-orange-500 flex items-center gap-1">
                      {(filteredVoters.reduce((acc, curr) => acc + curr.fidelity_score, 0) / (filteredVoters.length || 1)).toFixed(1)}
                      <span className="text-sm">★</span>
                   </p>
                </div>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                    <span className="font-bold uppercase tracking-wider">Cidades Ativas</span>
                    <span className="font-black text-[#1a3d2a] bg-gray-100 px-2 py-1 rounded-md">
                        {new Set(filteredVoters.map(v => v.city)).size}
                    </span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
