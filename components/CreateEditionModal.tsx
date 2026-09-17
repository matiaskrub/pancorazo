import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface CreateEditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditionSaved: () => void;
  initialData?: any;
}

const CreateEditionModal: React.FC<CreateEditionModalProps> = ({ isOpen, onClose, onEditionSaved, initialData }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
    } else {
      setName('');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (initialData?.id) {
        await apiService.updateCardEdition(initialData.id, name.trim());
      } else {
        await apiService.createCardEdition(name.trim());
      }
      onEditionSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la edición');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-[#101622] border border-white/10 w-full max-w-md relative overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/5 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-[#ffd900]">
              {initialData ? 'EDITAR EDICIÓN' : 'NUEVA EDICIÓN'}
            </h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
              Configuración de edición de cartas
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto font-display">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 mb-6 flex items-center gap-3 rounded-sm">
              <span className="material-symbols-outlined text-sm">error</span>
              <span className="text-xs font-bold uppercase">{error}</span>
            </div>
          )}

          <form id="editionForm" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Nombre de la Edición</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Copa de Oro 2026"
                className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm font-bold uppercase text-white focus:border-[#ffd900] outline-none transition-colors rounded-sm"
              />
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
            form="editionForm"
            type="submit"
            className="px-8 py-3 bg-[#ffd900] text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-lg shadow-[#ffd900]/20 rounded-sm"
            disabled={loading || !name.trim()}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            {loading ? 'Guardando...' : 'Guardar Edición'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEditionModal;
