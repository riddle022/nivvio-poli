import { useState, useEffect } from 'react';
import { supabase, Voter, Candidate } from '../lib/supabase';
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

// Corrigir problema do ícone padrão do Leaflet no React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Função para retornar a cor baseada no score de fidelidade
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

// Componente para corrigir o problema de renderização parcial do Leaflet
function FixMapSize() {
  const map = useMap();
  useEffect(() => {
    // Executar múltiplas vezes para garantir que o layout final do Grid/Flex do navegador já terminou
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

// Botões de controle de zoom personalizados
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
                title="Centralizar no Paraná"
            >
                <Maximize size={20} />
            </button>
        </div>
    );
}

export default function MapaEstadual() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [regions, setRegions] = useState<{ id: string, name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string, name: string, region_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterCandidateId, setFilterCandidateId] = useState('');
  const [filterRegionId, setFilterRegionId] = useState('');
  const [filterCityId, setFilterCityId] = useState('');
  const [filterFidelity, setFilterFidelity] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Centro inicial: Paraná
  const mapCenter: [number, number] = [-24.8918, -51.5540];
  const mapZoom = 7;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [
        { data: vData },
        { data: candData },
        { data: regData },
        { data: cityData }
      ] = await Promise.all([
        supabase.from('voters').select('*'),
        supabase.from('candidates').select('*'),
        supabase.from('regions').select('*'),
        supabase.from('cities').select('*')
      ]);

      setVoters(vData || []);
      if (vData && vData.length > 0) {
        console.log('DEBUG - Primeiro Eleitor:', vData[0]);
      }
      setCandidates(candData || []);
      setRegions(regData || []);
      setCities(cityData || []);
    } catch (error) {
      console.error('Erro ao buscar dados do mapa:', error);
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
    const matchesRegion = !filterRegionId || true;
    const matchesCity = !filterCityId || v.city === cities.find(c => c.id === filterCityId)?.name;
    const matchesFidelity = filterFidelity === '' || v.fidelity_score === filterFidelity;

    return matchesSearch && matchesCandidate && matchesRegion && matchesCity && matchesFidelity;
  });

  return (
    <div className="p-4 md:p-6 lg:ml-0 pb-20 lg:pb-6 flex flex-col h-[calc(100vh-80px)]">
      {/* Header e Filtros */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3d2a] flex items-center gap-2">
            <Layout className="text-[#45b896]" />
            Mapa Estratégico Estadual
          </h1>
          <p className="text-gray-600 text-sm">Visualização geoestatística de eleitores no Paraná</p>
        </div>

        <div className="flex flex-wrap gap-2">
            <div className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-[10px] font-bold">
                DEBUG: Registros: {voters.length} | Com Lat: {voters.filter(v => v.latitude).length} | Com Lon: {voters.filter(v => v.longitude).length}
            </div>
            <div className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Users size={14} />
                {filteredVoters.length} Eleitores Mapeados
            </div>
            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <MapPin size={14} />
                Paraná, BR
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
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Buscar Nome</label>
                  <div className="relative mt-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                     <input 
                        type="text" 
                        placeholder="Nome do eleitor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#45b896] outline-none"
                     />
                  </div>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Candidato</label>
                  <select 
                    value={filterCandidateId}
                    onChange={(e) => setFilterCandidateId(e.target.value)}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#45b896] outline-none"
                  >
                    <option value="">Todos os Candidatos</option>
                    {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Região</label>
                  <select 
                    value={filterRegionId}
                    onChange={(e) => {
                        setFilterRegionId(e.target.value);
                        setFilterCityId('');
                    }}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#45b896] outline-none"
                  >
                    <option value="">Todas as Regiões</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cidade</label>
                  <select 
                    value={filterCityId}
                    onChange={(e) => setFilterCityId(e.target.value)}
                    className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#45b896] outline-none"
                  >
                    <option value="">Todas as Cidades</option>
                    {cities
                        .filter(c => !filterRegionId || c.region_id === filterRegionId)
                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>

               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nível de Fidelidade</label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(num => (
                        <button
                            key={num}
                            onClick={() => setFilterFidelity(filterFidelity === num ? '' : num)}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                filterFidelity === num 
                                    ? 'bg-[#1a3d2a] text-white border-[#1a3d2a]' 
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                            }`}
                        >
                            {num}★
                        </button>
                    ))}
                  </div>
               </div>
               
               <button 
                onClick={() => {
                    setFilterRegionId('');
                    setFilterCityId('');
                    setFilterFidelity('');
                    setSearchTerm('');
                    setFilterCandidateId('');
                }}
                className="w-full py-3 mt-2 text-xs font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
               >
                Limpar Filtros
               </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-sm font-bold text-[#1a3d2a] mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Info size={16} className="text-[#45b896]" />
                Legenda de Fidelidade
            </h3>
            <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(score => (
                    <div key={score} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getFidelityColor(score) }}></div>
                        <span className="text-[11px] font-bold text-gray-500">{getFidelityLabel(score)}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="lg:col-span-3 h-full rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative bg-gray-100">
          {loading ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
               <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#45b896]" size={40} />
                  <p className="text-sm font-bold text-[#1a3d2a]">Processando dados espaciais...</p>
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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              
              {filteredVoters.map((voter) => (
                <Marker 
                    key={voter.id} 
                    position={[Number(voter.latitude), Number(voter.longitude)]}
                    icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: ${getFidelityColor(voter.fidelity_score)}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })}
                >
                  <Popup>
                    <div className="min-w-[200px] p-1">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                                <h4 className="font-bold text-[#1a3d2a] m-0">{voter.name}</h4>
                             </div>
                             <div className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: getFidelityColor(voter.fidelity_score), color: 'white' }}>
                                {voter.fidelity_score}★
                             </div>
                        </div>
                        
                        <div className="space-y-2 text-[11px] text-gray-600">
                            <div className="flex items-center gap-2">
                                <Building2 size={12} className="text-[#45b896]" />
                                <span className="font-bold">{voter.city}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={12} className="text-blue-500" />
                                <span>Captado por: <b className="text-gray-900">{voter.city}</b></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-purple-500" />
                                <span>Cadastro: <b>{new Date(voter.created_at).toLocaleDateString()}</b></span>
                            </div>
                        </div>

                        {voter.observations && (
                            <div className="mt-3 p-2 bg-gray-50 rounded-lg text-[10px] text-gray-400 italic">
                                "{voter.observations}"
                            </div>
                        )}
                        
                        <a 
                            href={`https://www.google.com/maps?q=${voter.latitude},${voter.longitude}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-3 block w-full text-center py-2 bg-[#1a3d2a] text-white rounded-lg text-xs font-bold hover:bg-[#2d5940] transition-colors"
                        >
                            Ver no Google Maps
                        </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}

          {/* Overlay de Resumo Lateral Inferior */}
          <div className="absolute bottom-4 right-4 z-[500] bg-[#1a3d2a]/90 backdrop-blur-md p-4 rounded-2xl text-white shadow-2xl border border-white/10 hidden md:block max-w-[240px]">
             <h5 className="text-[10px] uppercase font-bold text-[#45b896] mb-2 tracking-widest">Resumo Operacional</h5>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <p className="text-[9px] text-gray-400 font-bold uppercase">Total Filtrado</p>
                   <p className="text-xl font-black">{filteredVoters.length}</p>
                </div>
                <div>
                   <p className="text-[9px] text-gray-400 font-bold uppercase">Média Fidelity</p>
                   <p className="text-xl font-black">
                      {(filteredVoters.reduce((acc, curr) => acc + curr.fidelity_score, 0) / (filteredVoters.length || 1)).toFixed(1)}
                   </p>
                </div>
             </div>
             <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex justify-between items-center text-[10px] text-gray-300">
                    <span>Área Coberta</span>
                    <span className="font-black text-[#45b896]">Leste/Sul PR</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
