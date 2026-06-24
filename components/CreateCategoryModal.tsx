import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategorySaved: () => void;
  initialData?: any;
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({ isOpen, onClose, onCategorySaved, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        logo_url: initialData.logo_url || ''
      });
      setLogoPreview(initialData.logo_url || null);
    } else {
      setFormData({ name: '', description: '', logo_url: '' });
      setLogoPreview(null);
    }
    setLogoFile(null);
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalLogoUrl = formData.logo_url;

      if (logoFile) {
        const uploadResult = await apiService.uploadImage(logoFile, 'categories');
        if (uploadResult.url) {
          finalLogoUrl = uploadResult.url;
        } else {
          throw new Error('No se recibió la URL de la imagen.');
        }
      }

      const categoryData = {
        ...formData,
        logo_url: finalLogoUrl
      };

      if (initialData?.id) {
        await apiService.updateTournamentCategory(initialData.id, categoryData);
      } else {
        await apiService.createTournamentCategory(categoryData);
      }

      onCategorySaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la categoría');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-[#101622] border border-white/10 w-full max-w-xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/5 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-[#ffd900]">
              {initialData ? 'EDITAR SERIE' : 'NUEVA SERIE'}
            </h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
              Configuración de categoría de torneos
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto font-display">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span className="text-xs font-bold uppercase">{error}</span>
            </div>
          )}

          <form id="categoryForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Logo / Badge */}
              <div>
                <label className="block text-[10px] font-black uppercase text-white/40 tracking-widest mb-2">Escudo / Logo de la Serie</label>
                <div className="flex gap-4 items-start">
                  <div className="w-24 h-24 bg-black/50 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center relative group shrink-0">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-white/10">shield</span>
                    )}
                    <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="material-symbols-outlined text-white">upload</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] text-white/40 leading-relaxed uppercase">Sube una imagen con transparencia (PNG). Este escudo aparecerá en las tarjetas de los torneos que pertenezcan a esta serie.</p>
                    <input
                      type="url"
                      placeholder="O ingresa una URL de imagen..."
                      value={formData.logo_url}
                      onChange={(e) => {
                        setFormData({ ...formData, logo_url: e.target.value });
                        if (!logoFile) setLogoPreview(e.target.value);
                      }}
                      className="w-full bg-black/40 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-[#ffd900] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Nombre de la Serie</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Liga Kick On"
                  className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm font-bold uppercase text-white focus:border-[#ffd900] outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Descripción (Opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción pública de esta categoría de torneos..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:border-[#ffd900] outline-none transition-colors resize-none"
                />
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/5 shrink-0 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-white/60 hover:text-white transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            form="categoryForm"
            type="submit"
            className="px-8 py-3 bg-[#ffd900] text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-lg shadow-[#ffd900]/20"
            disabled={loading}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            {loading ? 'Guardando...' : 'Guardar Serie'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCategoryModal;
