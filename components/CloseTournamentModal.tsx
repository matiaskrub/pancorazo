import React, { useState, useMemo } from 'react';
import { apiService } from '../services/api';
import { Tournament } from '../types';

interface CloseTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    participants: any[];
    onClosed: () => void;
}

const CloseTournamentModal: React.FC<CloseTournamentModalProps> = ({ isOpen, onClose, tournament, participants, onClosed }) => {
    const isJo = Number(tournament.is_jo) === 1;

    // Calcular sugerencias basadas en el motor del torneo o tabla de clasificación
    const suggestions = useMemo(() => {
        const standings = (tournament as any).standings || [];
        const suggestedPodium = (tournament as any).suggested_podium || [];

        const res: any = {
            podium: {} as Record<number, string>
        };

        // Prioridad 1: Sugerencias explícitas del motor (CopaEngine, etc.)
        if (suggestedPodium.length > 0) {
            suggestedPodium.forEach((p: any) => {
                res.podium[p.position] = String(p.team_id);
            });
        }

        // Prioridad 2: Traducir standings a podio si no hay sugerencias
        if (standings.length > 0) {
            if (Object.keys(res.podium).length === 0) {
                standings.slice(0, 4).forEach((s: any, i: number) => {
                    res.podium[i + 1] = String(s.team_id);
                });
            }

            // Estadísticas JO (GF, GC, Tarjetas)
            const sortedByGf = [...standings].sort((a, b) => b.gf - a.gf);
            const sortedByGc = [...standings].sort((a, b) => a.gc - b.gc);
            const sortedByCards = [...standings].sort((a, b) => (a.fair_play_score ?? 0) - (b.fair_play_score ?? 0));

            res.topScorer = String(sortedByGf[0]?.team_id || '');
            res.bestDefense = String(sortedByGc[0]?.team_id || '');
            res.fairPlay = String(sortedByCards[0]?.team_id || '');
        }

        return res;
    }, [tournament]);

    const [podium, setPodium] = useState<Record<number, string>>({
        1: suggestions?.podium[1] || '',
        2: suggestions?.podium[2] || '',
        3: suggestions?.podium[3] || '',
        4: suggestions?.podium[4] || ''
    });

    const [stats, setStats] = useState({
        top_scorer_team_id: suggestions?.topScorer || '',
        best_defense_team_id: suggestions?.bestDefense || '',
        fair_play_team_id: suggestions?.fairPlay ? [suggestions.fairPlay] : ([] as string[])
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    // Determinar cuántos puestos elegir según participantes (solo para JO)
    // Determinar cuántos puestos elegir según participantes y estructura
    const podiumCount = isJo ? (
        participants.length <= 4 ? 2 :
            participants.length === 5 ? 3 : 4
    ) : (
        Object.keys(suggestions?.podium || {}).length > 1 ? Object.keys(suggestions.podium).length : 1
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        if (!podium[1]) {
            setError('Debes seleccionar al menos un campeón');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await apiService.closeTournament({
                id: tournament.id,
                champion_id: podium[1],
                podium: isJo ? podium : { 1: podium[1] },
                stats: isJo ? stats : null,
                is_jo: tournament.is_jo
            });
            alert('¡Torneo cerrado con éxito!');
            onClosed();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al cerrar el torneo');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className={`w-full ${isJo ? 'max-w-4xl' : 'max-w-md'} bg-[#1a2235] border border-white/10 rounded-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300`}>
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Cerrar Torneo</h2>
                            <p className="text-[10px] font-bold text-[#ffd900] uppercase tracking-[0.2em] mt-1">{tournament.name}</p>
                        </div>
                        <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className={`grid grid-cols-1 ${isJo ? 'md:grid-cols-2' : ''} gap-8`}>
                            {/* Sección del Podio */}
                            <div className="space-y-6">
                                <h3 className="text-[11px] font-black text-[#ffd900] uppercase tracking-widest border-b border-white/5 pb-2">Definir Podio</h3>
                                {Array.from({ length: podiumCount }).map((_, i) => {
                                    const pos = i + 1;
                                    return (
                                        <div key={pos} className="space-y-2">
                                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                                                {pos === 1 ? 'CAMPEÓN' : pos === 2 ? 'SUB-CAMPEÓN' : `${pos}to Puesto`}
                                            </label>
                                            <select
                                                value={podium[pos] || ''}
                                                onChange={(e) => setPodium({ ...podium, [pos]: e.target.value })}
                                                className={`w-full bg-white/5 border ${pos === 1 ? 'border-[#ffd900]/40' : 'border-white/10'} rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ffd900] appearance-none`}
                                            >
                                                <option value="">Elegir equipo...</option>
                                                {participants.map((p) => (
                                                    <option key={p.team_id} value={p.team_id}>{p.team_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Sección de Estadísticas (Solo JO) */}
                            {isJo && (
                                <div className="space-y-6">
                                    <h3 className="text-[11px] font-black text-[#ffd900] uppercase tracking-widest border-b border-white/5 pb-2">Reconocimientos Especiales</h3>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Más Goles Anotados (GF)</label>
                                            <select
                                                value={stats.top_scorer_team_id}
                                                onChange={(e) => setStats({ ...stats, top_scorer_team_id: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ffd900] appearance-none"
                                            >
                                                <option value="">Elegir equipo...</option>
                                                {participants.map((p) => (
                                                    <option key={p.team_id} value={p.team_id}>{p.team_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Menos Goles Recibidos (GC)</label>
                                            <select
                                                value={stats.best_defense_team_id}
                                                onChange={(e) => setStats({ ...stats, best_defense_team_id: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ffd900] appearance-none"
                                            >
                                                <option value="">Elegir equipo...</option>
                                                {participants.map((p) => (
                                                    <option key={p.team_id} value={p.team_id}>{p.team_name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2 block">Juego Limpio (Menos Tarjetas)</label>
                                            <div className="text-[10px] text-white/50 mb-2 italic">
                                                * Si no seleccionas ninguno, todos los equipos recibirán el bono por defecto.
                                            </div>
                                            <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {participants.map((p) => {
                                                    const isChecked = stats.fair_play_team_id.includes(String(p.team_id));
                                                    return (
                                                        <label key={`fp-${p.team_id}`} className={`flex items-center p-2 rounded-sm cursor-pointer transition-colors ${isChecked ? 'bg-[#ffd900]/10 border border-[#ffd900]/50' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    const id = String(p.team_id);
                                                                    setStats(prev => ({
                                                                        ...prev,
                                                                        fair_play_team_id: checked 
                                                                            ? [...prev.fair_play_team_id, id] 
                                                                            : prev.fair_play_team_id.filter(tid => tid !== id)
                                                                    }));
                                                                }}
                                                                className="mr-3 accent-[#ffd900]"
                                                            />
                                                            <span className={`text-xs ${isChecked ? 'text-[#ffd900] font-bold' : 'text-white'}`}>{p.team_name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {isJo && (
                            <div className="bg-[#ffd900]/5 border border-[#ffd900]/20 p-5 rounded-sm">
                                <p className="text-[10px] font-bold text-[#ffd900] uppercase tracking-widest leading-relaxed">
                                    <span className="material-symbols-outlined text-[12px] align-middle mr-2">stars</span>
                                    MODO JO: El sistema ha sugerido ganadores basándose en la tabla de clasificación. Confirma los resultados para actualizar el palmarés histórico.
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-sm">
                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-5 font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${isLoading ? 'bg-white/5 text-white/20' : 'bg-[#ffd900] text-black hover:scale-[1.01] shadow-[0_0_30px_rgba(255,217,0,0.2)]'
                                }`}
                        >
                            {isLoading ? 'PROCESANDO CIERRE...' : 'FINALIZAR TORNEO Y ACTUALIZAR PALMARÉS'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CloseTournamentModal;
