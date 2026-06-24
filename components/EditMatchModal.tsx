import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { Team, Tournament } from '../types';
import { calculateEloChange, MatchContext } from '../utils/eloUtils';

interface EditMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMatchUpdated: () => void;
    match: any;
}

interface MatchEvent {
    id: string;
    type: 'YELLOW_CARD' | 'RED_CARD' | 'INJURY';
    team_id: string;
    card_id: string;
    card_name: string;
    description: string;
    searchResults?: any[];
}

const EditMatchModal: React.FC<EditMatchModalProps> = ({ isOpen, onClose, onMatchUpdated, match }) => {
    // Form State
    const [context, setContext] = useState<MatchContext>('Normal');
    const [tournamentId, setTournamentId] = useState<string>('');
    const [seriesId, setSeriesId] = useState<string>('');
    const [homeTeam, setHomeTeam] = useState<Team | null>(null);
    const [awayTeam, setAwayTeam] = useState<Team | null>(null);
    const [scoreHome, setScoreHome] = useState<number | ''>('');
    const [scoreAway, setScoreAway] = useState<number | ''>('');
    const [penaltiesHome, setPenaltiesHome] = useState<number | ''>('');
    const [penaltiesAway, setPenaltiesAway] = useState<number | ''>('');
    const [manualPenalties, setManualPenalties] = useState(false);
    const [isWO, setIsWO] = useState(false);
    const [status, setStatus] = useState('PENDING');
    const [matchDate, setMatchDate] = useState<string>('');
    const [matchTime, setMatchTime] = useState<string>('');
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [proofUrl, setProofUrl] = useState<string>('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [adminEloHome, setAdminEloHome] = useState<number | ''>('');
    const [adminEloAway, setAdminEloAway] = useState<number | ''>('');
    const [adminReason, setAdminReason] = useState('');

    // Helpers
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && match) {
            loadInitialData();
        }
    }, [isOpen, match]);

    const loadInitialData = async () => {
        try {
            const [tData, teamsData] = await Promise.all([
                apiService.getTournaments(),
                apiService.getTeams(false, true)
            ]);
            setTournaments(tData);
            setTeams(teamsData);

            // Initialize form with match data
            setContext(match.elo_type || 'Normal');
            setTournamentId(match.tournament_id || '');
            setSeriesId(match.series_id || '');
            setScoreHome(match.score_home);
            setScoreAway(match.score_away);
            setPenaltiesHome(match.penalties_home !== null ? match.penalties_home : '');
            setPenaltiesAway(match.penalties_away !== null ? match.penalties_away : '');
            setManualPenalties(match.penalties_home !== null || match.penalties_away !== null);
            setIsWO(!!match.is_wo);
            setStatus(match.status || 'PENDING');
            setMatchDate(match.played_at ? match.played_at.substring(0, 10) : '');
            setMatchTime(match.played_at && match.played_at.length > 10 ? match.played_at.substring(11, 16) : '');
            setProofUrl(match.proof_url || '');
            setProofFile(null);

            setIsAdminMode(!!match.admin_elo_home || !!match.admin_elo_away);
            setAdminEloHome(match.admin_elo_home || '');
            setAdminEloAway(match.admin_elo_away || '');
            setAdminReason(match.admin_reason || '');

            // Set teams
            const hTeam = teamsData.find((t: any) => t.id === match.team_home_id);
            const aTeam = teamsData.find((t: any) => t.id === match.team_away_id);
            setHomeTeam(hTeam || null);
            setAwayTeam(aTeam || null);

            // Fetch events if match id exists
            if (match.events) {
                setEvents(match.events.map((e: any) => ({
                    id: Math.random().toString(),
                    type: e.event || 'YELLOW_CARD',
                    team_id: e.team_id,
                    card_id: e.card_id,
                    card_name: e.card_name || 'Carta Desconocida',
                    description: e.description
                })));
            } else {
                setEvents([]);
            }
        } catch (err) {
            console.error('Error loading data:', err);
        }
    };

    const isDraw = scoreHome !== '' && scoreAway !== '' && scoreHome === scoreAway;
    const needsPenalties = useMemo(() => {
        if (!isDraw) return false;

        const currentTournament = tournaments.find(t => 
            t.id && tournamentId && String(t.id) === String(tournamentId)
        );
        const structure = currentTournament?.structure?.toLowerCase().trim();

        if (structure === 'copa') return true;
        if (structure === 'liga' || structure === 'suizo') return false;

        return manualPenalties;
    }, [isDraw, tournamentId, tournaments, manualPenalties]);

    const currentTournament = useMemo(() => {
        return tournaments.find(t => String(t.id) === String(tournamentId));
    }, [tournaments, tournamentId]);

    const eloChange = useMemo(() => {
        if (isAdminMode) {
            return typeof adminEloHome === 'number' ? adminEloHome : 0;
        }
        if (homeTeam && awayTeam && typeof scoreHome === 'number' && typeof scoreAway === 'number') {
            return calculateEloChange(
                Number(homeTeam.current_elo),
                Number(awayTeam.current_elo),
                scoreHome,
                scoreAway,
                currentTournament?.tournament_type
            );
        }
        return 0;
    }, [homeTeam, awayTeam, scoreHome, scoreAway, currentTournament, isAdminMode, adminEloHome]);

    const handleUpdate = async () => {
        setIsLoading(true);
        setError('');
        try {
            let finalProofUrl = proofUrl;
            if (proofFile) {
                const uploadResult = await apiService.uploadImage(proofFile, 'documentos');
                if (uploadResult.status === 'success') {
                    finalProofUrl = uploadResult.url;
                } else {
                    throw new Error('Error al subir el archivo de evidencia: ' + uploadResult.message);
                }
            }

            const payload = {
                tournament_id: tournamentId,
                series_id: seriesId,
                team_home_id: homeTeam?.id,
                team_away_id: awayTeam?.id,
                score_home: scoreHome,
                score_away: scoreAway,
                penalties_home: penaltiesHome === '' ? null : penaltiesHome,
                penalties_away: penaltiesAway === '' ? null : penaltiesAway,
                elo_type: currentTournament?.tournament_type || 'pichanga',
                is_wo: isWO ? 1 : 0,
                status: status,
                played_at: matchDate ? (matchTime ? `${matchDate} ${matchTime}:00` : `${matchDate} 00:00:00`) : null,
                admin_elo_home: isAdminMode ? adminEloHome : null,
                admin_elo_away: isAdminMode ? adminEloAway : null,
                admin_reason: isAdminMode ? adminReason : null,
                diff: isAdminMode ? adminEloHome : eloChange,
                proof_url: finalProofUrl || null,
                events: events.map(e => ({
                    team_id: e.team_id,
                    card_id: e.card_id,
                    event: e.type,
                    description: e.description
                }))
            };

            await apiService.updateMatch(match.id, payload);
            onMatchUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el partido');
        } finally {
            setIsLoading(false);
        }
    };

    const searchCardsForEvent = async (index: number, query: string) => {
        if (query.length < 2) {
            const newEvents = [...events];
            newEvents[index].searchResults = [];
            setEvents(newEvents);
            return;
        }
        try {
            const cards = await apiService.getCards({ search: query, type: 'Jugador' });
            const newEvents = [...events];
            newEvents[index].searchResults = cards.slice(0, 5);
            setEvents(newEvents);
        } catch (err) {
            console.error('Error searching cards:', err);
        }
    };

    const selectCardForEvent = (index: number, card: any) => {
        const newEvents = [...events];
        newEvents[index].card_id = card.id;
        newEvents[index].card_name = card.name;
        newEvents[index].searchResults = [];
        setEvents(newEvents);
    };

    if (!isOpen || !match) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-[#0b121f] border border-white/10 rounded-sm w-full max-w-5xl shadow-2xl relative">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#ffd900]">Edición de Resultado Oficial</h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">ID del Encuentro: #{match.id}</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="p-4 md:p-8 max-h-[85vh] md:max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mb-6">
                            <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Left Column: Context & Score */}
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Contexto del Duelo</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[8px] font-black text-white/20 uppercase">Torneo</label>
                                        <select
                                            value={tournamentId}
                                            onChange={(e) => setTournamentId(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-[10px] text-white focus:outline-none focus:border-[#ffd900]"
                                        >
                                            <option value="">Sin Torneo</option>
                                            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-white/20 uppercase">Fecha</label>
                                                <input
                                                    type="date"
                                                    value={matchDate}
                                                    onChange={(e) => setMatchDate(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-[10px] text-white focus:outline-none focus:border-[#ffd900] [color-scheme:dark]"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-white/20 uppercase">Hora (Opcional)</label>
                                                <input
                                                    type="time"
                                                    value={matchTime}
                                                    onChange={(e) => setMatchTime(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-[10px] text-white focus:outline-none focus:border-[#ffd900] [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-white/20 uppercase">Estado Actual</label>
                                        <div className={`w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-[10px] font-bold ${status === 'WALKOVER' ? 'text-red-500' : 'text-[#ffd900]'}`}>
                                            {status === 'WALKOVER' ? 'ADMIN (WALKOVER)' :
                                                status === 'COMPLETED' ? 'JUGADO' :
                                                    status === 'PENDING' ? 'PENDIENTE' :
                                                        status === 'SCHEDULED' ? 'PROGRAMADO' : status}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-white/20 uppercase">Evidencia (Subir Archivo)</label>
                                        <div className="flex items-center gap-2">
                                            <label className="flex-1 flex items-center justify-between bg-white/5 border border-white/10 border-dashed rounded-sm px-3 py-1.5 text-[9px] text-white/60 hover:border-[#ffd900] hover:text-white cursor-pointer transition-all truncate">
                                                <span className="truncate max-w-[120px]">
                                                    {proofFile ? proofFile.name : (proofUrl ? 'Evidencia' : 'Seleccionar...')}
                                                </span>
                                                <span className="material-symbols-outlined text-xs text-[#ffd900]">upload_file</span>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        setProofFile(file);
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                            {proofUrl && !proofFile && (
                                                <a 
                                                    href={apiService.resolveImageUrl(proofUrl)} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-[9px] font-black text-[#ffd900] hover:underline whitespace-nowrap bg-white/5 border border-white/10 px-2 py-1.5 rounded-sm flex items-center gap-0.5"
                                                >
                                                    VER <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white/5 border border-white/10 p-6 rounded-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex flex-col items-center gap-3 w-1/3 text-center">
                                        <div className="size-16 bg-black/40 border border-white/10 flex items-center justify-center p-3 rounded-sm">
                                            {homeTeam?.logo_url ? <img src={apiService.resolveImageUrl(homeTeam.logo_url)} className="w-full h-full object-contain" /> : <span className="material-symbols-outlined text-white/10">shield</span>}
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-white tracking-widest truncate w-full">{homeTeam?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            min="0"
                                            value={scoreHome}
                                            onChange={(e) => setScoreHome(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                            className="w-16 h-16 bg-black/40 border-2 border-[#ffd900]/20 rounded text-2xl font-black text-center text-white focus:border-[#ffd900]"
                                        />
                                        <span className="text-white/20 font-black">—</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={scoreAway}
                                            onChange={(e) => setScoreAway(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                            className="w-16 h-16 bg-black/40 border-2 border-[#ffd900]/20 rounded text-2xl font-black text-center text-white focus:border-[#ffd900]"
                                        />
                                    </div>
                                    <div className="flex flex-col items-center gap-3 w-1/3 text-center">
                                        <div className="size-16 bg-black/40 border border-white/10 flex items-center justify-center p-3 rounded-sm">
                                            {awayTeam?.logo_url ? <img src={apiService.resolveImageUrl(awayTeam.logo_url)} className="w-full h-full object-contain" /> : <span className="material-symbols-outlined text-white/10">shield</span>}
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-white tracking-widest truncate w-full">{awayTeam?.name}</span>
                                    </div>
                                </div>

                                {isDraw && (() => {
                                    const currentTournament = tournaments.find(t => 
                                        t.id && tournamentId && String(t.id) === String(tournamentId)
                                    );
                                    const structure = currentTournament?.structure?.toLowerCase().trim();
                                    return (!tournamentId || structure === 'híbrido' || structure === 'hibrido' || (!structure && tournamentId === ''));
                                })() && (
                                    <div className="flex items-center gap-3 p-4 bg-[#ffd900]/5 border border-[#ffd900]/20 rounded-sm mb-4 animate-in fade-in duration-300">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={manualPenalties}
                                                onChange={(e) => setManualPenalties(e.target.checked)}
                                                className="size-4 rounded-sm border-white/10 bg-white/5 checked:bg-[#ffd900] appearance-none transition-all cursor-pointer"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest group-hover:text-white transition-colors">¿Definición por Penales?</span>
                                                <span className="text-[7px] text-white/40 uppercase font-bold tracking-widest mt-0.5">Activar marcador de tanda de penales</span>
                                            </div>
                                        </label>
                                    </div>
                                )}

                                {needsPenalties && (
                                    <div className="grid grid-cols-2 gap-4 md:gap-8 pb-4 animate-in zoom-in duration-300">
                                        <div className="flex flex-col items-center gap-2">
                                            <label className="text-[8px] font-black text-white/20 uppercase">Penales Local</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={penaltiesHome}
                                                onChange={(e) => setPenaltiesHome(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                                className="w-16 py-2 bg-black/40 border-2 border-[#ffd900]/50 rounded text-xs text-center text-white focus:border-[#ffd900]"
                                            />
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <label className="text-[8px] font-black text-white/20 uppercase">Penales Visita</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={penaltiesAway}
                                                onChange={(e) => setPenaltiesAway(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                                className="w-16 py-2 bg-black/40 border-2 border-[#ffd900]/50 rounded text-xs text-center text-white focus:border-[#ffd900]"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={isAdminMode}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setIsAdminMode(checked);
                                                    setIsWO(checked);
                                                    if (checked) {
                                                        setStatus('WALKOVER');
                                                    } else {
                                                        // Restaurar a COMPLETED si tiene puntaje, o PENDING si no
                                                        setStatus(scoreHome !== '' && scoreAway !== '' ? 'COMPLETED' : 'PENDING');
                                                    }
                                                }}
                                                className="size-4 rounded-sm border-white/10 bg-white/5 checked:bg-[#ffd900] appearance-none transition-all cursor-pointer"
                                            />
                                            <span className="text-[9px] font-black text-[#ffd900] uppercase tracking-widest group-hover:text-white transition-colors">MODO ADMIN (WALKOVER)</span>
                                        </label>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-white/20 uppercase block mb-1">Impacto ELO</span>
                                            <span className={`text-[11px] font-black italic ${eloChange > 0 ? 'text-green-500' : eloChange < 0 ? 'text-red-500' : 'text-white'}`}>
                                                {eloChange > 0 ? `+${eloChange}` : eloChange} PTOS
                                            </span>
                                        </div>
                                    </div>

                                    {isAdminMode && (
                                        <div className="space-y-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[7px] font-black text-white/20 uppercase">Diferencia ELO Local (+/-)</label>
                                                    <input
                                                        type="number"
                                                        value={adminEloHome}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                                                            setAdminEloHome(val);
                                                        }}
                                                        placeholder="Ej: +15 o -10"
                                                        className="w-full bg-black/40 border border-[#ffd900]/30 rounded px-3 py-2 text-[10px] text-white focus:border-[#ffd900]"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[7px] font-black text-white/20 uppercase">Diferencia ELO Visita (+/-)</label>
                                                    <input
                                                        type="number"
                                                        value={adminEloAway}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                                                            setAdminEloAway(val);
                                                        }}
                                                        placeholder="Ej: -15 o +10"
                                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-[10px] text-white focus:border-[#ffd900]"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[7px] font-black text-white/20 uppercase">Observación / Razón del ajuste manual</label>
                                                <textarea
                                                    value={adminReason}
                                                    onChange={(e) => setAdminReason(e.target.value)}
                                                    rows={2}
                                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-[10px] text-white focus:border-[#ffd900] resize-none"
                                                    placeholder="Ej: Declaración de W.O. Administrativo..."
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Events */}
                        <div className="space-y-6 flex flex-col h-full">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Crónica de Eventos TCG</h3>
                                <button
                                    onClick={() => setEvents([...events, { id: Date.now().toString(), type: 'YELLOW_CARD', team_id: homeTeam?.id || '', card_id: '', card_name: '', description: '' }])}
                                    className="text-[9px] font-black text-[#ffd900] bg-[#ffd900]/10 px-3 py-1.5 border border-[#ffd900]/20 hover:bg-[#ffd900] hover:text-black transition-all"
                                >
                                    + EVENTO
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 space-y-3 custom-scrollbar">
                                {events.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/5 rounded-sm py-20 grayscale opacity-20">
                                        <span className="material-symbols-outlined text-4xl mb-2">style</span>
                                        <p className="text-[9px] font-black uppercase tracking-widest">Sin incidencia de cartas</p>
                                    </div>
                                ) : (
                                    events.map((event, idx) => (
                                        <div key={event.id} className="bg-white/5 border border-white/10 p-4 rounded-sm relative group">
                                            <button
                                                onClick={() => setEvents(events.filter(e => e.id !== event.id))}
                                                className="absolute -top-2 -right-2 size-5 bg-red-500 rounded-full flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform shadow-lg z-10"
                                            >
                                                <span className="material-symbols-outlined text-[10px]">close</span>
                                            </button>

                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[7px] font-black text-white/20 uppercase">Tipo</label>
                                                    <select
                                                        value={event.type}
                                                        onChange={(e) => {
                                                            const n = [...events]; n[idx].type = e.target.value as any; setEvents(n);
                                                        }}
                                                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:outline-none"
                                                    >
                                                        <option value="YELLOW_CARD">AMARILLA</option>
                                                        <option value="RED_CARD">ROJA</option>
                                                        <option value="INJURY">LESIÓN</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[7px] font-black text-white/20 uppercase">Equipo</label>
                                                    <select
                                                        value={event.team_id}
                                                        onChange={(e) => {
                                                            const n = [...events]; n[idx].team_id = e.target.value; setEvents(n);
                                                        }}
                                                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:outline-none"
                                                    >
                                                        <option value={homeTeam?.id}>{homeTeam?.short_name || 'LOCAL'}</option>
                                                        <option value={awayTeam?.id}>{awayTeam?.short_name || 'VISITA'}</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2 lg:col-span-1 space-y-1 relative">
                                                    <label className="text-[7px] font-black text-white/20 uppercase">Carta TCG</label>
                                                    <input
                                                        type="text"
                                                        value={event.card_name}
                                                        onChange={(e) => {
                                                            const n = [...events]; n[idx].card_name = e.target.value; n[idx].card_id = ''; setEvents(n);
                                                            searchCardsForEvent(idx, e.target.value);
                                                        }}
                                                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:border-[#ffd900]"
                                                        placeholder="Buscar..."
                                                    />
                                                    {event.searchResults && event.searchResults.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 z-[120] bg-[#1a2332] border border-white/10 mt-1 shadow-2xl rounded-sm">
                                                            {event.searchResults.map(card => (
                                                                <button key={card.id} onClick={() => selectCardForEvent(idx, card)} className="w-full text-left px-2 py-1.5 text-[8px] hover:bg-[#ffd900] hover:text-black transition-colors flex justify-between">
                                                                    <span>{card.name}</span>
                                                                    <span className="opacity-40 italic">{card.rarity}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {event.card_id && <span className="absolute -top-1 right-0 text-[6px] text-green-500 font-bold uppercase">Linked</span>}
                                                </div>

                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-[7px] font-black text-white/20 uppercase">Observación / Descripción</label>
                                                    <input
                                                        type="text"
                                                        value={event.description}
                                                        onChange={(e) => {
                                                            const n = [...events]; n[idx].description = e.target.value; setEvents(n);
                                                        }}
                                                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:border-[#ffd900]"
                                                        placeholder="Ej: Jugada clave, tarjeta por reclamo..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex justify-end gap-4 bg-white/5 -mx-8 -mb-8 p-8 border-t border-white/5 rounded-b-sm">
                        <button
                            onClick={onClose}
                            className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                        >
                            CANCELAR
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={isLoading}
                            className="px-12 py-3 bg-[#ffd900] text-black text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl disabled:opacity-50"
                        >
                            {isLoading ? 'GUARDANDO...' : 'ACTUALIZAR RESULTADO'}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,217,0,0.3); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ffd900; }
            `}</style>
        </div>
    );
};

export default EditMatchModal;
