import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { CardAbility } from '../types';

interface CreateAbilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbilitySaved: () => void;
  initialData?: CardAbility | null;
}

const CARD_TYPES = [
  { id: 'Jugador', label: 'Jugador' },
  { id: 'Jugada', label: 'Jugadas' },
  { id: 'Foul', label: 'Fouls' },
  { id: 'Estrategia', label: 'Estrategia' },
  { id: 'Hinchada', label: 'Hinchada' },
  { id: 'Energía', label: 'Energía' },
  { id: 'Ayudante Técnico', label: 'Ayudante Técnico' }
];

const CreateAbilityModal: React.FC<CreateAbilityModalProps> = ({ isOpen, onClose, onAbilitySaved, initialData }) => {
  const [name, setName] = useState('');
  const [isAll, setIsAll] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      const rawTypes = initialData.allowed_types || 'ALL';
      if (rawTypes === 'ALL') {
        setIsAll(true);
        setSelectedTypes([]);
      } else {
        setIsAll(false);
        const splitTypes = rawTypes.split(',').map(t => t.trim()).filter(Boolean);
        setSelectedTypes(splitTypes);
      }
    } else {
      setName('');
      setIsAll(false);
      setSelectedTypes(['Jugador']);
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const toggleType = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      setSelectedTypes(selectedTypes.filter(t => t !== typeId));
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let allowedStr = 'ALL';
    if (!isAll) {
      if (selectedTypes.length === 0) {
        setError('Debes seleccionar al menos un tipo de carta o marcar "Aplica a todos los tipos".');
        return;
      }
      allowedStr = selectedTypes.join(',');
    }

    setLoading(true);
    setError(null);

    try {
      if (initialData?.id) {
        await apiService.updateCardAbility(initialData.id, name.trim(), allowedStr);
      } else {
        await apiService.createCardAbility(name.trim(), allowedStr);
      }
      onAbilitySaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la destreza');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      <div className="bg-[#101622] border border-white/10 w-full max-w-lg relative overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-white/5 shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-[#ffd900]">
              {initialData ? 'EDITAR DESTREZA' : 'NUEVA DESTREZA'}
            </h2>
            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
              Configuración de destrezas / habilidades
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto font-display space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 flex items-center gap-3 rounded-sm">
              <span className="material-symbols-outlined text-sm">error</span>
              <span className="text-xs font-bold uppercase">{error}</span>
            </div>
          )}

          <form id="abilityForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Nombre de la Destreza / Habilidad</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Baluarte, Superioridad Aérea, Equipo"
                className="w-full bg-black/40 border border-white/10 px-4 py-3 text-sm font-bold text-white focus:border-[#ffd900] outline-none transition-colors rounded-sm"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Aplica a los siguientes tipos de cartas:</label>
              
              <label className="flex items-center gap-3 p-3 bg-white/2 border border-white/5 hover:bg-white/5 rounded-sm cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isAll}
                  onChange={(e) => setIsAll(e.target.checked)}
                  className="w-4 h-4 accent-[#ffd900]"
                />
                <div>
                  <span className="text-xs font-black uppercase text-[#ffd900]">TODOS LOS TIPOS DE CARTA (UNIVERSAL)</span>
                  <p className="text-[10px] text-white/30">Disponible para cualquier tipo de carta existente o futura (ej: Baluarte)</p>
                </div>
              </label>

              {!isAll && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {CARD_TYPES.map(t => {
                    const active = selectedTypes.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleType(t.id)}
                        className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase rounded-sm border transition-all ${
                          active
                            ? 'bg-[#ffd900]/10 border-[#ffd900] text-[#ffd900]'
                            : 'bg-black/30 border-white/5 text-white/40 hover:border-white/20'
                        }`}
                      >
                        <span>{t.label}</span>
                        {active && <span className="material-symbols-outlined text-sm">check</span>}
                      </button>
                    );
                  })}
                </div>
              )}
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
            form="abilityForm"
            type="submit"
            className="px-8 py-3 bg-[#ffd900] text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-lg shadow-[#ffd900]/20 rounded-sm"
            disabled={loading || !name.trim()}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            {loading ? 'Guardando...' : 'Guardar Destreza'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAbilityModal;
