import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, 
  MapPin, 
  Clock, 
  AlertCircle, 
  Plus, 
  X, 
  Trash2, 
  ArrowRight,
  ShieldAlert,
  Search,
  CheckCircle2
} from 'lucide-react';

interface StrategicReport {
  id: string;
  title: string;
  content: string;
  priority: 'baixa' | 'normal' | 'alta' | 'urgente';
  region_name: string;
  created_at: string;
}

export default function RelatoriosVisitas() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<StrategicReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'baixa' | 'normal' | 'alta' | 'urgente',
  });

  useEffect(() => {
    if (profile?.id) {
      loadReports();
    }
  }, [profile]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('strategic_reports')
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      if (data) setReports(data as StrategicReport[]);
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const regionName = profile?.region_name || 'Região não definida';

      const { error } = await supabase.from('strategic_reports').insert({
        title: formData.title,
        content: formData.content,
        priority: formData.priority,
        region_name: regionName,
        created_by: profile?.id
      });

      if (error) throw error;
      
      setIsModalOpen(false);
      loadReports();
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
      alert('Erro ao salvar relatório. Verifique se a tabela foi configurada.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este relatório permanentemente?')) return;
    setLoading(true);
    await supabase.from('strategic_reports').delete().eq('id', id);
    loadReports();
    setLoading(false);
  };

  const filteredReports = reports.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityConfig = (priority: string) => {
    switch(priority) {
      case 'baixa': return { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', label: 'Ver depois' };
      case 'normal': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Normal' };
      case 'alta': return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Atenção' };
      case 'urgente': return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Crítico/Urgente' };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200', label: 'Normal' };
    }
  };

  return (
    <div className="p-4 md:p-6 lg:ml-0 pb-20 lg:pb-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#def3cd] text-[#1a3d2a] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              Operações Estratégicas
            </span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-[#45b896] text-xs font-bold uppercase tracking-widest">{profile?.region_name}</span>
          </div>
          <h1 className="text-3xl font-black text-[#1a3d2a] flex items-center gap-3">
            <FileText className="text-[#45b896]" size={36} />
            Relatórios Estratégicos
          </h1>
          <p className="text-gray-600 mt-1 max-w-xl">
            Sintetize a evolução das visitas, métricas e cenário político regional. Seus relatórios escalam diretamente para a Administração Central.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-[#45b896]" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar relatórios..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#45b896] focus:border-transparent transition-all outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={handleOpenModal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1a3d2a] to-[#45b896] text-white rounded-xl hover:shadow-lg transition-all font-bold whitespace-nowrap shadow-sm hover:scale-105"
          >
            <Plus size={20} /> Redigir Relatório
          </button>
        </div>
      </div>

      {/* HISTÓRICO DE RELATÓRIOS */}
      <div className="space-y-6">
        
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-dashed border-gray-200 flex flex-col items-center justify-center mt-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <FileText size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-600">Nenhum relatório submetido</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-sm">Ao criar relatórios de campo, os líderes da campanha poderão tomar decisões rápidas baseadas nas suas prioridades territoriais.</p>
            <button 
              onClick={handleOpenModal}
              className="mt-6 px-6 py-2 border-2 border-[#1a3d2a] text-[#1a3d2a] font-bold rounded-xl hover:bg-[#1a3d2a] hover:text-white transition-colors"
            >
              Criar o primeiro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const priorityConfig = getPriorityConfig(report.priority);
              const date = new Date(report.created_at);

              return (
                <div key={report.id} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 flex flex-col h-full relative overflow-hidden">
                  
                  {/* Fita colorida no topo baseada na prioridade */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${priorityConfig.bg} filter brightness-90`}></div>

                  <div className="flex items-start justify-between mb-4 mt-2">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border} flex items-center gap-1.5`}>
                      {report.priority === 'urgente' ? <ShieldAlert size={12} /> : <AlertCircle size={12} />}
                      {priorityConfig.label}
                    </span>
                    
                    <button 
                      onClick={() => handleDelete(report.id)}
                      className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                      title="Excluir relatório"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-[#1a3d2a] mb-3 line-clamp-2 leading-tight">
                    {report.title}
                  </h3>
                  
                  <p className="text-sm text-gray-500 mb-6 flex-1 line-clamp-4 leading-relaxed">
                    {report.content}
                  </p>

                  <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#45b896]" />
                        {report.region_name}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-[#45b896]" />
                        {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO E REDAÇÃO DO RELATÓRIO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1a3d2a]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto pt-16 lg:pt-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header / Meta Inteligência */}
            <div className="p-6 bg-gradient-to-br from-[#1a3d2a] to-[#4a8b3a] text-white flex items-center justify-between sticky top-0 z-10 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl"><FileText size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold">Relatório Estratégico de Campo</h3>
                  <p className="text-[#def3cd] text-sm font-semibold flex items-center gap-2 mt-0.5">
                    <MapPin size={14} /> Sistema automatizado para: {profile?.region_name || 'Desconhecido'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* Box de Informações fixas geradas pelo sistema */}
              <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <Clock size={16} className="text-[#45b896]" /> Instante do Servidor
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <CheckCircle2 size={16} className="text-blue-500" /> Coordenação Autenticada
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm text-xs font-bold text-gray-500 uppercase tracking-widest">
                  <MapPin size={16} className="text-orange-500" /> Destino: Administração
                </div>
              </div>

              {/* Título da Estratégia/Relatório */}
              <div>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 block ml-1">Assunto / Situação do Relatório</label>
                <input 
                  type="text" 
                  placeholder="Ex: Evolução da estratégia porta-a-porta nos bairros Z e Y"
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-black text-[#1a3d2a] text-lg shadow-sm placeholder:font-medium placeholder:text-gray-400"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              {/* Corpo do Relatório */}
              <div>
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 block ml-1">Detalhes e Métricas de Referência</label>
                <textarea 
                  placeholder="Descreva todo o cenário aos administradores. Quais são os desafios? Como estão os números de eleitores em relação às metas estipuladas? Precisam de mais materiais?"
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#45b896] transition-all font-medium text-gray-700 shadow-sm h-48 resize-none leading-relaxed"
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                />
              </div>

              {/* Prioridade */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <label className="text-sm font-bold text-[#1a3d2a] uppercase tracking-wider mb-4 block flex items-center gap-2">
                  <AlertCircle size={18} className="text-[#45b896]" /> Grau de Prioridade de Leitura (Admin)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['baixa', 'normal', 'alta', 'urgente'] as const).map(type => {
                    const config = getPriorityConfig(type);
                    const isSelected = formData.priority === type;

                    return (
                      <label 
                        key={type} 
                        className={`
                          cursor-pointer border-2 p-3 rounded-xl flex flex-col items-center gap-2 transition-all group
                          ${isSelected ? `border-current ${config.bg} ${config.color} shadow-sm scale-105` : 'border-transparent bg-white shadow-sm hover:border-gray-200'}
                        `}
                      >
                        <input 
                          type="radio" 
                          name="priority" 
                          value={type}
                          checked={isSelected}
                          onChange={() => setFormData({...formData, priority: type})}
                          className="sr-only"
                        />
                        <div className={`p-2 rounded-full ${isSelected ? 'bg-white shadow-sm' : config.bg} ${config.color} transition-colors group-hover:bg-white group-hover:shadow-sm`}>
                           {type === 'urgente' ? <ShieldAlert size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-current' : 'text-gray-500'}`}>
                          {config.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé e Envio */}
              <div className="pt-6 mt-6 border-t border-gray-100 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="w-1/3 sm:w-1/4 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-all text-sm uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#1a3d2a] to-[#45b896] text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl hover:shadow-[0_10px_30px_rgba(69,184,150,0.3)] hover:scale-[1.02] disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
                >
                  {loading ? 'Processando...' : 'Assinar e Enviar Relatório'}
                  {!loading && <ArrowRight size={20} />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
