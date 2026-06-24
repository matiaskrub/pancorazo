import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ScheduleMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any;
    onScheduled: () => void;
}

const ScheduleMatchModal: React.FC<ScheduleMatchModalProps> = ({ isOpen, onClose, match, onScheduled }) => {
    const initialPlayedAt = match?.played_at || '';
    const [date, setDate] = useState(initialPlayedAt ? initialPlayedAt.substring(0, 10) : '');
    const [time, setTime] = useState(initialPlayedAt && initialPlayedAt.length > 10 ? initialPlayedAt.substring(11, 16) : '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && match) {
            const currentPlayedAt = match.played_at || '';
            setDate(currentPlayedAt ? currentPlayedAt.substring(0, 10) : '');
            setTime(currentPlayedAt && currentPlayedAt.length > 10 ? currentPlayedAt.substring(11, 16) : '');
        }
    }, [isOpen, match]);

    if (!isOpen || !match) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) {
            alert('Por favor selecciona una fecha');
            return;
        }

        const fullDateTime = time ? `${date} ${time}` : date;

        setLoading(true);
        try {
            await apiService.scheduleMatch(match.id, fullDateTime);
            onScheduled();
            onClose();
        } catch (error: any) {
            alert('Error al programar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={handleBackdropClick}>
            <div className="bg-[#0b121f] border border-white/10 p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#ffd900]"></div>

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Pactar Encuentro</h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">ID #{match.id} • {match.home_name} vs {match.away_name}</p>
                    </div>
                    <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-2">Fecha (Obligatoria)</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-sm focus:border-[#ffd900] transition-colors outline-none h-14 [color-scheme:dark]"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-2">Hora (Opcional)</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white text-sm focus:border-[#ffd900] transition-colors outline-none h-14 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                    <p className="text-[9px] text-white/20 uppercase italic">* Esta fecha aparecerá como tentativa en el calendario público hasta que se registre el resultado oficial.</p>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 border border-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] bg-[#ffd900] text-black px-6 py-4 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,217,0,0.1)]"
                        >
                            {loading ? (
                                <div className="size-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">event_available</span>
                                    Actualizar Programación
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleMatchModal;
