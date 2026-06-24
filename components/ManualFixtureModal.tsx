import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Tournament } from '../types';
import ConfirmActionModal from './ConfirmActionModal';

interface ManualFixtureModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    participants: any[];
    onStarted: () => void;
}

interface ManualMatch {
    home_id: number;
    away_id: number;
    round: number;
}

const ManualFixtureModal: React.FC<ManualFixtureModalProps> = ({ isOpen, onClose, tournament, participants, onStarted }) => {
    const [loading, setLoading] = useState(false);
    const [currentRound, setCurrentRound] = useState(1);
    const [matches, setMatches] = useState<ManualMatch[]>([]);
    const [pendingHome, setPendingHome] = useState<string>('');
    const [pendingAway, setPendingAway] = useState<string>('');
    const [errors, setErrors] = useState<string[]>([]);

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDangerous: false
    });

    const openConfirm = (props: Omit<typeof confirmConfig, 'isOpen'>) => {
        setConfirmConfig({ ...props, isOpen: true });
    };

    if (!isOpen) return null;

    const addMatch = () => {
        const homeId = parseInt(pendingHome);
        const awayId = parseInt(pendingAway);

        if (!homeId || !awayId) return;
        if (homeId === awayId) {
            setErrors(['Un equipo no puede jugar contra sí mismo']);
            return;
        }

        // Validar si ya juegan en esta ronda (local o visita)
        const alreadyPlayingInRound = matches.filter(m =>
            m.round === currentRound &&
            (m.home_id === homeId || m.home_id === awayId || m.away_id === homeId || m.away_id === awayId)
        );
        if (alreadyPlayingInRound.length > 0) {
            setErrors(['Uno de los equipos ya tiene un partido asignado en esta ronda']);
            return;
        }

        // Validar si el enfrentamiento exacto ya existe en cualquier ronda
        const matchExists = matches.find(m =>
            (m.home_id === homeId && m.away_id === awayId) ||
            (m.home_id === awayId && m.away_id === homeId)
        );
        if (matchExists) {
            openConfirm({
                title: 'Enfrentamiento Repetido',
                message: `Este enfrentamiento ya fue agregado en la Fecha ${matchExists.round}. ¿Deseas agregarlo nuevamente?`,
                onConfirm: () => {
                    setMatches([...matches, { home_id: homeId, away_id: awayId, round: currentRound }]);
                    setPendingHome('');
                    setPendingAway('');
                    setErrors([]);
                }
            });
            return;
        }

        setMatches([...matches, { home_id: homeId, away_id: awayId, round: currentRound }]);
        setPendingHome('');
        setPendingAway('');
        setErrors([]);
    };

    const removeMatch = (index: number) => {
        setMatches(matches.filter((_, i) => i !== index));
    };

    const handleSaveFixture = async () => {
        setLoading(true);
        try {
            await apiService.startTournament(tournament.id, 'manual', {
                matches: matches
            });
            onStarted();
            onClose();
        } catch (error: any) {
            alert(error.message || 'Error al guardar el fixture');
        } finally {
            setLoading(false);
        }
    };

    const getTeamName = (id: number) => participants.find(p => String(p.team_id) === String(id))?.team_name || 'Desconocido';

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#ffd900]"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Generación Manual de Fixture</h2>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">{tournament.name} ({tournament.structure})</p>
                        </div>
                        <button onClick={onClose} className="size-10 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Panel de Creación */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest block">Seleccionar Fecha</label>
                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4">
                                <button onClick={() => setCurrentRound(Math.max(1, currentRound - 1))} className="text-[#ffd900]">
                                    <span className="material-symbols-outlined">remove_circle</span>
                                </button>
                                <span className="flex-1 text-center text-xl font-black text-white italic italic">FECHA {currentRound}</span>
                                <button onClick={() => setCurrentRound(currentRound + 1)} className="text-[#ffd900]">
                                    <span className="material-symbols-outlined">add_circle</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 p-6 bg-white/5 border border-white/5">
                            <h4 className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-4">Agregar Enfrentamiento</h4>

                            <div className="grid grid-cols-1 gap-4">
                                <select
                                    value={pendingHome}
                                    onChange={(e) => setPendingHome(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-4 text-white text-xs focus:outline-none focus:border-[#ffd900] appearance-none"
                                >
                                    <option value="">Seleccionar Local...</option>
                                    {participants.map(p => (
                                        <option key={p.team_id} value={p.team_id}>{p.team_name}</option>
                                    ))}
                                </select>

                                <div className="text-center text-[#ffd900] font-black italic text-xs uppercase tracking-widest">VS</div>

                                <select
                                    value={pendingAway}
                                    onChange={(e) => setPendingAway(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-4 text-white text-xs focus:outline-none focus:border-[#ffd900] appearance-none"
                                >
                                    <option value="">Seleccionar Visita...</option>
                                    {participants.map(p => (
                                        <option key={p.team_id} value={p.team_id}>{p.team_name}</option>
                                    ))}
                                </select>
                            </div>

                            {errors.length > 0 && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-wider">
                                    {errors[0]}
                                </div>
                            )}

                            <button
                                onClick={addMatch}
                                className="w-full py-4 bg-[#ffd900] text-black font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-transform"
                            >
                                AGREGAR PARTIDO
                            </button>
                        </div>
                    </div>

                    {/* Lista de Partidos Visual */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Resumen del Fixture ({matches.length} partidos)</h4>

                        <div className="space-y-6">
                            {[...new Set(matches.map(m => m.round))].sort((a: any, b: any) => Number(a) - Number(b)).map(round => (
                                <div key={round} className="space-y-2">
                                    <h5 className="text-[9px] font-black text-[#ffd900] uppercase tracking-widest">Fecha {round}</h5>
                                    <div className="grid grid-cols-1 gap-1">
                                        {matches.filter(m => m.round === round).map((match, idx) => (
                                            <div key={idx} className="bg-white/5 p-3 flex justify-between items-center group hover:bg-white/10 transition-colors">
                                                <div className="flex-1 text-[10px] font-black text-white truncate">{getTeamName(match.home_id)}</div>
                                                <div className="px-4 text-[9px] font-black text-white/20 italic">VS</div>
                                                <div className="flex-1 text-[10px] font-black text-white text-right truncate">{getTeamName(match.away_id)}</div>
                                                <button
                                                    onClick={() => removeMatch(matches.indexOf(match))}
                                                    className="ml-4 text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-white/5 bg-black/20 shrink-0 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/5 hover:text-white transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveFixture}
                        disabled={loading || matches.length === 0}
                        className={`px-10 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${loading || matches.length === 0
                            ? 'bg-white/5 text-white/10 cursor-not-allowed'
                            : 'bg-[#ffd900] text-black hover:scale-105 shadow-[0_0_30px_rgba(255,217,0,0.15)]'
                            }`}
                    >
                        {loading ? <div className="size-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div> : <span className="material-symbols-outlined text-lg">save</span>}
                        GUARDAR FIXTURE E INICIAR
                    </button>
                </div>
            </div>

            <ConfirmActionModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDangerous={confirmConfig.isDangerous}
                confirmText="Confirmar"
            />
        </div>
    );
};

export default ManualFixtureModal;
