import React, { useState } from 'react';
import { apiService } from '../services/api';

interface CreateDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (deckId: number | string) => void;
    userId: string | number;
    teamId?: string | number | null;
    teamShortName?: string;
}

const CreateDeckModal: React.FC<CreateDeckModalProps> = ({ 
    isOpen, 
    onClose, 
    onCreated, 
    userId,
    teamId,
    teamShortName
}) => {
    const [name, setName] = useState('');
    const [status, setStatus] = useState<'DRAFT' | 'PRIVATE' | 'PUBLIC'>('DRAFT');
    const [isCreating, setIsCreating] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsCreating(true);
        try {
            let finalName = name.trim();
            if (teamShortName && !finalName.includes(`(${teamShortName})`)) {
                finalName = `(${teamShortName}) ${finalName}`;
            }

            const result = await apiService.saveDeck({
                name: finalName,
                user_id: userId,
                team_id: teamId || null,
                status: status,
                is_active: status === 'PUBLIC' ? 1 : 0,
                cards: [] // Iniciar vacío
            });

            onCreated(result.id);
            onClose();
        } catch (err: any) {
            alert(err.message || 'Error al crear el mazo');
        } finally {
            setIsCreating(false);
        }
    };

    const statusOptions = [
        { id: 'DRAFT', label: 'Borrador', icon: 'edit_note', desc: 'Solo tú puedes verlo y editarlo.' },
        { id: 'PRIVATE', label: 'Privado', icon: 'lock', desc: 'Guardado en tu perfil, no visible en listas públicas.' },
        { id: 'PUBLIC', label: 'Público', icon: 'public', desc: 'Visible para toda la comunidad.' },
    ] as const;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#101622] border border-[#ffd900]/20 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-slate-900 to-[#101622]">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                            NUEVO <span className="text-[#ffd900]">MAZO</span>
                        </h2>
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleCreate} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            Configuración de Visibilidad
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setStatus(opt.id)}
                                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                                        status === opt.id 
                                        ? 'bg-[#ffd900]/10 border-[#ffd900] text-white' 
                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                    }`}
                                >
                                    <span className={`material-symbols-outlined ${status === opt.id ? 'text-[#ffd900]' : ''}`}>
                                        {opt.icon}
                                    </span>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{opt.label}</p>
                                        <p className="text-[10px] opacity-60 leading-tight">{opt.desc}</p>
                                    </div>
                                    {status === opt.id && (
                                        <span className="material-symbols-outlined ml-auto text-[#ffd900] text-sm">check_circle</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex justify-between">
                            <span>Nombre del Mazo</span>
                            {teamShortName && <span className="text-[#ffd900]/40">Equipo: {teamShortName}</span>}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Mazo Estratégico, Mi formación..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-[#ffd900]/50 transition-all placeholder:text-white/10"
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="w-full py-4 bg-[#ffd900] text-black rounded-xl font-black uppercase tracking-widest transition-all shadow-xl shadow-[#ffd900]/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            {isCreating ? 'CREANDO...' : 'COMENZAR A ARMAR'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateDeckModal;
