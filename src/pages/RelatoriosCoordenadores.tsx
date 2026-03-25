import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  FileText,
  MapPin,
  Clock,
  AlertCircle,
  ShieldAlert,
  Search,
  User,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Eye,
  X,
  Filter,
  Inbox,
} from 'lucide-react';

interface Report {
  id: string;
  title: string;
  content: string;
  priority: 'baixa' | 'normal' | 'alta' | 'urgente';
  region_name: string;
  created_at: string;
  created_by: string;
  coordinator_name?: string;
}

const PRIORITY_CONFIG = {
  baixa: {
    label: 'Ver depois',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    bar: 'bg-slate-300',
    order: 1,
  },
  normal: {
    label: 'Normal',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
    bar: 'bg-blue-300',
    order: 2,
  },
  alta: {
    label: 'Atenção',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
    order: 3,
  },
  urgente: {
    label: 'Urgente',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
    order: 4,
  },
};

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.normal;
  const Icon = priority === 'urgente' ? ShieldAlert : AlertCircle;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-1">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 font-medium">{sub}</p>}
    </div>
  );
}

export default function RelatoriosCoordenadores() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterCoordinator, setFilterCoordinator] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('strategic_reports')
        .select(`
          *,
          profiles!strategic_reports_created_by_fkey ( full_name )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback: query without join
        const { data: simpleData } = await supabase
          .from('strategic_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (simpleData) {
          // enrich with profile names
          const ids = [...new Set(simpleData.map((r: any) => r.created_by))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', ids);

          const profileMap: Record<string, string> = {};
          (profilesData || []).forEach((p: any) => {
            profileMap[p.id] = p.full_name;
          });

          setReports(
            simpleData.map((r: any) => ({
              ...r,
              coordinator_name: profileMap[r.created_by] || 'Coordenador',
            }))
          );
        }
        return;
      }

      if (data) {
        setReports(
          data.map((r: any) => ({
            ...r,
            coordinator_name: r.profiles?.full_name || 'Coordenador',
          }))
        );
      }
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Derived options
  const regions = useMemo(
    () => [...new Set(reports.map((r) => r.region_name).filter(Boolean))],
    [reports]
  );
  const coordinators = useMemo(
    () => [...new Set(reports.map((r) => r.coordinator_name).filter(Boolean))],
    [reports]
  );

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch =
        !searchTerm ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.coordinator_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchRegion = !filterRegion || r.region_name === filterRegion;
      const matchCoord = !filterCoordinator || r.coordinator_name === filterCoordinator;
      const matchPriority = !filterPriority || r.priority === filterPriority;
      return matchSearch && matchRegion && matchCoord && matchPriority;
    });
  }, [reports, searchTerm, filterRegion, filterCoordinator, filterPriority]);

  // Stats
  const stats = useMemo(() => {
    const urgent = reports.filter((r) => r.priority === 'urgente').length;
    const alta = reports.filter((r) => r.priority === 'alta').length;
    const uniqueCoords = new Set(reports.map((r) => r.created_by)).size;
    return { total: reports.length, urgent, alta, uniqueCoords };
  }, [reports]);

  const hasFilters = searchTerm || filterRegion || filterCoordinator || filterPriority;
  const clearFilters = () => {
    setSearchTerm('');
    setFilterRegion('');
    setFilterCoordinator('');
    setFilterPriority('');
  };

  return (
    <div className="p-4 md:p-6 pb-20 lg:pb-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              Administração Central
            </span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-[#45b896] text-xs font-bold uppercase tracking-widest">
              Visão Geral
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#1a3d2a] flex items-center gap-3">
            <FileText className="text-[#45b896]" size={34} />
            Relatórios dos Coordenadores
          </h1>
          <p className="text-gray-500 text-sm mt-1 max-w-xl">
            Central de inteligência de campo — acompanhe em tempo real as submissões estratégicas de cada região.
          </p>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#1a3d2a] hover:border-[#45b896] hover:shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Relatórios"
          value={stats.total}
          sub="desde o início"
          accent="text-[#1a3d2a]"
        />
        <StatCard
          label="Urgentes"
          value={stats.urgent}
          sub="requer atenção imediata"
          accent="text-red-600"
        />
        <StatCard
          label="Prioridade Alta"
          value={stats.alta}
          sub="monitoramento ativo"
          accent="text-amber-500"
        />
        <StatCard
          label="Coordenadores Ativos"
          value={stats.uniqueCoords}
          sub="relatórios submetidos"
          accent="text-[#45b896]"
        />
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-[#45b896]" />
          <h3 className="text-sm font-bold text-[#1a3d2a] uppercase tracking-wider">Filtros de Busca</h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
            >
              <X size={14} /> Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#45b896] transition-colors"
              size={16}
            />
            <input
              type="text"
              placeholder="Pesquisar relatórios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#45b896] outline-none transition-all"
            />
          </div>

          {/* Region */}
          <div className="relative">
            <MapPin
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#45b896] outline-none appearance-none transition-all"
            >
              <option value="">Todas as Regiões</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {/* Coordinator */}
          <div className="relative">
            <User
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
            <select
              value={filterCoordinator}
              onChange={(e) => setFilterCoordinator(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#45b896] outline-none appearance-none transition-all"
            >
              <option value="">Todos os Coordenadores</option>
              {coordinators.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>

          {/* Priority */}
          <div className="relative">
            <AlertCircle
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={16}
            />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#45b896] outline-none appearance-none transition-all"
            >
              <option value="">Todas as Prioridades</option>
              <option value="urgente">🔴 Urgente</option>
              <option value="alta">🟠 Atenção</option>
              <option value="normal">🔵 Normal</option>
              <option value="baixa">⚪ Ver depois</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* ── RESULTS COUNT ── */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            {filtered.length === reports.length
              ? `${reports.length} relatório${reports.length !== 1 ? 's' : ''}`
              : `${filtered.length} de ${reports.length} relatório${reports.length !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#45b896]" />
            <span className="text-xs font-bold text-gray-400">Ordenado por data</span>
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-100 rounded-full w-1/3 mb-4" />
              <div className="h-6 bg-gray-100 rounded-full w-3/4 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded-full" />
                <div className="h-3 bg-gray-100 rounded-full w-5/6" />
                <div className="h-3 bg-gray-100 rounded-full w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* ── EMPTY STATE ── */
        <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-dashed border-gray-200 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
            <Inbox size={32} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-600">Nenhum relatório encontrado</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-sm">
            {hasFilters
              ? 'Tente ajustar os filtros para ver mais resultados.'
              : 'Aguarde os coordenadores submeterem seus relatórios estratégicos.'}
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-6 px-6 py-2.5 border-2 border-[#1a3d2a] text-[#1a3d2a] font-bold rounded-xl hover:bg-[#1a3d2a] hover:text-white transition-colors text-sm"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        /* ── REPORT GRID ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((report) => {
            const cfg = PRIORITY_CONFIG[report.priority] ?? PRIORITY_CONFIG.normal;
            const date = new Date(report.created_at);
            const isUrgent = report.priority === 'urgente';

            return (
              <div
                key={report.id}
                className={`
                  bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300
                  group relative overflow-hidden flex flex-col
                  hover:-translate-y-1 cursor-pointer
                  ${isUrgent ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-100'}
                `}
                onClick={() => setSelectedReport(report)}
              >
                {/* Priority stripe */}
                <div className={`h-1.5 w-full ${cfg.bar}`} />

                <div className="p-6 flex flex-col flex-1">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <PriorityBadge priority={report.priority} />
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-gray-300 hover:text-[#45b896] transition-colors"
                    >
                      <Eye size={14} /> Ver
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-black text-[#1a3d2a] mb-2 line-clamp-2 leading-tight group-hover:text-[#2d5940] transition-colors">
                    {report.title}
                  </h3>

                  {/* Content preview */}
                  <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed flex-1 mb-5">
                    {report.content}
                  </p>

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-50 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a3d2a] to-[#45b896] flex items-center justify-center text-white text-[10px] font-black uppercase shrink-0">
                        {(report.coordinator_name || 'C')[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700 leading-tight">{report.coordinator_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Coordenador</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={11} className="text-[#45b896]" />
                        <span className="truncate max-w-[100px]">{report.region_name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-[#45b896]" />
                        {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {selectedReport && (
        <div
          className="fixed inset-0 bg-[#1a3d2a]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto pt-16 lg:pt-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-[#1a3d2a] to-[#4a8b3a] text-white flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <div className="mb-1">
                    <PriorityBadge priority={selectedReport.priority} />
                  </div>
                  <h3 className="text-xl font-black leading-tight mt-1">{selectedReport.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all shrink-0"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Meta */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a3d2a] to-[#45b896] flex items-center justify-center text-white text-xs font-black uppercase">
                  {(selectedReport.coordinator_name || 'C')[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">{selectedReport.coordinator_name}</p>
                  <p className="text-[10px] text-gray-400">Coordenador</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <MapPin size={14} className="text-[#45b896]" />
                {selectedReport.region_name || 'Região não definida'}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <Clock size={14} className="text-[#45b896]" />
                {new Date(selectedReport.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Conteúdo do Relatório
              </h4>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.content}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setSelectedReport(null)}
                className="w-full py-3 bg-gradient-to-r from-[#1a3d2a] to-[#45b896] text-white font-bold rounded-xl hover:shadow-lg transition-all text-sm uppercase tracking-wider"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
