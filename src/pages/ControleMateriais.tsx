import { useState, useEffect } from 'react';
import { supabase, MaterialCampanha, Candidate } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink,
  Loader2,
  X,
  Upload,
  MapPin,
  Building2,
  Pencil,
  Package,
  Share2,
  Eye,
  EyeOff
} from 'lucide-react';

export default function ControleMateriais() {
  const { profile } = useAuth();
  const [materiais, setMateriais] = useState<MaterialCampanha[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [regions, setRegions] = useState<{ id: string, name: string }[]>([]);
  const [coordinators, setCoordinators] = useState<{ id: string, full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';
  const isCoordinator = profile?.role === 'coordinator';
  const isMicro = profile?.role === 'micro';
  const isRestricted = isCoordinator || isMicro;

  // Filtros
  const [filterCandidateId, setFilterCandidateId] = useState('');
  const [filterRegionId, setFilterRegionId] = useState('');
  const [filterCoordinatorId, setFilterCoordinatorId] = useState('');
  const [filterType, setFilterType] = useState('');

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'Pdf' as 'Pdf' | 'Imagem' | 'Link',
    url: '',
    file: null as File | null,
    candidato_id: '',
    regiao_id: '',
    coordinator_ids: [] as string[]
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      setLoading(true);
      const [
        { data: matData },
        { data: candData },
        { data: regData },
        { data: coordData }
      ] = await Promise.all([
        supabase.from('materiais').select('*, candidates(name, parties(name)), regions(name)').order('created_at', { ascending: false }),
        supabase.from('candidates').select('*, parties(name)'),
        supabase.from('regions').select('*'),
        supabase.from('profiles').select('id, full_name').eq('role', 'coordinator').order('full_name')
      ]);

      setMateriais(matData || []);
      setCandidates(candData || []);
      setRegions(regData || []);
      setCoordinators(coordData || []);

      if (isRestricted && profile?.region_id) {
          setFilterRegionId(profile.region_id);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleShare = async (id: string, currentStatus: boolean) => {
    try {
        const { error } = await supabase
            .from('materiais')
            .update({ shared_with_micros: !currentStatus })
            .eq('id', id);
        
        if (error) throw error;
        fetchData(); // Recarregar para ver a mudança
    } catch (error) {
        console.error('Erro ao alternar compartilhamento:', error);
        alert('Erro ao atualizar status de compartilhamiento.');
    }
  };

  const handleEdit = (m: MaterialCampanha) => {
    if (!isAdmin) return;
    setEditingId(m.id);
    setFormData({
      titulo: m.titulo,
      descricao: m.descricao || '',
      tipo: m.tipo,
      url: m.url,
      file: null,
      candidato_id: m.candidato_id || '',
      regiao_id: m.regiao_id || '',
      coordinator_ids: (m as any).coordinator_ids || []
    });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      if (formData.tipo === 'Imagem' && !isImage) {
        alert('Por favor, selecione um arquivo de imagem.');
        return;
      }
      if (formData.tipo === 'Pdf' && !isPdf) {
        alert('Por favor, selecione um arquivo PDF.');
        return;
      }

      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      setUploading(true);
      let finalUrl = formData.url;

      // Se houver um novo arquivo, faz o upload e atualiza a URL
      if (formData.tipo !== 'Link' && formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${formData.tipo.toLowerCase()}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('Material')
          .upload(filePath, formData.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('Material')
          .getPublicUrl(filePath);
        
        finalUrl = urlData.publicUrl;
      }

      const materialData = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        tipo: formData.tipo,
        url: finalUrl,
        candidato_id: formData.candidato_id || null,
        regiao_id: formData.regiao_id || null,
        coordinator_ids: formData.coordinator_ids.length > 0 ? formData.coordinator_ids : null
      };

      if (editingId) {
        const { error } = await supabase
          .from('materiais')
          .update(materialData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materiais').insert([materialData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ titulo: '', descricao: '', tipo: 'Pdf', url: '', file: null, candidato_id: '', regiao_id: '', coordinator_ids: [] });
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      alert('Erro ao salvar material.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, url: string, tipo: string) => {
    if (!isAdmin) return;
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    try {
      if (tipo !== 'Link') {
        const pathMatch = url.match(/Material\/(.+)$/);
        if (pathMatch) {
          const filePath = pathMatch[1];
          await supabase.storage.from('Material').remove([filePath]);
        }
      }

      const { error } = await supabase.from('materiais').delete().eq('id', id);
      if (error) throw error;

      fetchData();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const filteredMateriais = materiais.filter(m => {
    const matchesSearch = m.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || m.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCandidate = !filterCandidateId || m.candidato_id === filterCandidateId;
    
    if (isRestricted && profile?.region_id) {
        if (m.regiao_id && m.regiao_id !== profile.region_id) return false;
    }
    if (isMicro) {
        if (!m.shared_with_micros) return false;
    }

    const matchesRegion = !filterRegionId || m.regiao_id === filterRegionId;
    const matchesCoord = !filterCoordinatorId || ((m as any).coordinator_ids || []).includes(filterCoordinatorId);
    const matchesType = !filterType || m.tipo === filterType;
    
    return matchesSearch && matchesCandidate && matchesRegion && matchesCoord && matchesType;
  });

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'Pdf': return <FileText className="text-red-500" />;
      case 'Imagem': return <ImageIcon className="text-blue-500" />;
      case 'Link': return <LinkIcon className="text-green-500" />;
      default: return <FileText />;
    }
  };

  return (
    <div className="p-6 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1a3d2a] flex items-center gap-3">
              <Package size={32} className="text-[#45b896]" />
              Materiais de Campanha
          </h1>
          <p className="text-gray-600">Confira os archivos e links oficiais da campanha</p>
        </div>
        {isAdmin && (
            <button 
                onClick={() => {
                    setEditingId(null);
                    setFormData({ titulo: '', descricao: '', tipo: 'Pdf', url: '', file: null, candidato_id: '', regiao_id: '', coordinator_ids: [] });
                    setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-[#1a3d2a] text-white px-6 py-3 rounded-xl hover:bg-[#2d5940] transition-all font-bold shadow-lg"
            >
                <Plus size={20} /> Novo Material
            </button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar material..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-medium"
            />
          </div>
          
          <select 
            value={filterCandidateId}
            onChange={(e) => setFilterCandidateId(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-semibold"
          >
            <option value="">Todos os Candidatos</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select 
            value={filterRegionId}
            disabled={isRestricted}
            onChange={(e) => setFilterRegionId(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-semibold disabled:bg-gray-100"
          >
            <option value="">Todas as Regiões</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <select 
            value={filterCoordinatorId}
            onChange={(e) => setFilterCoordinatorId(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-semibold"
          >
            <option value="">Todos os Coordenadores</option>
            {coordinators.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>

          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#45b896] outline-none text-sm font-semibold"
          >
            <option value="">Todos os Tipos</option>
            <option value="Pdf">PDF</option>
            <option value="Imagem">Imagem</option>
            <option value="Link">Link Externo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-[#45b896]" size={40} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Material</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Candidato</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Localização</th>
                  {isAdmin && <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status Compartilh.</th>}
                  <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Data</th>
                  <th className={`px-6 py-4 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider ${!isAdmin && !isCoordinator ? 'w-24' : ''}`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMateriais.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getIcon(m.tipo)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1a3d2a]">{m.titulo}</p>
                          <p className="text-[11px] text-gray-400 line-clamp-1">{m.descricao || 'Sem descrição'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                        m.tipo === 'Pdf' ? 'bg-red-50 text-red-600' :
                        m.tipo === 'Imagem' ? 'bg-blue-50 text-blue-600' :
                        'bg-green-50 text-green-600'
                      }`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 font-medium">{m.candidates?.name || 'Todos'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase">
                          <MapPin size={10} className="text-blue-400" />
                          <span>{m.regions?.name || 'Todas as Regiões'}</span>
                        </div>
                        {((m as any).coordinator_ids?.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {((m as any).coordinator_ids as string[]).map((cid: string) => {
                              const coord = coordinators.find(c => c.id === cid);
                              return coord ? (
                                <span key={cid} className="text-[9px] font-bold bg-[#def3cd] text-[#1a3d2a] px-1.5 py-0.5 rounded-full">
                                  {coord.full_name.split(' ')[0]}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                        <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                                m.shared_with_micros ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                                {m.shared_with_micros ? 'Compartilhado' : 'Privado Coordenador'}
                            </span>
                        </td>
                    )}
                    <td className="px-6 py-4">
                      <p className="text-[11px] text-gray-400 font-medium">
                        {new Date(m.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={m.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-[#45b896] hover:bg-green-50 rounded-lg transition-all"
                          title="Abrir Material"
                        >
                          <ExternalLink size={18} />
                        </a>
                        {isCoordinator && (
                            <button 
                                onClick={() => handleToggleShare(m.id, m.shared_with_micros)}
                                className={`p-2 rounded-lg transition-all ${
                                    m.shared_with_micros 
                                        ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                                title={m.shared_with_micros ? "Remover dos Micros" : "Compartilhar com Micros"}
                            >
                                {m.shared_with_micros ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        )}
                        {isAdmin && (
                            <>
                                <button 
                                    onClick={() => handleEdit(m)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Editar"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(m.id, m.url, m.tipo)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMateriais.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                      Nenhum material encontrado para sua região ou filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Só acessível por Admin */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#1a3d2a]">
                {editingId ? 'Editar Material' : 'Novo Material'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidato</label>
                  <select 
                    value={formData.candidato_id}
                    onChange={(e) => setFormData({...formData, candidato_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                    required
                  >
                    <option value="">Selecione o Candidato...</option>
                    {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Região (Opcional)</label>
                  <select 
                    value={formData.regiao_id}
                    onChange={(e) => setFormData({...formData, regiao_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  >
                    <option value="">Todos</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordenadores (Opcional)
                    {formData.coordinator_ids.length > 0 && (
                      <span className="ml-2 text-xs font-bold text-[#45b896]">({formData.coordinator_ids.length} selecionado{formData.coordinator_ids.length > 1 ? 's' : ''})</span>
                    )}
                  </label>
                  {/* Selected chips */}
                  {formData.coordinator_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {formData.coordinator_ids.map(cid => {
                        const coord = coordinators.find(c => c.id === cid);
                        return coord ? (
                          <span key={cid} className="flex items-center gap-1 bg-[#def3cd] text-[#1a3d2a] text-xs font-bold px-2 py-1 rounded-full">
                            {coord.full_name}
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, coordinator_ids: formData.coordinator_ids.filter(id => id !== cid)})}
                              className="hover:text-red-500 transition-colors ml-0.5"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  {/* Multi-select list */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    {coordinators.length === 0 ? (
                      <p className="text-xs text-gray-400 p-3 italic">Nenhum coordenador cadastrado.</p>
                    ) : (
                      coordinators.map(coord => {
                        const selected = formData.coordinator_ids.includes(coord.id);
                        return (
                          <button
                            key={coord.id}
                            type="button"
                            onClick={() => {
                              const ids = selected
                                ? formData.coordinator_ids.filter(id => id !== coord.id)
                                : [...formData.coordinator_ids, coord.id];
                              setFormData({...formData, coordinator_ids: ids});
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors border-b border-gray-100 last:border-0 ${
                              selected ? 'bg-[#def3cd] text-[#1a3d2a] font-bold' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              selected ? 'bg-[#1a3d2a] border-[#1a3d2a]' : 'border-gray-300'
                            }`}>
                              {selected && <span className="text-white text-[10px] font-black">✓</span>}
                            </div>
                            {coord.full_name}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {formData.coordinator_ids.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, coordinator_ids: []})}
                      className="mt-1.5 text-xs text-red-400 hover:text-red-600 font-semibold transition-colors"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input 
                  type="text" 
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                  placeholder="Nome do material..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea 
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none h-20 resize-none"
                  placeholder="Breve descrição..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Material</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Pdf', 'Imagem', 'Link'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, tipo: type, file: null, url: (editingId && type === formData.tipo) ? formData.url : ''})}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        formData.tipo === type 
                          ? 'bg-[#1a3d2a] text-white border-[#1a3d2a]' 
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {formData.tipo === 'Link' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL do Link</label>
                  <input 
                    type="url" 
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] outline-none"
                    placeholder="https://exemplo.com..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingId ? 'Substituir Arquivo (Opcional)' : 'Upload de Arquivo'}
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#45b896] transition-colors relative">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-10 w-10 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-[#45b896] hover:text-[#34a07d]">
                          <span>Selecionar arquivo</span>
                          <input 
                            type="file" 
                            className="sr-only" 
                            accept={formData.tipo === 'Pdf' ? '.pdf' : 'image/*'}
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formData.file ? formData.file.name : (editingId ? 'Mantenha vazio para não alterar' : `${formData.tipo} selecionado`)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-[#1a3d2a] text-white py-3 rounded-lg font-bold hover:bg-[#2d5940] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Salvando...
                    </>
                  ) : (editingId ? 'Atualizar Material' : 'Salvar Material')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
