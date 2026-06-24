import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { Team, Tournament } from '../types';
import { calculateEloChange, MatchContext } from '../utils/eloUtils';

interface MatchRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMatchRegistered: () => void;
    initialTournamentId?: string;
    initialContext?: MatchContext;
    initialHomeTeam?: Team | null;
    initialAwayTeam?: Team | null;
    initialMatchId?: string;
    initialPlayedAt?: string;
}

interface MatchEvent {
    id: string;
    type: 'YELLOW_CARD' | 'RED_CARD' | 'INJURY';
    team_id: string;
    card_id: string;
    card_name: string;
    description: string;
    searchResults?: any[]; // Para el dropdown de búsqueda
}

const MatchRegistrationModal: React.FC<MatchRegistrationModalProps> = ({
    isOpen,
    onClose,
    onMatchRegistered,
    initialTournamentId,
    initialContext,
    initialHomeTeam,
    initialAwayTeam,
    initialMatchId,
    initialPlayedAt
}) => {
    // Form State
    const [step, setStep] = useState(1);
    const [matchId, setMatchId] = useState<string>(initialMatchId || '');
    const [context, setContext] = useState<MatchContext>(initialContext || 'Normal');
    const [tournamentId, setTournamentId] = useState<string>(initialTournamentId || '');
    const [seriesId, setSeriesId] = useState<string>('');
    const [homeTeam, setHomeTeam] = useState<Team | null>(initialHomeTeam || null);
    const [awayTeam, setAwayTeam] = useState<Team | null>(initialAwayTeam || null);
    const [scoreHome, setScoreHome] = useState<number | ''>('');
    const [scoreAway, setScoreAway] = useState<number | ''>('');
    const [penaltiesHome, setPenaltiesHome] = useState<number | ''>('');
    const [penaltiesAway, setPenaltiesAway] = useState<number | ''>('');
    const [manualPenalties, setManualPenalties] = useState(false);
    const [isWO, setIsWO] = useState(false);
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [matchDate, setMatchDate] = useState<string>(
        initialPlayedAt ? initialPlayedAt.substring(0, 10) : ''
    );
    const [matchTime, setMatchTime] = useState<string>(
        initialPlayedAt && initialPlayedAt.length > 10 ? initialPlayedAt.substring(11, 16) : ''
    );
    const [proofUrl, setProofUrl] = useState<string>('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [adminEloHome, setAdminEloHome] = useState<number | ''>('');
    const [adminEloAway, setAdminEloAway] = useState<number | ''>('');
    const [adminReason, setAdminReason] = useState('');

    // UI Helpers
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTermHome, setSearchTermHome] = useState('');
    const [searchTermAway, setSearchTermAway] = useState('');
    const [showHomeResults, setShowHomeResults] = useState(false);
    const [showAwayResults, setShowAwayResults] = useState(false);

    // Fetch Initial Data
    useEffect(() => {
        if (isOpen) {
            loadInitialData();
            setStep(initialHomeTeam && initialAwayTeam ? 3 : 1); // Saltar a score si ya hay equipos
            setContext(initialContext || 'Normal');
            setTournamentId(initialTournamentId || '');
            setSeriesId('');
            setHomeTeam(initialHomeTeam || null);
            setAwayTeam(initialAwayTeam || null);
            setScoreHome('');
            setScoreAway('');
            setPenaltiesHome('');
            setPenaltiesAway('');
            setManualPenalties(false);
            setIsWO(false);
            setEvents([]);
            setMatchDate(initialPlayedAt ? initialPlayedAt.substring(0, 10) : '');
            setMatchTime(initialPlayedAt && initialPlayedAt.length > 10 ? initialPlayedAt.substring(11, 16) : '');
            setProofUrl((initialHomeTeam as any)?.proof_url || '');
            setProofFile(null);
            setError('');
            setMatchId(initialMatchId || '');
            setIsAdminMode(false);
            setAdminEloHome('');
            setAdminEloAway('');
            setAdminReason('');
        }
    }, [isOpen, initialTournamentId, initialContext, initialHomeTeam, initialAwayTeam, initialMatchId]);

    const loadInitialData = async () => {
        try {
            const [tData, teamsData] = await Promise.all([
                apiService.getTournaments(),
                apiService.getTeams(false, true)
            ]);
            setTournaments(tData);
            setTeams(teamsData);

            // Si hay equipos iniciales (IDs), buscamos sus objetos completos en la data fresca
            if (initialHomeTeam?.id) {
                const fullHome = teamsData.find(t => String(t.id) === String(initialHomeTeam.id));
                if (fullHome) setHomeTeam(fullHome);
            }
            if (initialAwayTeam?.id) {
                const fullAway = teamsData.find(t => String(t.id) === String(initialAwayTeam.id));
                if (fullAway) setAwayTeam(fullAway);
            }
        } catch (err) {
            console.error('Error loading data:', err);
        }
    };

    const currentTournament = useMemo(() => {
        return tournaments.find(t => String(t.id) === String(tournamentId));
    }, [tournaments, tournamentId]);

    // Derived State
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

    const canGoToNextStep = () => {
        if (step === 1) return context;
        if (step === 2) return homeTeam && awayTeam && homeTeam.id !== awayTeam.id;
        if (step === 3) {
            const basicScore = scoreHome !== '' && scoreAway !== '';
            if (needsPenalties) return basicScore && penaltiesHome !== '' && penaltiesAway !== '' && penaltiesHome !== penaltiesAway;
            return basicScore;
        }
        return true;
    };

    const handleRegister = async () => {
        setIsLoading(true);
        setError('');
        try {
            if (homeTeam && awayTeam && typeof scoreHome === 'number' && typeof scoreAway === 'number') {
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
                    action: 'register',
                    id: matchId || undefined,
                    tournament_id: tournamentId,
                    series_id: seriesId,
                    team_home_id: homeTeam.id,
                    team_away_id: awayTeam.id,
                    score_home: scoreHome,
                    score_away: scoreAway,
                    penalties_home: penaltiesHome === '' ? null : penaltiesHome,
                    penalties_away: penaltiesAway === '' ? null : penaltiesAway,
                    elo_type: currentTournament?.tournament_type || 'pichanga',
                    is_wo: (isWO || isAdminMode) ? 1 : 0,
                    admin_elo_home: isAdminMode ? adminEloHome : null,
                    admin_elo_away: isAdminMode ? adminEloAway : null,
                    admin_reason: isAdminMode ? adminReason : null,
                    diff: isAdminMode ? adminEloHome : eloChange,
                    played_at: matchDate ? (matchTime ? `${matchDate} ${matchTime}:00` : `${matchDate} 00:00:00`) : null,
                    proof_url: finalProofUrl || null,
                    events: events.map(e => ({
                        team_id: e.team_id,
                        card_id: e.card_id,
                        event: e.type,
                        description: e.description
                    }))
                };

                await apiService.registerMatch(payload);
                onMatchRegistered();
                onClose();
                window.location.reload();
            }
        } catch (err: any) {
            setError(err.message || 'Error al registrar el partido');
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
            newEvents[index].searchResults = cards.slice(0, 5); // Mostrar top 5
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-[#0b121f] border border-white/10 rounded-sm w-full max-w-4xl shadow-2xl relative">
                {/* Header */}
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#ffd900]">Registro de Partido Oficial</h2>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Paso {step} de 4 — {
                            step === 1 ? 'Torneo y Evento' :
                                step === 2 ? 'Seleccionar Equipos' :
                                    step === 3 ? 'Resultado y Contexto' : 'Detalles TCG'
                        }</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mb-6">
                            <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>
                        </div>
                    )}

                    <div className="min-h-[300px]">
                        {step === 1 && (
                            <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                                <div className="space-y-6">
                                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Torneo o Evento</h3>
                                    <select
                                        value={tournamentId}
                                        onChange={(e) => setTournamentId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-xs text-white focus:outline-none focus:border-[#ffd900] appearance-none"
                                    >
                                        <option value="" className="bg-[#0b121f]">Sin Torneo (Partida Suelta)</option>
                                        {tournaments.length > 0 && tournaments.map(t => (
                                            <option key={t.id} value={t.id} className="bg-[#0b121f]">{t.name}</option>
                                        ))}
                                    </select>
                                    <div className="bg-[#ffd900]/5 border border-[#ffd900]/20 p-6 rounded-sm">
                                        <p className="text-[10px] text-[#ffd900] font-black uppercase tracking-[0.2em] mb-2">Instrucciones</p>
                                        <p className="text-[10px] text-white/60 leading-relaxed font-medium">
                                            Selecciona el torneo al que pertenece este encuentro. Si es un partido amistoso fuera de competencia, selecciona "Sin Torneo".
                                            Podrás ajustar el tipo de duelo (Liga, Amistoso, etc.) en el paso 3.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex flex-col md:grid md:grid-cols-7 gap-6 items-center animate-in slide-in-from-right duration-300">
                                <div className="md:col-span-3 space-y-4 w-full">
                                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-center">Local</h3>
                                    <div className="flex flex-col items-center gap-4 p-4 md:p-6 bg-white/5 border border-white/10 rounded-sm">
                                        <div className="size-20 md:size-24 bg-black/40 border border-white/10 flex items-center justify-center p-3 md:p-4">
                                            {homeTeam ? (
                                                <img src={apiService.resolveImageUrl(homeTeam.logo_url)} alt={homeTeam.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="material-symbols-outlined text-4xl text-white/10">shield</span>
                                            )}
                                        </div>
                                        <div className="w-full relative">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={homeTeam ? homeTeam.name : searchTermHome}
                                                    onChange={(e) => {
                                                        if (homeTeam) setHomeTeam(null);
                                                        setSearchTermHome(e.target.value);
                                                        setShowHomeResults(true);
                                                    }}
                                                    onFocus={() => setShowHomeResults(true)}
                                                    placeholder="Buscar Local..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-4 text-sm text-white focus:outline-none focus:border-[#ffd900]"
                                                />
                                                {homeTeam && (
                                                    <button 
                                                        onClick={() => { setHomeTeam(null); setSearchTermHome(''); }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                )}
                                            </div>
                                            {showHomeResults && !homeTeam && searchTermHome.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 z-50 bg-[#1a2332] border border-white/10 mt-1 max-h-48 overflow-y-auto shadow-2xl rounded-sm">
                                                    {teams.filter(t => t.name.toLowerCase().includes(searchTermHome.toLowerCase()) || t.short_name.toLowerCase().includes(searchTermHome.toLowerCase())).map(t => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => { setHomeTeam(t); setShowHomeResults(false); }}
                                                            className="w-full text-left px-4 py-3 text-xs hover:bg-[#ffd900] hover:text-black border-b border-white/5 last:border-0"
                                                        >
                                                            <div className="font-bold uppercase italic">{t.name}</div>
                                                            <div className="text-[10px] opacity-60">{t.short_name} • ELO: {t.current_elo}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {homeTeam && <p className="text-[9px] font-bold text-[#ffd900] uppercase tracking-widest">ELO: {homeTeam.current_elo}</p>}
                                    </div>
                                </div>
                                <div className="md:col-span-1 flex flex-col items-center justify-center gap-2">
                                    <div className="size-10 rounded-full bg-[#1a2332] border border-white/10 flex items-center justify-center">
                                        <span className="text-[10px] font-black text-white/20 italic">VS</span>
                                    </div>
                                </div>
                                <div className="md:col-span-3 space-y-4 w-full">
                                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-center">Visitante</h3>
                                    <div className="flex flex-col items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-sm">
                                        <div className="size-24 bg-black/40 border border-white/10 flex items-center justify-center p-4">
                                            {awayTeam ? (
                                                <img src={apiService.resolveImageUrl(awayTeam.logo_url)} alt={awayTeam.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="material-symbols-outlined text-4xl text-white/10">shield</span>
                                            )}
                                        </div>
                                        <div className="w-full relative">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={awayTeam ? awayTeam.name : searchTermAway}
                                                    onChange={(e) => {
                                                        if (awayTeam) setAwayTeam(null);
                                                        setSearchTermAway(e.target.value);
                                                        setShowAwayResults(true);
                                                    }}
                                                    onFocus={() => setShowAwayResults(true)}
                                                    placeholder="Buscar Visitante..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-4 text-sm text-white focus:outline-none focus:border-[#ffd900]"
                                                />
                                                {awayTeam && (
                                                    <button 
                                                        onClick={() => { setAwayTeam(null); setSearchTermAway(''); }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                    </button>
                                                )}
                                            </div>
                                            {showAwayResults && !awayTeam && searchTermAway.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 z-50 bg-[#1a2332] border border-white/10 mt-1 max-h-48 overflow-y-auto shadow-2xl rounded-sm">
                                                    {teams.filter(t => t.name.toLowerCase().includes(searchTermAway.toLowerCase()) || t.short_name.toLowerCase().includes(searchTermAway.toLowerCase())).map(t => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => { setAwayTeam(t); setShowAwayResults(false); }}
                                                            className="w-full text-left px-4 py-3 text-xs hover:bg-[#ffd900] hover:text-black border-b border-white/5 last:border-0"
                                                        >
                                                            <div className="font-bold uppercase italic">{t.name}</div>
                                                            <div className="text-[10px] opacity-60">{t.short_name} • ELO: {t.current_elo}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {awayTeam && <p className="text-[9px] font-bold text-[#ffd900] uppercase tracking-widest">ELO: {awayTeam.current_elo}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8 animate-in slide-in-from-right duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Resultado Final</h3>
                                        <div className="flex items-center gap-4 md:gap-8 bg-white/5 p-4 md:p-10 border border-white/10 rounded-sm justify-center">
                                            <div className="flex flex-col items-center gap-4 flex-1">
                                                <div className="size-20 md:size-28 bg-black/40 border border-white/10 flex items-center justify-center p-3 md:p-5 shadow-2xl relative group">
                                                    <div className="absolute inset-0 bg-[#ffd900]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    {homeTeam?.logo_url ? (
                                                        <img src={apiService.resolveImageUrl(homeTeam.logo_url)} alt={homeTeam.name} className="w-full h-full object-contain relative z-10" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-4xl text-white/5">shield</span>
                                                    )}
                                                </div>
                                                <div className="text-center w-full">
                                                    <p className="text-[9px] font-black text-[#ffd900] uppercase tracking-[0.2em] mb-3 truncate">{homeTeam?.short_name || homeTeam?.name || 'LOCAL'}</p>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={scoreHome}
                                                        onChange={(e) => setScoreHome(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                                        placeholder="0"
                                                        className="w-full max-w-[80px] h-20 bg-black/60 border-2 border-white/10 rounded-sm text-4xl font-black text-center text-white focus:outline-none focus:border-[#ffd900] transition-all shadow-inner"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center justify-center gap-2 pt-12">
                                                <span className="text-2xl font-black text-white/10 italic">VS</span>
                                                <div className="h-12 w-[1px] bg-gradient-to-b from-white/0 via-white/10 to-white/0"></div>
                                            </div>

                                            <div className="flex flex-col items-center gap-4 flex-1">
                                                <div className="size-20 md:size-28 bg-black/40 border border-white/10 flex items-center justify-center p-3 md:p-5 shadow-2xl relative group">
                                                    <div className="absolute inset-0 bg-[#ffd900]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    {awayTeam?.logo_url ? (
                                                        <img src={apiService.resolveImageUrl(awayTeam.logo_url)} alt={awayTeam.name} className="w-full h-full object-contain relative z-10" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-4xl text-white/5">shield</span>
                                                    )}
                                                </div>
                                                <div className="text-center w-full">
                                                    <p className="text-[9px] font-black text-[#ffd900] uppercase tracking-[0.2em] mb-3 truncate">{awayTeam?.short_name || awayTeam?.name || 'VISITA'}</p>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={scoreAway}
                                                        onChange={(e) => setScoreAway(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                                        placeholder="0"
                                                        className="w-full max-w-[80px] h-20 bg-black/60 border-2 border-white/10 rounded-sm text-4xl font-black text-center text-white focus:outline-none focus:border-[#ffd900] transition-all shadow-inner"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {isDraw && (() => {
                                            const currentTournament = tournaments.find(t => 
                                                t.id && tournamentId && String(t.id) === String(tournamentId)
                                            );
                                            const structure = currentTournament?.structure?.toLowerCase().trim();
                                            // Solo mostrar checkbox si no es Copa (que es auto) y no es Liga/Suizo (que es nunca)
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
                                            <div className="flex flex-col items-center gap-4 bg-[#ffd900]/5 border border-[#ffd900]/20 p-6 rounded-sm animate-in zoom-in duration-300">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-sm text-[#ffd900]">sports_score</span>
                                                    <h4 className="text-[10px] font-black text-[#ffd900] uppercase tracking-[0.3em]">Definición por Penales</h4>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Local</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={penaltiesHome}
                                                            onChange={(e) => setPenaltiesHome(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                                            placeholder="0"
                                                            className="w-16 py-3 bg-black/40 border-2 border-white/10 rounded-sm text-xl font-black text-center text-white focus:border-[#ffd900]"
                                                        />
                                                    </div>
                                                    <span className="text-xl font-black text-white/10 mt-4">—</span>
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Visita</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={penaltiesAway}
                                                            onChange={(e) => setPenaltiesAway(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                                                            placeholder="0"
                                                            className="w-16 py-3 bg-black/40 border-2 border-white/10 rounded-sm text-xl font-black text-center text-white focus:border-[#ffd900]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="pt-2 space-y-6">
                                            <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-sm">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAdminMode}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setIsAdminMode(checked);
                                                            if (checked) {
                                                                setIsWO(true);
                                                            } else {
                                                                setIsWO(false);
                                                            }
                                                        }}
                                                        className="size-4 rounded-sm border-white/10 bg-white/5 checked:bg-[#ffd900] appearance-none transition-all cursor-pointer"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest group-hover:text-white transition-colors">MODO ADMIN (WALKOVER)</span>
                                                        <span className="text-[7px] text-white/40 uppercase font-bold tracking-widest mt-0.5">Habilitar ajustes manuales de ELO</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Fecha</label>
                                                    <input
                                                        type="date"
                                                        value={matchDate}
                                                        onChange={(e) => setMatchDate(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-[10px] text-white focus:outline-none focus:border-[#ffd900] [color-scheme:dark]"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Hora (Opcional)</label>
                                                    <input
                                                        type="time"
                                                        value={matchTime}
                                                        onChange={(e) => setMatchTime(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-[10px] text-white focus:outline-none focus:border-[#ffd900] [color-scheme:dark]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Evidencia (Subir Archivo)</label>
                                                <div className="flex items-center gap-3">
                                                    <label className="flex-1 flex items-center justify-between bg-white/5 border border-white/10 border-dashed rounded-sm px-4 py-2 text-[10px] text-white/60 hover:border-[#ffd900] hover:text-white cursor-pointer transition-all">
                                                        <span className="truncate">
                                                            {proofFile ? proofFile.name : (proofUrl ? 'Archivo subido previamente' : 'Seleccionar archivo (Imagen/PDF)...')}
                                                        </span>
                                                        <span className="material-symbols-outlined text-sm text-[#ffd900]">upload_file</span>
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
                                                            className="text-[10px] font-black text-[#ffd900] hover:underline whitespace-nowrap bg-white/5 border border-white/10 px-3 py-2 rounded-sm flex items-center gap-1"
                                                        >
                                                            VER <span className="material-symbols-outlined text-xs">open_in_new</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-[#ffd900] px-4 py-3 rounded-sm flex items-center gap-3 shadow-xl">
                                                <span className="material-symbols-outlined text-black text-lg">analytics</span>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-black/60 uppercase tracking-widest">Impacto ELO {isAdminMode ? 'Manual' : 'Proyectado'}</span>
                                                    <span className="text-xs font-black text-black uppercase">
                                                        {eloChange > 0 ? `+${eloChange}` : eloChange} PTOS PARA {homeTeam?.name || 'LOCAL'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {isAdminMode && (
                                    <div className="bg-[#ffd900]/5 border border-[#ffd900]/20 p-6 rounded-sm animate-in fade-in slide-in-from-top-4 duration-500 mt-8">
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className="material-symbols-outlined text-sm text-[#ffd900]">admin_panel_settings</span>
                                            <h4 className="text-[10px] font-black text-[#ffd900] uppercase tracking-[0.3em]">Ajustes Manuales de Administrador</h4>
                                        </div>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block text-center lg:text-left">Ajuste ELO Local (+/-)</label>
                                                <div className="flex justify-center lg:justify-start">
                                                    <input
                                                        type="number"
                                                        value={adminEloHome}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                                                            setAdminEloHome(val);
                                                        }}
                                                        placeholder="Ej: +15"
                                                        className="w-32 bg-black/40 border border-[#ffd900]/30 rounded-sm px-4 py-3 text-xl font-black text-center text-white focus:border-[#ffd900]"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block text-center lg:text-right">Ajuste ELO Visita (+/-)</label>
                                                <div className="flex justify-center lg:justify-end">
                                                    <input
                                                        type="number"
                                                        value={adminEloAway}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? '' : parseInt(e.target.value);
                                                            setAdminEloAway(val);
                                                        }}
                                                        placeholder="Ej: -15"
                                                        className="w-32 bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-xl font-black text-center text-white focus:border-[#ffd900]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-white/20 uppercase tracking-widest">Razón o Justificación Administrativa</label>
                                            <textarea
                                                value={adminReason}
                                                onChange={(e) => setAdminReason(e.target.value)}
                                                rows={2}
                                                className="w-full bg-black/40 border border-white/10 rounded-sm px-4 py-3 text-[11px] text-white focus:border-[#ffd900] resize-none font-medium italic"
                                                placeholder="Ej: Declaración de Walkover por falta de jugadores..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6 animate-in slide-in-from-right duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Registro de Eventos TCG</h3>
                                    <button
                                        onClick={() => setEvents([...events, { id: Date.now().toString(), type: 'YELLOW_CARD', team_id: homeTeam?.id || '', card_id: '', card_name: '', description: '' }])}
                                        className="text-[9px] font-black text-[#ffd900] bg-[#ffd900]/10 border border-[#ffd900]/20 px-4 py-2 hover:bg-[#ffd900] hover:text-black transition-all"
                                    >
                                        + AGREGAR EVENTO
                                    </button>
                                </div>

                                {events.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-sm">
                                        <span className="material-symbols-outlined text-4xl text-white/5 mb-4">style</span>
                                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Sin tarjetas ni lesiones registradas</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 max-h-[450px] min-h-[300px] overflow-y-auto pr-2 pb-32 custom-scrollbar">
                                        {events.map((event, idx) => (
                                            <div key={event.id} className="bg-white/5 border border-white/10 p-4 rounded-sm flex flex-wrap md:flex-nowrap items-center gap-4 relative">
                                                <button
                                                    onClick={() => setEvents(events.filter(e => e.id !== event.id))}
                                                    className="absolute -top-2 -right-2 size-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
                                                >
                                                    <span className="material-symbols-outlined text-xs">close</span>
                                                </button>

                                                <div className="w-full md:w-32 flex flex-col gap-1">
                                                    <label className="text-[8px] font-black text-white/20 uppercase">Evento</label>
                                                    <select
                                                        value={event.type}
                                                        onChange={(e) => {
                                                            const newEvents = [...events];
                                                            newEvents[idx].type = e.target.value as any;
                                                            setEvents(newEvents);
                                                        }}
                                                        className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none"
                                                    >
                                                        <option value="YELLOW_CARD">🟨 Amarilla</option>
                                                        <option value="RED_CARD">🟥 Roja</option>
                                                        <option value="INJURY">🚑 Lesión</option>
                                                    </select>
                                                </div>

                                                <div className="w-full md:w-32 flex flex-col gap-1">
                                                    <label className="text-[8px] font-black text-white/20 uppercase">Equipo</label>
                                                    <select
                                                        value={event.team_id}
                                                        onChange={(e) => {
                                                            const newEvents = [...events];
                                                            newEvents[idx].team_id = e.target.value;
                                                            setEvents(newEvents);
                                                        }}
                                                        className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none"
                                                    >
                                                        <option value={homeTeam?.id}>{homeTeam?.name}</option>
                                                        <option value={awayTeam?.id}>{awayTeam?.name}</option>
                                                    </select>
                                                </div>

                                                <div className="flex-1 flex flex-col gap-1 relative">
                                                    <label className="text-[8px] font-black text-white/20 uppercase">Nombre de la Carta TCG</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar carta (ej: Piero...)"
                                                        value={event.card_name}
                                                        onChange={(e) => {
                                                            const newEvents = [...events];
                                                            newEvents[idx].card_name = e.target.value;
                                                            newEvents[idx].card_id = '';
                                                            setEvents(newEvents);
                                                            searchCardsForEvent(idx, e.target.value);
                                                        }}
                                                        className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#ffd900]"
                                                    />

                                                    {event.searchResults && event.searchResults.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 z-[110] bg-[#1a2332] border border-white/10 mt-1 shadow-2xl max-h-40 overflow-y-auto rounded-sm">
                                                            {event.searchResults.map((card) => (
                                                                <button
                                                                    key={card.id}
                                                                    onClick={() => selectCardForEvent(idx, card)}
                                                                    className="w-full text-left px-3 py-2 text-[10px] text-white hover:bg-[#ffd900] hover:text-black flex justify-between items-center transition-colors border-b border-white/5 last:border-0"
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold">{card.name}</span>
                                                                        <span className="text-[8px] opacity-60 italic">{card.rarity} - {card.edition}</span>
                                                                    </div>
                                                                    {card.id && <span className="text-[8px] opacity-40">#{card.id}</span>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {!event.card_id && event.card_name.length > 2 && !event.searchResults?.length && (
                                                        <div className="absolute top-full left-0 right-0 bg-red-500/10 border border-red-500/20 px-3 py-1 mt-1">
                                                            <p className="text-[8px] text-red-500 font-bold uppercase tracking-widest">Carta no encontrada</p>
                                                        </div>
                                                    )}

                                                    {event.card_id && (
                                                        <div className="absolute -top-1 right-0">
                                                            <span className="text-[8px] font-black text-green-500 bg-green-500/10 px-2 rounded-full uppercase tracking-widest">VINCULADA</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="w-full flex-1 flex flex-col gap-1">
                                                    <label className="text-[8px] font-black text-white/20 uppercase">Observación / Descripción</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Jugada clave, contexto de la lesión..."
                                                        value={event.description}
                                                        onChange={(e) => {
                                                            const newEvents = [...events];
                                                            newEvents[idx].description = e.target.value;
                                                            setEvents(newEvents);
                                                        }}
                                                        className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-[#ffd900]"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-12 flex justify-between items-center bg-white/5 -mx-8 -mb-8 p-8 border-t border-white/5">
                        <button
                            onClick={() => step > 1 && setStep(step - 1)}
                            disabled={step === 1}
                            className={`flex items-center gap-2 group transition-all ${step === 1 ? 'opacity-0 cursor-default' : 'text-white/40 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back_ios</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Anterior</span>
                        </button>

                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map(s => (
                                <div key={s} className={`size-1.5 rounded-full transition-all duration-300 ${step === s ? 'bg-[#ffd900] w-6' : 'bg-white/10'}`} />
                            ))}
                        </div>

                        {step < 4 ? (
                            <button
                                onClick={() => canGoToNextStep() && setStep(step + 1)}
                                disabled={!canGoToNextStep()}
                                className={`flex items-center gap-2 group px-8 py-3 transition-all ${canGoToNextStep()
                                    ? 'bg-[#ffd900] text-black hover:bg-[#ffed4d]'
                                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                    }`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Siguiente</span>
                                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleRegister}
                                disabled={isLoading || events.some(e => !e.card_name)}
                                className="flex items-center gap-2 px-12 py-3 bg-[#ffd900] text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#ffed4d] hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,217,0,0.3)] disabled:opacity-50"
                            >
                                {isLoading ? 'PROCESANDO...' : 'CONFIRMAR REGISTRO'}
                            </button>
                        )}
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

export default MatchRegistrationModal;
