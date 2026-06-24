import React, { useState, useEffect } from 'react';
import { Card } from '../types';

interface SaveDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, status: 'DRAFT' | 'PRIVATE' | 'PUBLIC', format: string) => void;
    playerDeck: (Card | null)[];
    supportDeck: (Card | null)[];
    existingName?: string;
    isEdit?: boolean;
    teamShortName?: string;
    initialStatus?: 'DRAFT' | 'PRIVATE' | 'PUBLIC';
    initialFormat?: string;
    isLayoutValid: boolean;
    validationErrors?: string[];
}

const SaveDeckModal: React.FC<SaveDeckModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    playerDeck, 
    supportDeck,
    existingName = '',
    isEdit = false,
    teamShortName,
    initialStatus = 'DRAFT',
    initialFormat = 'Pichanga',
    isLayoutValid,
    validationErrors = []
}) => {
    const [deckName, setDeckName] = useState(existingName);
    const [status, setStatus] = useState<'DRAFT' | 'PRIVATE' | 'PUBLIC'>(initialStatus);
    const [format, setFormat] = useState<string>(initialFormat);

    useEffect(() => {
        if (isOpen) {
            // Limpiar el prefijo (SHORT_NAME) si viene del existingName para que el input sea limpio
            let cleanName = existingName;
            if (teamShortName && existingName.includes(`(${teamShortName})`)) {
                cleanName = existingName.replace(`(${teamShortName})`, '').trim();
            }
            setDeckName(cleanName);
            setStatus(initialStatus);
            setFormat(initialFormat || 'Pichanga');
        }
    }, [isOpen, existingName, teamShortName, initialStatus, initialFormat]);

    const playerCount = playerDeck.filter(c => c !== null).length;
    const supportCount = supportDeck.filter(c => c !== null).length;
    const isComplete = playerCount >= 10 && playerCount <= 12 && supportCount === 45 && isLayoutValid;

    if (!isOpen) return null;

    const previewName = teamShortName && deckName ? `(${teamShortName}) ${deckName}` : deckName;

    const statusOptions = [
        { id: 'DRAFT', label: 'Borrador', icon: 'edit_note', desc: 'Solo tú puedes verlo y editarlo.' },
        { id: 'PRIVATE', label: 'Privado', icon: 'lock', desc: 'Guardado en tu perfil, no visible en listas públicas.' },
        { id: 'PUBLIC', label: 'Público', icon: 'public', desc: 'Visible para toda la comunidad.' },
    ] as const;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#101622] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-slate-900 to-[#101622]">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                            {isEdit ? 'ACTUALIZAR' : 'GUARDAR'} <span className="text-[#ffd900]">MAZO</span>
                        </h2>
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {/* Resumen */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">JUGADORES</p>
                            <p className={`text-2xl font-black ${playerCount >= 10 && playerCount <= 12 ? 'text-green-500' : 'text-[#ffd900]'}`}>
                                {playerCount} <span className="text-xs text-white/20">/ 10-12</span>
                            </p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">APOYO</p>
                            <p className={`text-2xl font-black ${supportCount === 45 ? 'text-green-500' : 'text-[#ffd900]'}`}>
                                {supportCount} <span className="text-xs text-white/20">/ 45</span>
                            </p>
                        </div>
                    </div>

                    {!isLayoutValid && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                            {validationErrors && validationErrors.length > 0 ? (
                                <div className="space-y-1.5 text-left">
                                    <p className="text-[10px] text-red-400 font-black uppercase tracking-wider">
                                        El mazo no cumple con las restricciones:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-red-300 font-medium">
                                        {validationErrors.map((err, idx) => (
                                            <li key={idx} className="text-[10px] leading-tight">
                                                {err}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider text-center">
                                    Distribución de Cancha / Banca inválida. Revisa las restricciones en el Deck Builder.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            Visibilidad del Mazo
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setStatus(opt.id)}
                                    disabled={opt.id === 'PUBLIC' && !isComplete}
                                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                                        status === opt.id 
                                        ? 'bg-[#ffd900]/10 border-[#ffd900] text-white' 
                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                    } ${opt.id === 'PUBLIC' && !isComplete ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <span className={`material-symbols-outlined ${status === opt.id ? 'text-[#ffd900]' : ''}`}>
                                        {opt.icon}
                                    </span>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-tight">{opt.label}</p>
                                        <p className="text-[10px] opacity-60 leading-tight">{opt.desc}</p>
                                        {opt.id === 'PUBLIC' && !isComplete && (
                                            <p className="text-[9px] text-[#ffd900] font-bold mt-1 uppercase italic">
                                                Requiere mazo completo (10-12/45) y distribución válida.
                                            </p>
                                        )}
                                    </div>
                                    {status === opt.id && (
                                        <span className="material-symbols-outlined ml-auto text-[#ffd900] text-sm">check_circle</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            Formato del Mazo
                        </label>
                        <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                            <span className="material-symbols-outlined text-[#ffd900]">
                                {initialFormat === 'Fanático' ? 'campaign' : 'public'}
                            </span>
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-wider leading-none">
                                    {initialFormat}
                                </p>
                                <p className="text-[9px] text-white/40 font-medium uppercase tracking-wider mt-1">
                                    {initialFormat === 'Fanático' 
                                        ? 'Establecido por colores uniformes en cancha' 
                                        : 'Establecido por mezcla de colores en cancha'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest flex justify-between">
                            <span>Nombre del Mazo</span>
                            {teamShortName && <span className="text-[#ffd900]/40">Equipo: {teamShortName}</span>}
                        </label>
                        <input
                            type="text"
                            value={deckName}
                            onChange={(e) => setDeckName(e.target.value)}
                            placeholder="Escribe un nombre..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-[#ffd900]/50 transition-all placeholder:text-white/10"
                        />
                        {teamShortName && deckName && (
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">
                                Vista previa: <span className="text-white/40">{previewName}</span>
                            </p>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={() => {
                                if (!deckName.trim()) {
                                    alert("Por favor, ingresa un nombre para tu mazo.");
                                    return;
                                }
                                onSave(deckName, status, format);
                            }}
                            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] active:scale-95 ${
                                status === 'PUBLIC' 
                                ? 'bg-green-500 text-white shadow-green-500/20' 
                                : 'bg-[#ffd900] text-black shadow-[#ffd900]/20'
                            }`}
                        >
                            {status === 'PUBLIC' ? 'PUBLICAR MAZO' : status === 'PRIVATE' ? 'GUARDAR COMO PRIVADO' : 'GUARDAR BORRADOR'}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3 mt-2 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-all"
                        >
                            CONTINUAR EDITANDO
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaveDeckModal;
