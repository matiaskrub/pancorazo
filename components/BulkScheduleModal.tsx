import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface BulkScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string | number;
    maxRound: number;
    defaultRound: number | 'all';
    onScheduled: () => void;
}

const BulkScheduleModal: React.FC<BulkScheduleModalProps> = ({ 
    isOpen, 
    onClose, 
    tournamentId, 
    maxRound, 
    defaultRound, 
    onScheduled 
}) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [scope, setScope] = useState<number | 'all'>('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDate('');
            setTime('');
            // Si defaultRound es un número válido, preseleccionamos esa ronda
            if (defaultRound !== 'all' && Number(defaultRound) > 0) {
                setScope(Number(defaultRound));
            } else {
                setScope('all');
            }
        }
    }, [isOpen, defaultRound]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date) {
            alert('Por favor selecciona una fecha');
            return;
        }

        const fullDateTime = time ? `${date} ${time}:00` : `${date} 00:00:00`;

        setLoading(true);
        try {
            const res = await apiService.scheduleMatchesBulk(tournamentId, fullDateTime, scope);
            alert(res.message || 'Partidos programados correctamente');
            onScheduled();
            onClose();
        } catch (error: any) {
            alert('Error al programar en bloque: ' + error.message);
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
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Programar Partidos</h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Asignación Masiva de Fechas</p>
                    </div>
                    <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-2">Alcance de la Programación</label>
                        <select
                            value={scope}
                            onChange={(e) => setScope(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                            className="w-full bg-[#162032] border border-white/10 px-4 py-3 text-white text-sm focus:border-[#ffd900] transition-colors outline-none h-14"
                        >
                            <option value="all">Todo el Torneo (Todas las Rondas)</option>
                            {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => (
                                <option key={r} value={r}>Ronda {r}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-2">Fecha (Obligatoria)</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-[#162032] border border-white/10 px-4 py-3 text-white text-sm focus:border-[#ffd900] transition-colors outline-none h-14 [color-scheme:dark]"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-2">Hora (Opcional)</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-[#162032] border border-white/10 px-4 py-3 text-white text-sm focus:border-[#ffd900] transition-colors outline-none h-14 [color-scheme:dark]"
                            />
                        </div>
                    </div>
                    <p className="text-[9px] text-white/20 uppercase italic">* Solo se programarán los partidos que aún no hayan sido jugados (estado calendarizado y sin resultado).</p>

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
                                    <span className="material-symbols-outlined text-sm">auto_schedule</span>
                                    Programar Bloque
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkScheduleModal;
