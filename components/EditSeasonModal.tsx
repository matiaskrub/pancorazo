import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface EditSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: any;
  onSeasonUpdated: () => void;
}

const EditSeasonModal: React.FC<EditSeasonModalProps> = ({ isOpen, onClose, season, onSeasonUpdated }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formatea un string de MySQL timestamp (YYYY-MM-DD HH:MM:SS) a formato YYYY-MM-DDTHH:MM requerido por datetime-local
  const formatToDatetimeLocal = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    // Si ya contiene T, recortar a minutos
    if (dateStr.includes('T') && dateStr.length >= 16) {
      return dateStr.substring(0, 16);
    }
    // Reemplazar espacio con T para compatibilidad de parseo
    const date = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    if (season) {
      setName(season.name || '');
      setStartDate(formatToDatetimeLocal(season.start_date));
      setEndDate(formatToDatetimeLocal(season.end_date));
    }
    setError(null);
  }, [season, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!name.trim()) {
        throw new Error('El nombre de la temporada es requerido');
      }

      await apiService.updateSeason(season.id, {
        name: name.trim().toUpperCase(),
        start_date: startDate || null,
        end_date: endDate || null
      });

      onSeasonUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la temporada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-[#101622] border border-white/10 w-full max-w-xl relative overflow-hidden flex flex-col max-h-[90vh] font-display rounded-sm">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/5 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-[#ffd900]">
              EDITAR TEMPORADA
            </h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
              Modificar propiedades de la temporada #{season.id}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span className="text-xs font-bold uppercase">{error}</span>
            </div>
          )}

          <form id="editSeasonForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Nombre de la Temporada</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Ej: LIGA ORO 2026"
                  className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm font-bold uppercase text-white focus:border-[#ffd900] outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Fecha de Inicio</label>
                <input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:border-[#ffd900] outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Fecha de Cierre (Opcional)</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:border-[#ffd900] outline-none transition-colors"
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
            form="editSeasonForm"
            type="submit"
            className="px-8 py-3 bg-[#ffd900] text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-lg shadow-[#ffd900]/20"
            disabled={loading}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            {loading ? 'Guardando...' : 'Guardar Temporada'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSeasonModal;
