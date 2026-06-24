import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Tournament, TournamentParticipant, User, Team } from '../types';
import TournamentSettingsForm from '../components/TournamentSettingsForm';
import EnrollTeamModal from '../components/EnrollTeamModal';
import StartTournamentModal from '../components/StartTournamentModal';
import MatchRegistrationModal from '../components/MatchRegistrationModal';
import EditMatchModal from '../components/EditMatchModal';
import MatchDetailsModal from '../components/MatchDetailsModal';
import ScheduleMatchModal from '../components/ScheduleMatchModal';
import CloseTournamentModal from '../components/CloseTournamentModal';
import BulkScheduleModal from '../components/BulkScheduleModal';
import HybridSetupModal from '../components/HybridSetupModal';
import ManualFixtureModal from '../components/ManualFixtureModal';
import ManualBracketModal from '../components/ManualBracketModal';
import EliminationBracket from '../components/EliminationBracket';
import ConfirmActionModal from '../components/ConfirmActionModal';
import LinkDeckModal from '../components/LinkDeckModal';
import { formatStatus, getContrastColor, parseLocalDate, formatLocalDate, formatLocalDateTime } from '../utils/formatters';
import { compressImage } from '../utils/imageUtils';

const TournamentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'participantes' | 'calendario' | 'clasificacion' | 'llaves' | 'ajustes' | 'fairplay' | 'ranking' | 'incidencias'>('participantes');
    const [loading, setLoading] = useState(true);
    const [userTeam, setUserTeam] = useState<Team | null>(null);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [isEditMatchModalOpen, setIsEditMatchModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [isBulkScheduleModalOpen, setIsBulkScheduleModalOpen] = useState(false);
    
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous?: boolean;
        requiresInput?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDangerous: false,
        requiresInput: undefined
    });

    const openConfirm = (props: Omit<typeof confirmConfig, 'isOpen'>) => {
        setConfirmConfig({ ...props, isOpen: true });
    };
    const [isMatchDetailsOpen, setIsMatchDetailsOpen] = useState(false);
    const [isScheduleMatchModalOpen, setIsScheduleMatchModalOpen] = useState(false);
    const [isHybridSetupModalOpen, setIsHybridSetupModalOpen] = useState(false);
    const [isManualFixtureModalOpen, setIsManualFixtureModalOpen] = useState(false);
    const [isManualBracketModalOpen, setIsManualBracketModalOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
    const [showAllStandings, setShowAllStandings] = useState(false);
    const [isLinkDeckModalOpen, setIsLinkDeckModalOpen] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<any>(null);

    const savedUser = localStorage.getItem('user');
    const currentUser: User | null = savedUser ? JSON.parse(savedUser) : null;
    const isCreator = currentUser && tournament && String(tournament.created_by_user_id) === String(currentUser.id);
    const canEdit = currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'EDITOR' || !!isCreator;

    const maxRound = matches.reduce((max, m) => Math.max(max, m.round || 1), 0);
    const canCloseSwiss = tournament?.structure?.toLowerCase() === 'suizo' && maxRound >= 2;

    useEffect(() => {
        if (id) fetchTournamentDetail();
    }, [id]);

    useEffect(() => {
        const fetchUserTeam = async () => {
            if (currentUser?.id) {
                try {
                    const team = await apiService.getUserTeam(currentUser.id);
                    setUserTeam(team);
                } catch (error) {
                    console.error('Error fetching user team:', error);
                }
            }
        };
        fetchUserTeam();
    }, [currentUser?.id]);

    const fetchTournamentDetail = async (skipTabReset: boolean = false) => {
        setLoading(true);
        try {
            const data = await apiService.getTournamentDetail(id!);
            setTournament(data);
            setParticipants(data.participants || []);
            setMatches(data.matches || []);
            
            // Lógica de pestaña por defecto dinámica solo si no se solicita omitir
            if (!skipTabReset) {
              const isInitialStage = ['draft', 'open', 'registration_closed'].includes(data.status?.toLowerCase());
              if (!isInitialStage) {
                  if (data.structure?.toLowerCase() === 'copa') {
                      setActiveTab('llaves');
                  } else {
                      setActiveTab('clasificacion');
                  }
              }
            }
        } catch (error) {
            console.error('Error fetching tournament detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelfEnroll = async () => {
        if (!currentUser) {
            navigate('/profile');
            return;
        }
        try {
            const userTeams = await apiService.getTeams(false, true); // showAll = true para encontrar su equipo aunque esté inactivo
            console.log("Debug Inscripción - Usuario:", currentUser.id, "Equipos encontrados:", userTeams.length);
            const userTeam = userTeams.find((t: any) => String(t.owner_user_id) === String(currentUser.id));

            if (!userTeam) {
                console.warn("Debug Inscripción - No se encontró equipo para el usuario", currentUser.id, "en la lista:", userTeams.map((t: any) => t.owner_user_id));
                alert('No tienes equipos registrados asociados a tu perfil.');
                return;
            }

            const teamId = userTeam.id;
            const inviteCode = tournament?.invite_code ? prompt('Este torneo requiere un código de invitación:') : null;

            await apiService.enrollTournament({
                tournament_id: tournament!.id,
                team_id: teamId,
                invite_code: inviteCode,
                action: 'enroll'
            });
            alert('¡Inscripción exitosa!');
            fetchTournamentDetail();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al inscribirse');
        }
    };


    const handleGenerateSwissRound = async () => {
        openConfirm({
            title: 'Generar Siguiente Ronda',
            message: '¿Estás seguro de generar la siguiente ronda basándote en la clasificación actual?',
            onConfirm: async () => {
                try {
                    await apiService.generateSwissRound(tournament.id);
                    fetchTournamentDetail();
                } catch (err: any) {
                    alert('Error al generar ronda: ' + err.message);
                }
            }
        });
    };

    const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tournament) return;
        try {
            setLoading(true);
            const compressedFile = await compressImage(file, 1920, 1080, 0.7);
            const uploadRes = await apiService.uploadImage(compressedFile, 'banners');
            if (uploadRes.status === 'success') {
                await apiService.updateTournament(tournament.id, {
                    ...tournament,
                    banner_url: uploadRes.url
                });
                fetchTournamentDetail();
            } else {
                alert('Error subiendo banner: ' + uploadRes.message);
                setLoading(false);
            }
        } catch (err: any) {
            alert('Error al adjuntar banner: ' + err.message);
            setLoading(false);
        }
    };

    const handleUploadRules = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tournament) return;
        try {
            setLoading(true);
            const uploadRes = await apiService.uploadImage(file, 'documentos');
            if (uploadRes.status === 'success') {
                await apiService.updateTournament(tournament.id, {
                    ...tournament,
                    rules_url: uploadRes.url
                });
                fetchTournamentDetail();
            } else {
                alert('Error subiendo bases: ' + uploadRes.message);
                setLoading(false);
            }
        } catch (err: any) {
            alert('Error al adjuntar bases: ' + err.message);
            setLoading(false);
        }
    };

    const handleRemoveRules = async () => {
        if (!tournament) return;
        openConfirm({
            title: 'Eliminar Bases',
            message: '¿Seguro que deseas eliminar las bases del torneo?',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await apiService.updateTournament(tournament.id, {
                        ...tournament,
                        rules_url: null
                    });
                    await fetchTournamentDetail();
                } catch (err: any) {
                    alert('Error al eliminar bases: ' + err.message);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleUpdateStatus = async (newStatus: string) => {
        const confirmMsg = newStatus === 'open' ? '¿Publicar torneo y habilitar inscripciones?' :
            newStatus === 'registration_closed' ? '¿Cerrar inscripciones y pasar a preparación de fixture?' :
                `¿Cambiar estado a ${newStatus}?`;

        openConfirm({
            title: 'Cambiar Estado del Torneo',
            message: confirmMsg,
            onConfirm: async () => {
                try {
                    await apiService.updateTournament(tournament!.id, {
                        id: tournament!.id,
                        name: tournament!.name,
                        organizer_id: tournament!.organizer_id,
                        status: newStatus
                    });
                    fetchTournamentDetail();
                } catch (err: any) {
                    alert('Error al actualizar estado: ' + err.message);
                }
            }
        });
    };

    const handleRemoveParticipant = async (teamId: number) => {
        const team = participants.find(p => p.team_id === teamId);
        const isOfficial = team && Number(team.is_waiting) === 0;

        openConfirm({
            title: 'Remover Participante',
            message: `¿Remover a "${team?.team_name || 'este equipo'}" del torneo?`,
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.removeParticipant(tournament!.id, teamId);
                    
                    // Si era oficial, buscar si hay alguien en espera para ofrecer su promoción
                    const waitingList = participants.filter(p => Number(p.is_waiting) === 1);
                    if (isOfficial && waitingList.length > 0) {
                        const nextInLine = waitingList[0];
                        setTimeout(() => {
                            openConfirm({
                                title: 'Promoción Disponible',
                                message: `Has eliminado un participante principal. ¿Deseas promover a "${nextInLine.team_name}" (siguiente en lista de espera) para ocupar su lugar?`,
                                onConfirm: async () => {
                                    try {
                                        await apiService.promoteParticipant(tournament!.id, nextInLine.team_id);
                                        fetchTournamentDetail();
                                    } catch (err: any) {
                                        alert('Error al promover: ' + err.message);
                                    }
                                }
                            });
                        }, 500);
                    }
                    
                    fetchTournamentDetail();
                } catch (err: any) {
                    alert('Error al remover participante: ' + err.message);
                }
            }
        });
    };

    const handlePromoteParticipant = async (teamId: number, forceIncrease: boolean = false) => {
        const officialCount = participants.filter(p => Number(p.is_waiting) === 0).length;
        const maxTeams = Number(tournament!.max_teams);

        if (!forceIncrease && officialCount >= maxTeams) {
            openConfirm({
                title: 'Cupo Lleno',
                message: `El torneo ya tiene el máximo de equipos (${maxTeams}). Si promueves a este equipo, el cupo máximo aumentará a ${maxTeams + 1}. ¿Deseas continuar?`,
                onConfirm: () => handlePromoteParticipant(teamId, true)
            });
            return;
        }

        try {
            await apiService.promoteParticipant(tournament!.id, teamId, forceIncrease);
            fetchTournamentDetail();
        } catch (err: any) {
            alert('Error al promover participante: ' + err.message);
        }
    };

    const handleRollback = async (matchId: string) => {
        openConfirm({
            title: 'Invalidar Resultado',
            message: '¿Estás seguro de invalidar este resultado? El ELO será revertido y el partido volverá a estado pendiente.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.rollbackMatch(matchId);
                    alert('Resultado invalidado con éxito');
                    fetchTournamentDetail();
                } catch (err: any) {
                    alert('Error en rollback: ' + err.message);
                }
            }
        });
    };

    const handleDeleteTournament = async () => {
        openConfirm({
            title: 'DESTRUCCIÓN DEL TORNEO',
            message: 'ATENCIÓN: Estás a punto de borrar ABSOLUTAMENTE TODOS los datos del torneo. Esto incluye los partidos, las modificaciones matemáticas de ELO, las estadísticas y la existencia misma del campeonato. Es una operación completamente IRREVERSIBLE.',
            isDangerous: true,
            requiresInput: tournament!.name,
            onConfirm: async () => {
                try {
                    setLoading(true);
                    await apiService.deleteTournament(tournament!.id);
                    alert('Torneo eliminado correcta y permanentemente de la base de datos.');
                    navigate('/tournaments');
                } catch (err: any) {
                    alert('Error al intentar eliminar el torneo: ' + err.message);
                    setLoading(false);
                }
            }
        });
    };

    useEffect(() => {
        if (activeTab === 'clasificacion') {
            fetchTournamentDetail();
        }
    }, [activeTab]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd900]"></div>
            </div>
        );
    }

    if (!tournament) return <div>Torneo no encontrado</div>;
    const getHighlightStyle = (pos: number, total: number) => {
        if (!tournament.highlight_settings || tournament.highlight_settings.length === 0) {
            return pos === 1 ? { backgroundColor: '#ffd900', color: '#000000' } : null;
        }

        for (const rule of tournament.highlight_settings) {
            let start = rule.start;
            let end = rule.end;

            if (start < 0) start = total + start + 1;
            if (end < 0) end = total + end + 1;

            if (pos >= start && pos <= end) {
                return { backgroundColor: rule.color, color: getContrastColor(rule.color) };
            }
        }
        return null;
    };

    const renderFairPlayTable = (standingsData: any[]) => {
        const sorted = [...standingsData].sort((a, b) => {
            if ((a.fair_play_score ?? 0) !== (b.fair_play_score ?? 0)) {
                return (a.fair_play_score ?? 0) - (b.fair_play_score ?? 0);
            }
            if ((a.red_cards ?? 0) !== (b.red_cards ?? 0)) {
                return (a.red_cards ?? 0) - (b.red_cards ?? 0);
            }
            return a.name.localeCompare(b.name);
        });

        return (
            <table className="w-full border-collapse">
                <thead>
                    <tr className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/10">
                        <th className="px-4 py-4 text-left w-12">Pos</th>
                        <th className="px-4 py-4 text-left">Equipo</th>
                        <th className="px-4 py-4 text-center">🟨 Amarillas</th>
                        <th className="px-4 py-4 text-center">🟥 Rojas</th>
                        <th className="px-4 py-4 text-right pr-8 text-[#ffd900]">Indisciplina (Fair Play)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sorted.map((s: any, idx: number) => (
                        <tr key={s.team_id} className="group hover:bg-white/5 transition-colors">
                            <td className="px-4 py-5 text-[10px] font-black text-white/40 italic">{idx + 1}</td>
                            <td
                                className="px-4 py-5 cursor-pointer group"
                                onClick={() => navigate(`/team/${s.slug}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <img src={apiService.resolveImageUrl(s.logo_url)} className="size-6 object-contain group-hover:scale-110 transition-transform" alt="" />
                                    <span className="text-xs font-black text-white uppercase tracking-tighter truncate group-hover:text-[#ffd900] transition-colors">{s.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-5 text-center text-[11px] font-bold text-white/60">{s.yellow_cards || 0}</td>
                            <td className="px-4 py-5 text-center text-[11px] font-bold text-white/60">{s.red_cards || 0}</td>
                            <td className="px-4 py-5 text-right pr-8 text-sm font-black text-[#ffd900] italic">
                                {s.fair_play_score || 0}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const getRoundLabel = (r: number, structure?: string, roundMatches?: any[]) => {
        const struct = structure?.toLowerCase();
        if (roundMatches && roundMatches.length > 0) {
            const firstWithStage = roundMatches.find((m: any) => m.stage && m.stage.trim() !== '');
            if (firstWithStage) return firstWithStage.stage;
        }
        const matchInRound = matches.find((m: any) => Number(m.round) === r && m.stage && m.stage.trim() !== '');
        if (matchInRound) return matchInRound.stage;
        if (struct === 'copa') {
            return `Ronda ${r}`;
        }
        return `Fecha ${r}`;
    };

    const renderInhabilitados = () => {
        const roundInhabilitations: {
            [round: number]: {
                suspendidos: { teamName: string; playerName: string }[];
                lesionados: { teamName: string; playerName: string }[];
            };
        } = {};

        matches.forEach((m) => {
            const prevRound = Number(m.round) || 1;
            const targetRound = prevRound + 1;

            if (m.events && Array.isArray(m.events)) {
                m.events.forEach((evt: any) => {
                    const type = evt.event || evt.type;
                    if (type === 'RED_CARD' || type === 'INJURY') {
                        let teamName = '';
                        if (String(evt.team_id) === String(m.team_home_id)) {
                            teamName = m.home_name || m.home_team_name || 'Local';
                        } else if (String(evt.team_id) === String(m.team_away_id)) {
                            teamName = m.away_name || m.away_team_name || 'Visitante';
                        } else {
                            const participant = participants.find(p => String(p.team_id) === String(evt.team_id));
                            teamName = participant?.team_name || 'Equipo';
                        }

                        const playerName = evt.card_name || 'Jugador';

                        if (!roundInhabilitations[targetRound]) {
                            roundInhabilitations[targetRound] = { suspendidos: [], lesionados: [] };
                        }

                        if (type === 'RED_CARD') {
                            if (!roundInhabilitations[targetRound].suspendidos.some(s => s.playerName === playerName && s.teamName === teamName)) {
                                roundInhabilitations[targetRound].suspendidos.push({ teamName, playerName });
                            }
                        } else if (type === 'INJURY') {
                            if (!roundInhabilitations[targetRound].lesionados.some(l => l.playerName === playerName && l.teamName === teamName)) {
                                roundInhabilitations[targetRound].lesionados.push({ teamName, playerName });
                            }
                        }
                    }
                });
            }
        });

        const roundsWithInhabilitations = Object.keys(roundInhabilitations)
            .map(Number)
            .sort((a, b) => a - b);

        return (
            <div className="space-y-6 mt-12 pt-12 border-t border-white/5 animate-in fade-in duration-500">
                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500">warning</span>
                        JUGADORES INHABILITADOS
                    </h3>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
                        Las tarjetas rojas y lesiones recibidas en una ronda inhabilitan al jugador para participar en la ronda inmediatamente siguiente.
                    </p>
                </div>

                {roundsWithInhabilitations.length === 0 ? (
                    <div className="py-10 text-center bg-white/5 border border-white/10 rounded-sm">
                        <span className="material-symbols-outlined text-3xl text-emerald-500 mb-2">check_circle</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">No hay jugadores suspendidos ni lesionados activos</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {roundsWithInhabilitations.map((r) => {
                            const { suspendidos, lesionados } = roundInhabilitations[r];
                            return (
                                <div key={r} className="bg-slate-950/40 border border-white/5 p-6 rounded-sm space-y-6">
                                    <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                                        <span className="px-2 py-0.5 bg-[#ffd900] text-black text-[9px] font-black uppercase tracking-widest rounded-sm">
                                            INHABILITADOS
                                        </span>
                                        <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">
                                            {getRoundLabel(r, tournament.structure).toUpperCase()}
                                        </h4>
                                    </div>

                                    {/* Suspendidos */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs">🟥</span>
                                            <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                SUSPENDIDOS (Tarjeta Roja)
                                            </h5>
                                        </div>
                                        {suspendidos.length === 0 ? (
                                            <p className="text-[10px] font-medium text-white/20 uppercase tracking-wider italic pl-6">
                                                Sin suspendidos para esta ronda
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5 pl-6">
                                                {suspendidos.map((s, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs text-white/80 font-semibold uppercase tracking-tighter">
                                                        <span className="text-[#ffd900] font-black">{s.teamName}</span>
                                                        <span className="text-white/20">—</span>
                                                        <span className="text-white font-bold">{s.playerName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Lesionados */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs">🩹</span>
                                            <h5 className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                                LESIONADOS
                                            </h5>
                                        </div>
                                        {lesionados.length === 0 ? (
                                            <p className="text-[10px] font-medium text-white/20 uppercase tracking-wider italic pl-6">
                                                Sin lesionados para esta ronda
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5 pl-6">
                                                {lesionados.map((l, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs text-white/80 font-semibold uppercase tracking-tighter">
                                                        <span className="text-[#ffd900] font-black">{l.teamName}</span>
                                                        <span className="text-white/20">—</span>
                                                        <span className="text-white font-bold">{l.playerName}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderStandingsTable = (standingsData: any[]) => (
        <table className="w-full border-collapse">
            <thead>
                <tr className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/10">
                    <th className="px-4 py-4 text-left w-12">Pos</th>
                    <th className="px-4 py-4 text-left">Equipo</th>
                    <th className="px-4 py-4 text-center">PJ</th>
                    <th className="px-4 py-4 text-center">PG</th>
                    <th className="px-4 py-4 text-center">PE</th>
                    <th className="px-4 py-4 text-center">PP</th>
                    <th className="px-4 py-4 text-center">GF</th>
                    <th className="px-4 py-4 text-center">GC</th>
                    <th className="px-4 py-4 text-center">DG</th>
                    <th className="px-4 py-4 text-center">🟨</th>
                    <th className="px-4 py-4 text-right pr-8 text-[#ffd900]">Pts</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {standingsData
                    .slice(0, showAllStandings ? undefined : 10)
                    .map((s: any, idx: number) => {
                        const style = getHighlightStyle(idx + 1, standingsData.length);
                        return (
                            <tr key={s.team_id} className="group hover:bg-white/5 transition-colors">
                                <td className="px-4 py-5">
                                    <span
                                        className={`size-6 flex items-center justify-center text-[10px] font-black italic ${!style ? 'text-white/40' : ''}`}
                                        style={style || {}}
                                    >
                                        {idx + 1}
                                    </span>
                                </td>
                                <td
                                    className="px-4 py-5 cursor-pointer group"
                                    onClick={() => navigate(`/team/${s.slug}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={apiService.resolveImageUrl(s.logo_url)} className="size-6 object-contain group-hover:scale-110 transition-transform" alt="" />
                                        <span className="text-xs font-black text-white uppercase tracking-tighter truncate group-hover:text-[#ffd900] transition-colors">{s.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-5 text-center text-[11px] font-bold text-white/60">{s.pj}</td>
                                <td className="px-4 py-5 text-center text-[11px] font-bold text-white/60">{s.pg}</td>
                                <td className="px-4 py-5 text-center text-[11px] font-bold text-white/60">{s.pe}</td>
                                <td className="px-4 py-5 text-center text-[11px] font-bold text-white/60">{s.pp}</td>
                                <td className="px-4 py-5 text-center text-[11px] font-bold text-white/60">{s.gf}</td>
                                <td className="px-4 py-5 text-center text-[11px] font-bold text-white/60">{s.gc}</td>
                                <td className="px-4 py-5 text-center text-[11px] font-black text-white italic">{s.dg > 0 ? `+${s.dg}` : s.dg}</td>
                                <td className="px-4 py-5 text-center text-[11px] font-bold text-yellow-500/40">{s.yellow_cards}</td>
                                <td className="px-4 py-5 text-right pr-8 text-sm font-black text-[#ffd900] italic">{s.pts}</td>
                            </tr>
                        );
                    })}
            </tbody>
        </table>
    );

    return (
        <div className="min-h-screen bg-[#0a0f1a] pb-20">
            {/* Header Estilo Premium */}
            <div className={`relative pt-32 pb-20 px-4 md:px-10 overflow-hidden border-b border-white/5 ${tournament.banner_url ? 'min-h-[500px] flex items-end' : ''}`}
                style={tournament.banner_url ? {
                    backgroundImage: `url(${apiService.resolveImageUrl(tournament.banner_url)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                } : {}}
            >
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,rgba(255,217,0,0.1),transparent_60%)] pointer-events-none"></div>
                {tournament.banner_url && <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/80 to-transparent pointer-events-none"></div>}

                <div className="max-w-7xl mx-auto relative z-[60] w-full">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                        <div className="space-y-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 text-white/40 hover:text-[#ffd900] transition-colors text-[10px] font-black uppercase tracking-widest mb-4"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Volver
                            </button>
                            <div className="flex flex-wrap items-center gap-4 text-[#ffd900]">
                                <span className="h-[2px] w-12 bg-[#ffd900]"></span>
                                <span className="text-[11px] font-black uppercase tracking-[0.4em]">{tournament.structure} / {formatStatus(tournament.status)}</span>
                                {(tournament as any).category_name && (
                                    <>
                                        <span className="text-white/20">•</span>
                                        <Link
                                            to={`/category/${tournament.category_id}`}
                                            className="text-[11px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors"
                                        >
                                            Serie: {(tournament as any).category_name}
                                        </Link>
                                    </>
                                )}
                                {(tournament as any).region_name && (
                                    <>
                                        <span className="text-white/20">•</span>
                                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/60">
                                            {(tournament as any).region_name}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-6">
                                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none uppercase italic">
                                    {tournament.name}
                                </h1>
                                {tournament.status?.toLowerCase() === 'closed' && (tournament as any).winner && (
                                    <div
                                        className="flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-sm group cursor-pointer hover:border-[#ffd900]/40 transition-all"
                                        onClick={() => navigate(`/team/${(tournament as any).winner.slug}`)}
                                    >
                                        <img src={apiService.resolveImageUrl((tournament as any).winner.logo_url)} className="size-12 object-contain group-hover:scale-110 transition-transform" alt="" />
                                        <div>
                                            <p className="text-[9px] font-black text-[#ffd900] uppercase tracking-[0.2em] mb-0.5">🏆 CAMPEÓN</p>
                                            <p className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{(tournament as any).winner.name}</p>
                                        </div>
                                    </div>
                                )}
                                {Number(tournament.is_jo) === 1 && (
                                    <div className="flex items-center gap-2 bg-[#ffd900] text-black px-4 py-2 rounded-sm shadow-[0_0_20px_rgba(255,217,0,0.3)]">
                                        <span className="material-symbols-outlined text-sm font-bold fill-1">star</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">JO</span>
                                    </div>
                                )}
                                {tournament.status?.toLowerCase() === 'draft' && (
                                    <div className="flex items-center gap-2 bg-white/10 text-white/60 px-4 py-2 rounded-sm border border-white/5">
                                        <span className="material-symbols-outlined text-sm">edit_note</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">BORRADOR</span>
                                    </div>
                                )}
                                {tournament.status?.toLowerCase() === 'registration_closed' && (
                                    <div className="flex items-center gap-2 bg-orange-500/20 text-orange-500 px-4 py-2 rounded-sm border border-orange-500/20">
                                        <span className="material-symbols-outlined text-sm">lock_person</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter italic">INSCRIPCIONES CERRADAS</span>
                                    </div>
                                )}
                                {tournament.rules_url && (
                                    <a
                                        href={apiService.resolveImageUrl(tournament.rules_url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-[#ffd900]/10 text-[#ffd900] px-6 py-2 rounded-sm border border-[#ffd900]/30 hover:bg-[#ffd900]/20 hover:scale-105 transition-all shadow-[0_0_15px_rgba(255,217,0,0.15)] cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-sm">description</span>
                                        <span className="text-[10px] font-black uppercase tracking-tighter">VER BASES DEL TORNEO</span>
                                    </a>
                                )}
                            </div>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                Organizado por: <span className="text-white">{tournament.organizer_id}</span>
                                {Number(tournament.is_jo) === 0 && (tournament as any).creator_username && (
                                    <>
                                        <span className="text-white/20 mx-2">•</span>
                                        Creado por: <span className="text-white normal-case tracking-normal">{(tournament as any).creator_username}</span>
                                    </>
                                )}
                            </p>

                            <div className="flex flex-wrap gap-8 mt-6">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Inscripciones</p>
                                    <p className="text-xs font-bold text-white/60">
                                        {tournament.registration_start ? formatLocalDate(tournament.registration_start) : 'N/A'} - {tournament.registration_end ? formatLocalDate(tournament.registration_end) : 'Cierre Manual'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Inicio Estimado</p>
                                    <p className="text-xs font-bold text-white/60">
                                        {tournament.estimated_start ? formatLocalDate(tournament.estimated_start) : 'Por definir'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Premios / Pool</p>
                                    <p className="text-xs font-black text-[#ffd900] uppercase italic">
                                        {tournament.prizes || 'Sin premios informados'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Límite Equipos</p>
                                    <p className="text-xs font-bold text-white/60">
                                        {participants.filter(p => Number(p.is_waiting) === 0).length} / {Number(tournament.max_teams) === 99 ? 'Sin máximo' : (tournament.max_teams || 32)} (Min: {tournament.min_teams || 2})
                                        {participants.some(p => Number(p.is_waiting) === 1) && (
                                            <span className="ml-2 text-[#ffd900] text-[9px] font-black">+ {participants.filter(p => Number(p.is_waiting) === 1).length} EN ESPERA</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 relative z-[100]">
                            {canEdit && (
                                <>
                                    {tournament.status?.toLowerCase() === 'draft' && (
                                        <button
                                            onClick={() => handleUpdateStatus('open')}
                                            className="bg-[#ffd900] text-black px-10 py-5 font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_30px_rgba(255,217,0,0.2)]"
                                        >
                                            <span className="material-symbols-outlined text-lg">public</span>
                                            PUBLICAR TORNEO
                                        </button>
                                    )}

                                    {tournament.status?.toLowerCase() === 'open' && (
                                        <button
                                            onClick={() => handleUpdateStatus('registration_closed')}
                                            className="bg-[#ffd900] text-black px-10 py-5 font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_30px_rgba(255,217,0,0.2)]"
                                        >
                                            <span className="material-symbols-outlined text-lg">lock</span>
                                            CERRAR INSCRIPCIONES
                                        </button>
                                    )}

                                    {tournament.status?.toLowerCase() === 'registration_closed' && (
                                        <button
                                            onClick={() => {
                                                const officialCount = participants.filter(p => Number(p.is_waiting) === 0).length;
                                                const maxTeams = Number(tournament.max_teams);

                                                if (officialCount > maxTeams) {
                                                    openConfirm({
                                                        title: 'Exceso de Participantes',
                                                        message: `Hay ${officialCount} equipos confirmados pero el máximo es ${maxTeams}. ¿Deseas ajustar el cupo máximo a ${officialCount} e iniciar el torneo ahora?`,
                                                        onConfirm: async () => {
                                                            try {
                                                                // Enviar solo la meta-información necesaria para evitar reseteos y exceso de datos
                                                                await apiService.updateTournament(tournament.id, {
                                                                    id: tournament.id,
                                                                    name: tournament.name,
                                                                    status: tournament.status,
                                                                    structure: tournament.structure,
                                                                    max_teams: officialCount,
                                                                    is_jo: tournament.is_jo,
                                                                    participant_type: tournament.participant_type,
                                                                    organizer_id: tournament.organizer_id
                                                                });
                                                                if (tournament.structure?.toLowerCase() === 'híbrido' || tournament.structure?.toLowerCase() === 'hibrido') {
                                                                    setIsHybridSetupModalOpen(true);
                                                                } else {
                                                                    setIsStartModalOpen(true);
                                                                }
                                                            } catch (err: any) {
                                                                alert('Error al ajustar cupo: ' + err.message);
                                                            }
                                                        }
                                                    });
                                                    return;
                                                }

                                                if (tournament.structure?.toLowerCase() === 'híbrido' || tournament.structure?.toLowerCase() === 'hibrido') {
                                                    setIsHybridSetupModalOpen(true);
                                                } else {
                                                    setIsStartModalOpen(true);
                                                }
                                            }}
                                            className="bg-[#ffd900] text-black px-10 py-5 font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_30px_rgba(255,217,0,0.2)]"
                                        >
                                            <span className="material-symbols-outlined text-lg">play_arrow</span>
                                            INICIAR TORNEO
                                        </button>
                                    )}

                                    {tournament.status?.toLowerCase() === 'in_progress' && (
                                        <button
                                            onClick={() => {
                                                const scheduledMatches = matches.filter(m => m.status?.toUpperCase() === 'SCHEDULED');

                                                if (scheduledMatches.length > 0) {
                                                    const msg = `ATENCIÓN: Aún quedan ${scheduledMatches.length} partidos programados sin jugar. ¿Cerrar torneo de todas formas?`;

                                                    openConfirm({
                                                        title: 'Cerrar Torneo con Pendientes',
                                                        message: msg,
                                                        isDangerous: true,
                                                        onConfirm: () => setIsCloseModalOpen(true)
                                                    });
                                                } else {
                                                    setIsCloseModalOpen(true);
                                                }
                                            }}
                                            className="bg-red-500 text-white px-8 py-5 font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                                        >
                                            <span className="material-symbols-outlined text-lg">dangerous</span>
                                            CERRAR TORNEO
                                        </button>
                                    )}

                                </>
                            )}
                            {!canEdit && tournament.status?.toLowerCase() === 'open' && (
                                <button
                                    onClick={handleSelfEnroll}
                                    className="bg-[#ffd900] text-black px-10 py-5 font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_30px_rgba(255,217,0,0.2)]"
                                >
                                    <span className="material-symbols-outlined text-lg">app_registration</span>
                                    INSCRIBIRSE AHORA
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ganadores destacados para Torneos Cerrados (Solo JO para el podio completo) */}
            {tournament.status?.toLowerCase() === 'closed' && (tournament as any).podiums && (tournament as any).podiums.length > 0 && Number(tournament.is_jo) === 1 && (
                <div className="max-w-7xl mx-auto px-4 md:px-10 mt-12">
                    <div className="bg-[#ffd900]/5 border border-[#ffd900]/20 p-8 rounded-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-[120px] text-[#ffd900]">trophy</span>
                        </div>

                        <div className="relative z-10">
                            <h2 className="text-sm font-black text-[#ffd900] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">workspace_premium</span>
                                {(tournament as any).is_jo ? 'PODIO DEL TORNEO' : 'CAMPEÓN DEL TORNEO'}
                            </h2>

                            <div className="flex flex-col md:flex-row gap-12 items-start">
                                {(() => {
                                    const podiums = (tournament as any).podiums || [];
                                    const isJo = Number(tournament.is_jo) === 1;
                                    const totalParticipants = participants.filter(p => Number(p.is_waiting) === 0).length;

                                    // Limitar podio por reglas JO o 1 para el resto
                                    let limit = isJo ? 1 : 1;
                                    if (isJo) {
                                        if (totalParticipants <= 4) limit = 2;
                                        else if (totalParticipants === 5) limit = 3;
                                        else limit = 4;
                                    }

                                    const visiblePodium = podiums.slice(0, limit);
                                    const champion = visiblePodium.find((p: any) => p.position === 1);
                                    // El usuario solicita que el podio completo aparezca abajo (incluyendo al #1)
                                    const podiumList = visiblePodium;

                                    return (
                                        <>
                                            {/* Campeón Destacado */}
                                            {champion && (
                                                <div
                                                    className="flex flex-col items-center gap-6 group cursor-pointer bg-black/40 p-10 border-2 border-[#ffd900] shadow-[0_0_40px_rgba(255,217,0,0.1)] rounded-sm min-w-[300px]"
                                                    onClick={() => navigate(`/team/${champion.slug}`)}
                                                >
                                                    <div className="relative">
                                                        <div className="size-32 flex items-center justify-center p-4 transform transition-transform group-hover:scale-110">
                                                            <img src={apiService.resolveImageUrl(champion.logo_url)} className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,217,0,0.5)]" alt="" />
                                                        </div>
                                                        <div className="absolute -top-4 -right-4 size-10 bg-[#ffd900] text-black flex items-center justify-center rounded-full font-black italic text-lg shadow-[0_0_15px_rgba(255,217,0,0.5)]">
                                                            1
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black text-[#ffd900] uppercase tracking-[0.2em] mb-1">CAMPEÓN</p>
                                                        <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
                                                            {champion.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Resto del Top */}
                                            {podiumList.length > 0 && (
                                                <div className="flex-1 space-y-4 w-full">
                                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] pb-2 border-b border-white/5">Podio Final</p>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {podiumList.map((p: any) => {
                                                            let icon = "star";
                                                            let iconColor = "text-white/40";
                                                            if (p.position === 1) { icon = "workspace_premium"; iconColor = "text-[#ffd900]"; }
                                                            if (p.position === 2) { icon = "military_tech"; iconColor = "text-slate-300"; }
                                                            if (p.position === 3) { icon = "military_tech"; iconColor = "text-orange-400"; }
                                                            if (p.position === 4) { icon = "grade"; iconColor = "text-[#ffd900]"; }

                                                            return (
                                                                <div
                                                                    key={p.position}
                                                                    className="flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:border-white/20 transition-all group cursor-pointer"
                                                                    onClick={() => navigate(`/team/${p.slug}`)}
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`size-10 flex items-center justify-center rounded-sm bg-black/40 border border-white/5`}>
                                                                            <img src={apiService.resolveImageUrl(p.logo_url)} className="size-6 object-contain" alt="" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">{p.name}</h4>
                                                                            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Puesto {p.position}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`flex items-center gap-2 ${iconColor}`}>
                                                                        <span className="material-symbols-outlined text-xl">{icon}</span>
                                                                        {p.position === 4 && <span className="text-[10px] font-black italic">4</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs Navigation */}
            {tournament.structure?.toLowerCase() !== 'legacy' && (
                <div className="max-w-7xl mx-auto px-4 md:px-10 mt-10">
                    <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
                        {[
                            { id: 'clasificacion', label: 'Clasificación', icon: 'leaderboard' },
                            { id: 'llaves', label: 'Llaves / Brackets', icon: 'account_tree' },
                            { id: 'calendario', label: 'Calendario', icon: 'calendar_month' },
                            { id: 'participantes', label: 'Participantes', icon: 'groups' },
                            { id: 'incidencias', label: 'Incidencias', icon: 'warning' },
                            { id: 'fairplay', label: 'Fair Play', icon: 'gavel' },
                            { id: 'ranking', label: 'Ránking', icon: 'military_tech' },
                            { id: 'ajustes', label: 'Ajustes', icon: 'settings', editorOnly: true },
                        ].filter(tab => {
                            const structure = tournament.structure?.toLowerCase();
                            const status = tournament.status?.toLowerCase();
                            const isInitialStage = status === 'open' || status === 'registration_closed' || status === 'draft';

                            if (tab.editorOnly && !canEdit) return false;
                            if (tab.id === 'llaves' && (structure === 'liga' || structure === 'suizo')) return false;
                            if (tab.id === 'clasificacion' && structure === 'copa') return false;

                            // Ocultar pestañas de juego si el torneo no ha empezado
                            if (isInitialStage && (tab.id === 'calendario' || tab.id === 'clasificacion' || tab.id === 'llaves' || tab.id === 'fairplay' || tab.id === 'ranking' || tab.id === 'incidencias')) return false;

                            // Ocultar pestaña Ránking si no es torneo JO
                            if (tab.id === 'ranking' && Number(tournament.is_jo) !== 1) return false;

                            return true;
                        }).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                    ? 'bg-[#ffd900] text-black'
                                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 md:px-10 mt-10">
                {tournament.structure?.toLowerCase() === 'legacy' ? (
                    <div className="max-w-4xl mx-auto">
                        <div className="relative group">
                            {/* Decoración superior */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                                <div className="h-10 w-[1px] bg-gradient-to-b from-transparent to-[#ffd900]"></div>
                                <span className="material-symbols-outlined text-[#ffd900] text-3xl animate-pulse">workspace_premium</span>
                            </div>

                            <div className="bg-[#121926]/40 border border-[#ffd900]/20 rounded-sm p-12 backdrop-blur-xl relative overflow-hidden transition-all duration-700 hover:border-[#ffd900]/40">
                                {/* Brillo de fondo */}
                                <div className="absolute top-0 right-0 size-64 bg-[#ffd900]/5 -mr-32 -mt-32 rounded-full blur-[80px]"></div>
                                <div className="absolute bottom-0 left-0 size-64 bg-[#ffd900]/5 -ml-32 -mb-32 rounded-full blur-[80px]"></div>

                                <div className="relative z-10 flex flex-col items-center text-center">
                                    {(tournament as any).winner ? (
                                        <>
                                            <div
                                                className="mb-8 cursor-pointer transform transition-all duration-500 hover:scale-110"
                                                onClick={() => navigate(`/team/${(tournament as any).winner.slug}`)}
                                            >
                                                <div className="relative">
                                                    <div className="size-48 flex items-center justify-center p-6 bg-black/40 border border-[#ffd900]/30 rounded-full shadow-[0_0_50px_rgba(255,217,0,0.1)] group-hover:shadow-[0_0_80px_rgba(255,217,0,0.2)]">
                                                        <img
                                                            src={apiService.resolveImageUrl((tournament as any).winner.logo_url)}
                                                            className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,217,0,0.5)]"
                                                            alt=""
                                                        />
                                                    </div>
                                                    <div className="absolute -top-2 -right-2 size-12 bg-[#ffd900] text-black flex items-center justify-center rounded-full font-black italic text-xl shadow-[0_0_20px_rgba(255,217,0,0.5)]">
                                                        #1
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-[#ffd900] text-sm font-black uppercase tracking-[0.4em] mb-2 italic">Campeón</p>
                                            <h2
                                                className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter transition-colors hover:text-[#ffd900] cursor-pointer"
                                                onClick={() => navigate(`/team/${(tournament as any).winner.slug}`)}
                                            >
                                                {(tournament as any).winner.name}
                                            </h2>

                                            <div className="w-24 h-1 bg-[#ffd900] my-8 opacity-40"></div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mt-4">
                                                <div className="bg-black/20 p-6 border border-white/5 group/info transition-all hover:bg-black/30">
                                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Entidad Organizadora</p>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="material-symbols-outlined text-[#ffd900] text-lg">verified</span>
                                                        <p className="text-xl font-bold text-white uppercase tracking-tighter">{tournament.organizer_id}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-black/20 p-6 border border-white/5 group/info transition-all hover:bg-black/30">
                                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Fecha del Evento</p>
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="material-symbols-outlined text-[#ffd900] text-lg">calendar_today</span>
                                                        <p className="text-xl font-bold text-white uppercase tracking-tighter">
                                                            {tournament.estimated_start ? formatLocalDate(tournament.estimated_start, { month: 'long', year: 'numeric' }).toUpperCase() : 'DESCONOCIDA'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-12 text-center max-w-xl">
                                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                                                    Este torneo ha sido registrado como parte del archivo histórico de Kick On.
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-20 text-center">
                                            <span className="material-symbols-outlined text-white/10 text-6xl mb-4">history_edu</span>
                                            <p className="text-sm font-black text-white/20 uppercase tracking-widest">Torneo Legacy sin campeón registrado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'participantes' && (
                            <div className="space-y-12">
                                {/* Lista de Espera Section */}
                                {participants.some(p => Number(p.is_waiting) === 1) && (
                                    <div className="space-y-4 animate-in fade-in duration-500">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-xl font-black text-[#ffd900] uppercase tracking-tighter italic">Solicitudes en Lista de Espera</h3>
                                            <div className="h-[1px] flex-1 bg-[#ffd900]/10"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {participants.filter(p => Number(p.is_waiting) === 1).map((p: any) => (
                                                <div key={p.id} className="bg-[#1a2235]/40 border border-white/5 p-6 flex flex-col items-center group hover:border-[#ffd900]/30 transition-all rounded-sm relative">
                                                    <div
                                                        className="size-20 bg-black/40 border border-white/5 flex items-center justify-center mb-4 overflow-hidden rounded-sm cursor-pointer group-hover:border-[#ffd900]/60 transition-all"
                                                        onClick={() => navigate(`/team/${p.team_slug}`)}
                                                    >
                                                        {p.team_logo ? (
                                                            <img src={apiService.resolveImageUrl(p.team_logo)} alt={p.team_name} className="w-full h-full object-contain p-2" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl text-white/10">shield</span>
                                                        )}
                                                    </div>
                                                    <h4
                                                        className="text-sm font-black text-white uppercase tracking-tighter text-center cursor-pointer hover:text-[#ffd900] transition-colors"
                                                        onClick={() => navigate(`/team/${p.team_slug}`)}
                                                    >
                                                        {p.team_name}
                                                    </h4>
                                                    <div className="flex flex-col items-center gap-1 mt-1">
                                                        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">Puntos: {Number(p.team_official_points || 0).toFixed(1)}</div>
                                                    </div>
                                                    {canEdit && (tournament.status?.toLowerCase() === 'draft' || tournament.status?.toLowerCase() === 'open' || tournament.status?.toLowerCase() === 'registration_closed') && (
                                                        <div className="flex gap-2 mt-4 w-full">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handlePromoteParticipant(p.team_id); }}
                                                                className="flex-1 py-2 bg-[#ffd900] text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-1 rounded-sm shadow-[0_0_15px_rgba(255,217,0,0.2)]"
                                                                title="Aprobar e incorporar al torneo"
                                                            >
                                                                <span className="material-symbols-outlined text-[12px] font-black">check</span>
                                                                Aprobar
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRemoveParticipant(p.team_id); }}
                                                                className="flex-1 py-2 bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-1 rounded-sm"
                                                                title="Rechazar y remover"
                                                            >
                                                                <span className="material-symbols-outlined text-[12px]">close</span>
                                                                Rechazar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Cuadro Principal / Confirmados Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Cuadro Principal / Confirmados</h3>
                                        <div className="h-[1px] flex-1 bg-white/5"></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {[...participants]
                                            .filter(p => Number(p.is_waiting) === 0)
                                            .sort((a, b) => (Number(b.team_official_points) || 0) - (Number(a.team_official_points) || 0))
                                            .map((p: any, index: number) => (
                                                <div key={p.id} className="bg-[#1a2235]/40 border border-white/5 p-6 flex flex-col items-center group hover:border-[#ffd900]/30 transition-all rounded-sm">
                                                    <div
                                                        className="size-20 bg-black/40 border border-white/5 flex items-center justify-center mb-4 overflow-hidden rounded-sm cursor-pointer group-hover:border-[#ffd900]/60 transition-all"
                                                        onClick={() => navigate(`/team/${p.team_slug}`)}
                                                    >
                                                        {p.team_logo ? (
                                                            <img src={apiService.resolveImageUrl(p.team_logo)} alt={p.team_name} className="w-full h-full object-contain p-2" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl text-white/10">shield</span>
                                                        )}
                                                    </div>
                                                    <h4
                                                        className="text-sm font-black text-white uppercase tracking-tighter text-center cursor-pointer hover:text-[#ffd900] transition-colors"
                                                        onClick={() => navigate(`/team/${p.team_slug}`)}
                                                    >
                                                        {p.team_name}
                                                    </h4>
                                                    <div className="flex flex-col items-center gap-1 mt-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest italic">Puntos: {Number(p.team_official_points || 0).toFixed(1)}</div>
                                                            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">#{index + 1}</div>
                                                        </div>
                                                        {Number(p.seed) > 0 && (
                                                            <span className="text-[10px] font-black text-[#ffd900] bg-[#ffd900]/10 px-2 py-0.5 rounded-full border border-[#ffd900]/20 italic group-hover:scale-110 transition-transform mt-1">
                                                                Seed #{p.seed}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Mazo Vinculado */}
                                                    {p.deck_name ? (
                                                        <div className="mt-4 flex flex-col items-center gap-1">
                                                            <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider">Mazo:</span>
                                                            {p.deck_id ? (
                                                                <Link 
                                                                    to={`/deck/${p.deck_id}`} 
                                                                    className="text-xs font-black text-[#ffd900] hover:underline uppercase tracking-tighter truncate max-w-[130px] italic flex items-center gap-0.5"
                                                                >
                                                                    <span className="material-symbols-outlined text-[12px]">style</span>
                                                                    {p.deck_name}
                                                                </Link>
                                                            ) : (
                                                                <span 
                                                                    className="text-xs font-black text-white/50 uppercase tracking-tighter truncate max-w-[130px] italic flex items-center gap-0.5"
                                                                    title="Mazo oculto hasta el inicio del torneo"
                                                                >
                                                                    <span className="material-symbols-outlined text-[12px]">style</span>
                                                                    {p.deck_name}
                                                                </span>
                                                            )}
                                                            {p.deck_win_rate !== null && p.deck_win_rate !== undefined && (
                                                                <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                                                                    WR: {Number(p.deck_win_rate).toFixed(1)}%
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-4 text-[9px] font-bold text-white/10 uppercase tracking-widest italic flex items-center gap-0.5">
                                                            <span className="material-symbols-outlined text-[12px] opacity-30">style</span>
                                                            Sin mazo
                                                        </div>
                                                    )}

                                                    {/* Botón de vincular/cambiar mazo */}
                                                    {(() => {
                                                        const isTeamOwner = currentUser && String(currentUser.id) === String(p.team_owner_user_id);
                                                        const canLink = (canEdit || isTeamOwner) && tournament.status?.toLowerCase() !== 'closed';
                                                        if (!canLink) return null;
                                                        return (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedParticipant(p);
                                                                    setIsLinkDeckModalOpen(true);
                                                                }}
                                                                className="mt-3 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#ffd900]/30 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all rounded-sm flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-[10px]">edit</span>
                                                                {p.deck_name ? 'Cambiar Mazo' : 'Vincular Mazo'}
                                                            </button>
                                                        );
                                                    })()}

                                                    {canEdit && (tournament.status?.toLowerCase() === 'draft' || tournament.status?.toLowerCase() === 'open' || tournament.status?.toLowerCase() === 'registration_closed') && (
                                                        <div className="flex gap-2 mt-4">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRemoveParticipant(p.team_id); }}
                                                                className="size-8 flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all rounded-sm group/btn"
                                                                title="Remover participante"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">person_remove</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        {(tournament.status?.toLowerCase() === 'open' || tournament.status?.toLowerCase() === 'draft') && canEdit && (
                                            <button
                                                onClick={() => setIsEnrollModalOpen(true)}
                                                className="h-full min-h-[160px] border-2 border-dashed border-white/5 rounded-sm flex flex-col items-center justify-center gap-2 text-white/20 hover:text-[#ffd900] hover:border-[#ffd900]/30 hover:bg-[#ffd900]/5 transition-all"
                                            >
                                                <span className="material-symbols-outlined text-4xl">add_circle</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Inscribir Equipo</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'calendario' && (
                            <div className="space-y-12">
                                {tournament.structure?.toLowerCase() === 'suizo' &&
                                    canEdit &&
                                    tournament.status?.toLowerCase() === 'in_progress' &&
                                    matches.length > 0 &&
                                    !matches.some(m => (m.round || 1) === maxRound && m.status === 'SCHEDULED') && (
                                        <div className="flex justify-end mb-6">
                                            <button
                                                onClick={handleGenerateSwissRound}
                                                className="px-6 py-3 bg-[#ffd900] text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2 group"
                                            >
                                                <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">auto_awesome_motion</span>
                                                Generar Fixture Siguiente Fecha
                                            </button>
                                        </div>
                                    )}

                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Filtrar por:</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedRound('all')}
                                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm ${selectedRound === 'all' ? 'bg-[#ffd900] text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                            >
                                                Todas
                                            </button>
                                            {Array.from({ length: maxRound }, (_, i) => i + 1).map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setSelectedRound(r)}
                                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm ${selectedRound === r ? 'bg-[#ffd900] text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                                                >
                                                    {getRoundLabel(r, tournament.structure)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {canEdit && matches.length > 0 && (
                                        <button
                                            onClick={() => setIsBulkScheduleModalOpen(true)}
                                            className="px-6 py-3 bg-[#ffd900] text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-sm">schedule</span>
                                            PROGRAMAR PARTIDOS
                                        </button>
                                    )}
                                </div>
                                {matches.length === 0 ? (
                                    <div className="py-20 text-center border border-dashed border-white/5 rounded-sm">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-6">El fixture no ha sido generado aún</p>
                                    </div>
                                ) : (
                                    <>
                                        {Object.entries(
                                            matches.reduce((acc: any, m) => {
                                                const r = m.round || 1;
                                                if (!acc[r]) acc[r] = [];
                                                acc[r].push(m);
                                                return acc;
                                            }, {})
                                        )
                                            .filter(([round]) => selectedRound === 'all' || Number(round) === selectedRound)
                                            .map(([round, roundMatches]: [string, any]) => (
                                                <div key={round} className="space-y-4">
                                                    <div className="flex items-center gap-4">
                                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">{getRoundLabel(Number(round), tournament.structure, roundMatches)}</h3>
                                                        <div className="h-[1px] flex-1 bg-white/5"></div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {roundMatches.map((m: any) => (
                                                            <div key={m.id} className="relative group">
                                                                <div className="bg-[#1a2235]/60 border border-white/5 p-4 flex items-center justify-between group-hover:border-[#ffd900]/30 transition-all cursor-pointer" onClick={() => {
                                                                    setSelectedMatch(m);
                                                                    setIsMatchDetailsOpen(true);
                                                                }}>
                                                                    <div className="flex-1 flex items-center gap-3">
                                                                        <img src={apiService.resolveImageUrl(m.home_logo)} className="size-8 object-contain opacity-50 group-hover:opacity-100 transition-opacity" alt="" />
                                                                        <span className="text-[11px] font-black text-white uppercase tracking-tighter truncate max-w-[120px]">{m.home_name}</span>
                                                                    </div>

                                                                    <div className="flex flex-col items-center gap-1 px-4 border-x border-white/5">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-2xl font-black text-white italic">{m.score_home ?? '-'}</span>
                                                                            <span className="text-[10px] font-black text-[#ffd900]">:</span>
                                                                            <span className="text-2xl font-black text-white italic">{m.score_away ?? '-'}</span>
                                                                        </div>
                                                                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{formatStatus(m.status)}</span>
                                                                        {m.group_name && (
                                                                            <span className="text-[9px] font-black text-[#ffd900] uppercase italic">Grupo {m.group_name}</span>
                                                                        )}
                                                                        {m.proof_url && (
                                                                            <a
                                                                                href={m.proof_url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="flex items-center gap-1 text-[8px] font-black text-[#ffd900] uppercase tracking-widest hover:underline mt-1"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[10px]">link</span>
                                                                                Ver Prueba
                                                                            </a>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex-1 flex items-center justify-end gap-3 text-right">
                                                                        <span className="text-[11px] font-black text-white uppercase tracking-tighter truncate max-w-[120px]">{m.away_name}</span>
                                                                        <img src={apiService.resolveImageUrl(m.away_logo)} className="size-8 object-contain opacity-50 group-hover:opacity-100 transition-opacity" alt="" />
                                                                    </div>
                                                                </div>

                                                                {(canEdit || (userTeam?.id && (String(m.team_home_id) === String(userTeam.id) || String(m.team_away_id) === String(userTeam.id)))) && (m.status?.toUpperCase() === 'PENDING' || m.status?.toUpperCase() === 'SCHEDULED') && (
                                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                                        {(m.team_home_id && m.team_away_id) ? (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedMatch(m);
                                                                                    if (m.status?.toUpperCase() === 'SCHEDULED') {
                                                                                        if (!m.played_at || !canEdit) {
                                                                                            setIsScheduleMatchModalOpen(true);
                                                                                        } else {
                                                                                            setIsMatchModalOpen(true);
                                                                                        }
                                                                                    } else {
                                                                                        setIsEditMatchModalOpen(true);
                                                                                    }
                                                                                }}
                                                                                className="bg-[#ffd900] text-black px-4 py-2 font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2"
                                                                            >
                                                                                <span className="material-symbols-outlined text-sm">
                                                                                    {m.status?.toUpperCase() === 'SCHEDULED' && !m.played_at ? 'calendar_month' : 'edit_square'}
                                                                                </span>
                                                                                {m.status?.toUpperCase() === 'PENDING'
                                                                                    ? 'EDITAR RESULTADO'
                                                                                    : (m.played_at && canEdit ? 'REGISTRAR RESULTADO' : 'PROGRAMAR ENCUENTRO')}
                                                                            </button>
                                                                        ) : (
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <span className="material-symbols-outlined text-white/20 text-2xl">lock</span>
                                                                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Esperando rivales</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {canEdit && (m.status?.toUpperCase() === 'PLAYED' || m.status?.toUpperCase() === 'WALKOVER') && (
                                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleRollback(m.id);
                                                                            }}
                                                                            className="size-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg"
                                                                            title="Invalidar Resultado (Rollback)"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm font-bold">history</span>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Detectar equipo libre en Ligas */}
                                                    {tournament.structure.toLowerCase() === 'liga' && participants.length % 2 !== 0 && (
                                                        <div className="bg-white/5 border border-dashed border-white/10 p-3 rounded-sm flex items-center justify-center gap-2">
                                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Equipo Libre:</span>
                                                            {(() => {
                                                                const playedIds = new Set(roundMatches.flatMap((rm: any) => [rm.team_home_id, rm.team_away_id]));
                                                                const freeTeam = participants.find(p => !playedIds.has(p.team_id));
                                                                return freeTeam ? (
                                                                    <span className="text-[9px] font-black text-[#ffd900] uppercase tracking-widest">{freeTeam.team_name}</span>
                                                                ) : <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">N/A</span>;
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'clasificacion' && (
                            <div className="space-y-12">
                                {(() => {
                                    const standings = (tournament as any).standings || [];
                                    const hasGroups = standings.some((s: any) => s.group_name);
                                    const hasStandings = standings.length > 0;

                                    return (
                                        <div className="space-y-12">
                                            {hasStandings && tournament.structure?.toLowerCase() !== 'copa' && (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Tabla de Posiciones</h3>
                                                        <div className="h-[1px] flex-1 bg-white/5"></div>
                                                    </div>
                                                    {!hasGroups ? (
                                                        <div className="overflow-x-auto">
                                                            {renderStandingsTable(standings)}
                                                        </div>
                                                    ) : (
                                                        Object.entries(
                                                            standings.reduce((acc: any, s: any) => {
                                                                const g = s.group_name || 'Sin Grupo';
                                                                if (!acc[g]) acc[g] = [];
                                                                acc[g].push(s);
                                                                return acc;
                                                            }, {})
                                                        ).map(([groupName, groupStandings]: [string, any]) => (
                                                            <div key={groupName} className="space-y-4">
                                                                <div className="flex items-center gap-4">
                                                                    <h3 className="text-lg font-black text-[#ffd900] uppercase tracking-tighter italic">Grupo {groupName}</h3>
                                                                    <div className="h-[1px] flex-1 bg-white/5"></div>
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    {renderStandingsTable(groupStandings)}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}



                                            {!hasStandings && (
                                                <div className="py-20 text-center border border-dashed border-white/5">
                                                    <span className="material-symbols-outlined text-4xl text-white/5 mb-4 block">leaderboard</span>
                                                    <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">No hay datos de clasificación registrados</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Bloque de Leyendas del resaltado */}
                                {tournament.highlight_settings && tournament.highlight_settings.length > 0 && tournament.highlight_settings.some(r => r.legend) && (
                                    <div className="mt-12 bg-white/5 border border-white/10 p-6 rounded-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                        <div className="flex items-center gap-2 text-white/40 mb-2">
                                            <span className="material-symbols-outlined text-sm">info</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Información de Clasificación (Leyenda)</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {tournament.highlight_settings
                                                .filter(rule => rule.legend)
                                                .map((rule, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 group">
                                                        <div 
                                                            className="size-4 shrink-0 border border-white/20 shadow-lg group-hover:scale-110 transition-transform" 
                                                            style={{ backgroundColor: rule.color }}
                                                        ></div>
                                                        <span className="text-[10px] font-bold text-white/80 uppercase tracking-tighter group-hover:text-white transition-colors">
                                                            {rule.legend}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'incidencias' && (
                            <div className="space-y-12 animate-in fade-in duration-500">
                                {renderInhabilitados()}
                            </div>
                        )}

                        {activeTab === 'fairplay' && (
                            <div className="space-y-12">
                                {(() => {
                                    const standings = (tournament as any).standings || [];
                                    const hasStandings = standings.length > 0;

                                    return (
                                        <div className="space-y-6 animate-in fade-in duration-500">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-xl font-black text-[#ffd900] uppercase tracking-tighter italic">Tabla de Fair Play (Juego Limpio)</h3>
                                                <div className="h-[1px] flex-1 bg-[#ffd900]/10"></div>
                                            </div>
                                            {hasStandings ? (
                                                <>
                                                    <div className="overflow-x-auto bg-[#1a2235]/20 border border-white/5 p-4 rounded-sm">
                                                        {renderFairPlayTable(standings)}
                                                    </div>
                                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-2 leading-relaxed">
                                                        Nota: Las tarjetas amarillas suman 1 punto de indisciplina y las rojas 3 puntos. El equipo con menor puntaje lidera el Fair Play y recibe una bonificación de +20% en el ranking al cerrar el torneo.
                                                    </p>
                                                </>
                                            ) : (
                                                <div className="py-20 text-center border border-dashed border-white/5 rounded-sm">
                                                    <span className="material-symbols-outlined text-4xl text-white/10 mb-4 block">gavel</span>
                                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No hay datos de disciplina registrados en este torneo aún</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {activeTab === 'ranking' && (
                            <div className="space-y-12">
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-xl font-black text-[#ffd900] uppercase tracking-tighter italic">Ránking Oficial - Puntos Obtenidos</h3>
                                        <div className="h-[1px] flex-1 bg-[#ffd900]/10"></div>
                                    </div>
                                    
                                    {(tournament as any).ranking_history && (tournament as any).ranking_history.length > 0 ? (
                                        <div className="overflow-x-auto bg-[#1a2235]/20 border border-white/5 p-4 rounded-sm">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-white/40 uppercase tracking-widest border-b border-white/10">
                                                        <th className="px-4 py-4 text-left w-12">Pos</th>
                                                        <th className="px-4 py-4 text-left">Equipo</th>
                                                        <th className="px-4 py-4 text-center">Pts Cancha (Base)</th>
                                                        <th className="px-4 py-4 text-left">Desempeño / Bonificaciones</th>
                                                        <th className="px-4 py-4 text-center">Mult. Nivel</th>
                                                        <th className="px-4 py-4 text-center">Mult. Legado</th>
                                                        <th className="px-4 py-4 text-center">Asistencia</th>
                                                        <th className="px-4 py-4 text-right pr-8 text-[#ffd900]">Total Ránking</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {(tournament as any).ranking_history.map((rh: any, idx: number) => (
                                                        <tr key={rh.id} className="group hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-5 text-[10px] font-black text-white/40 italic">{idx + 1}</td>
                                                            <td
                                                                className="px-4 py-5 cursor-pointer group"
                                                                onClick={() => navigate(`/team/${rh.team_slug}`)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <img src={apiService.resolveImageUrl(rh.team_logo)} className="size-6 object-contain group-hover:scale-110 transition-transform" alt="" />
                                                                    <span className="text-xs font-black text-white uppercase tracking-tighter truncate group-hover:text-[#ffd900] transition-colors">{rh.team_name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-5 text-center text-xs font-bold text-white/70">{rh.base_points}</td>
                                                            <td className="px-4 py-5 text-left text-[10px] font-black text-white/50 uppercase tracking-wide">
                                                                 {(() => {
                                                                     const summary = rh.multipliers_summary || "";
                                                                     const hasPodium = summary.includes("Lugar");
                                                                     const hasGoleador = summary.includes("Goleador");
                                                                     const hasMuro = summary.includes("Muro");
                                                                     const hasFairPlay = summary.includes("Fair Play");

                                                                     let podiumText = "";
                                                                     let podiumPct = 0;
                                                                     if (hasPodium) {
                                                                         if (summary.includes("1° Lugar")) { podiumText = "1° Lugar (+40%)"; podiumPct = 40; }
                                                                         else if (summary.includes("2° Lugar")) { podiumText = "2° Lugar (+30%)"; podiumPct = 30; }
                                                                         else if (summary.includes("3° Lugar")) { podiumText = "3° Lugar (+20%)"; podiumPct = 20; }
                                                                         else if (summary.includes("4° Lugar")) { podiumText = "4° Lugar (+10%)"; podiumPct = 10; }
                                                                     }

                                                                     const totalPercentage = podiumPct + (hasGoleador ? 20 : 0) + (hasMuro ? 20 : 0) + (hasFairPlay ? 20 : 0);

                                                                     return (
                                                                         <div className="flex items-center gap-3">
                                                                             <div className="flex items-center gap-2.5 bg-black/40 px-3 py-1.5 rounded-sm border border-white/5">
                                                                                 {/* Podio */}
                                                                                 <span 
                                                                                     className={`material-symbols-outlined text-base transition-all duration-300 ${hasPodium ? 'text-[#ffd900] drop-shadow-[0_0_8px_rgba(255,217,0,0.5)] scale-110' : 'text-white/10'}`}
                                                                                     title={hasPodium ? `${podiumPct === 40 ? '1°' : podiumPct === 30 ? '2°' : podiumPct === 20 ? '3°' : '4°'} lugar +${podiumPct}%` : undefined}
                                                                                 >
                                                                                     emoji_events
                                                                                 </span>
                                                                                 {/* Goleador */}
                                                                                 <span 
                                                                                     className={`material-symbols-outlined text-base transition-all duration-300 ${hasGoleador ? 'text-[#ffd900] drop-shadow-[0_0_8px_rgba(255,217,0,0.5)] scale-110' : 'text-white/10'}`}
                                                                                     title={hasGoleador ? 'goleador +20%' : undefined}
                                                                                 >
                                                                                     sports_soccer
                                                                                 </span>
                                                                                 {/* Muralla */}
                                                                                 <span 
                                                                                     className={`material-symbols-outlined text-base transition-all duration-300 ${hasMuro ? 'text-[#ffd900] drop-shadow-[0_0_8px_rgba(255,217,0,0.5)] scale-110' : 'text-white/10'}`}
                                                                                     title={hasMuro ? 'muralla +20%' : undefined}
                                                                                 >
                                                                                     shield
                                                                                 </span>
                                                                                 {/* Fair Play */}
                                                                                 <span 
                                                                                     className={`material-symbols-outlined text-base transition-all duration-300 ${hasFairPlay ? 'text-[#ffd900] drop-shadow-[0_0_8px_rgba(255,217,0,0.5)] scale-110' : 'text-white/10'}`}
                                                                                     title={hasFairPlay ? 'fair play +20%' : undefined}
                                                                                 >
                                                                                     gavel
                                                                                 </span>
                                                                             </div>
                                                                             {totalPercentage > 0 ? (
                                                                                 <span className="text-xs font-black italic text-[#ffd900] bg-[#ffd900]/10 border border-[#ffd900]/20 px-2 py-0.5 rounded-sm">
                                                                                     +{totalPercentage}%
                                                                                 </span>
                                                                             ) : (
                                                                                 <span className="text-xs font-bold text-white/20 italic">
                                                                                     0%
                                                                                 </span>
                                                                             )}
                                                                         </div>
                                                                     );
                                                                 })()}
                                                            </td>
                                                            <td className="px-4 py-5 text-center text-xs font-bold text-[#ffd900]">x{Number(rh.tournament_multiplier).toFixed(1)}</td>
                                                            <td className="px-4 py-5 text-center text-xs font-bold text-sky-400">x{Number(rh.legacy_multiplier).toFixed(1)}</td>
                                                            <td className="px-4 py-5 text-center text-xs font-bold text-green-400">+10 Pts</td>
                                                            <td className="px-4 py-5 text-right pr-8 text-sm font-black text-[#ffd900] italic">
                                                                {Number(rh.points_earned).toFixed(1)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="bg-[#121926]/40 border border-white/5 p-8 rounded-sm space-y-6">
                                            <div className="flex items-start gap-4">
                                                <span className="material-symbols-outlined text-4xl text-[#ffd900] animate-pulse">info</span>
                                                <div className="space-y-2">
                                                    <h4 className="text-sm font-black text-white uppercase tracking-wider">Cálculo de Ránking Oficial en Espera</h4>
                                                    <p className="text-xs text-white/60 leading-relaxed">
                                                        Los puntos del Ránking Oficial se calculan y otorgan automáticamente una vez que el torneo se cierra definitivamente (estado cerrado).
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="border-t border-white/5 pt-6 space-y-4">
                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Guía del Sistema de Puntos Ránking Oficial</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-white/60">
                                                    <div className="space-y-2.5">
                                                        <p className="font-bold text-white uppercase tracking-wide">Puntos Base (En cancha):</p>
                                                        <ul className="list-disc pl-4 space-y-1">
                                                            <li><strong className="text-white">Victoria Regular:</strong> +10 puntos.</li>
                                                            <li><strong className="text-white">Victoria Matagigantes:</strong> +20 puntos (si el oponente supera por &gt;50 de ELO).</li>
                                                            <li><strong className="text-white">Empate Parejo:</strong> +5 puntos (diferencia de ELO &lt;= 100).</li>
                                                            <li><strong className="text-white">Empate Desigual:</strong> +2 puntos al favorito y +8 puntos al débil (diferencia de ELO &gt; 100).</li>
                                                        </ul>
                                                    </div>

                                                    <div className="space-y-2.5">
                                                        <p className="font-bold text-white uppercase tracking-wide">Multiplicadores y Bonificaciones:</p>
                                                        <ul className="list-disc pl-4 space-y-1">
                                                            <li><strong className="text-white">Desempeño:</strong> 1° Puesto (+40%), 2° Puesto (+30%), 3° Puesto (+20%), 4° Puesto (+10%).</li>
                                                            <li><strong className="text-white">Menciones Extra (+20% c/u):</strong> Goleador, Muro (Valla menos batida), y Fair Play.</li>
                                                            <li><strong className="text-white">Nivel del Torneo:</strong> Tienda (x1.0), Regional/Ascenso (x1.5), Nacional/Oro (x2.0).</li>
                                                            <li><strong className="text-white">Legado:</strong> Bono acumulativo de asistencia consecutiva (desde x1.0 hasta x2.0).</li>
                                                            <li><strong className="text-white">Asistencia Fija:</strong> +10 puntos base a todos los participantes por asistir.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'llaves' && (
                            <div className="space-y-6">
                                <div className="bg-[#1a2235]/20 border border-white/5 rounded-sm p-4 min-h-[600px] relative overflow-hidden">
                                    <EliminationBracket
                                        matches={matches}
                                        onMatchClick={(m) => {
                                            setSelectedMatch(m);
                                            setIsMatchDetailsOpen(true);
                                        }}
                                    />
                                </div>
                                {tournament.structure?.toLowerCase() === 'copa' && renderInhabilitados()}
                            </div>
                        )}

                        {activeTab === 'ajustes' && canEdit && (
                            <div className="space-y-12 pb-20">
                                <section className="bg-[#121926]/40 border border-white/5 p-8 rounded-sm">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-white/5">
                                        <div>
                                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Panel de Control Administrativo</h3>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Gestiona la configuración y archivos multimedia del torneo.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <label className="cursor-pointer bg-white/5 text-white/50 px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-[#ffd900] hover:text-black transition-all flex items-center gap-2 rounded-sm border border-white/10 group">
                                                <span className="material-symbols-outlined text-lg">image</span>
                                                Sustituir Banner
                                                <input type="file" accept="image/*" className="hidden" onChange={handleUploadBanner} />
                                            </label>

                                            <label className="cursor-pointer bg-white/5 text-white/50 px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-[#ffd900] hover:text-black transition-all flex items-center gap-2 rounded-sm border border-white/10 group">
                                                <span className="material-symbols-outlined text-lg">upload_file</span>
                                                {tournament.rules_url ? 'Sustituir Bases (PDF)' : 'Adjuntar Bases (PDF)'}
                                                <input type="file" accept=".pdf" className="hidden" onChange={handleUploadRules} />
                                            </label>

                                            {tournament.rules_url && (
                                                <button
                                                    onClick={handleRemoveRules}
                                                    className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 rounded-sm"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                    Eliminar Bases
                                                </button>
                                            )}

                                            {currentUser?.global_role === 'SUPER_ADMIN' && (
                                                <button
                                                    onClick={handleDeleteTournament}
                                                    className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 rounded-sm"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete_forever</span>
                                                    Destruir Torneo
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <TournamentSettingsForm
                                        tournament={tournament}
                                        onTournamentUpdated={fetchTournamentDetail}
                                    />
                                </section>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de Edición (Eliminado, ahora es pestaña) */}

            {
                isEnrollModalOpen && (
                    <EnrollTeamModal
                        isOpen={isEnrollModalOpen}
                        onClose={() => setIsEnrollModalOpen(false)}
                        tournamentId={tournament.id}
                        onEnrolled={fetchTournamentDetail}
                    />
                )
            }

            {
                isStartModalOpen && (
                    <StartTournamentModal
                        isOpen={isStartModalOpen}
                        onClose={() => setIsStartModalOpen(false)}
                        tournament={tournament}
                        onStarted={fetchTournamentDetail}
                        onManualSelect={() => {
                            if (tournament.structure?.toLowerCase() === 'copa') {
                                setIsManualBracketModalOpen(true);
                            } else {
                                setIsManualFixtureModalOpen(true);
                            }
                        }}
                    />
                )
            }

            {
                isScheduleMatchModalOpen && selectedMatch && (
                    <ScheduleMatchModal
                        isOpen={isScheduleMatchModalOpen}
                        onClose={() => setIsScheduleMatchModalOpen(false)}
                        match={selectedMatch}
                        onScheduled={() => {
                            fetchTournamentDetail(true);
                            setActiveTab('calendario');
                        }}
                    />
                )
            }
            {
                isMatchModalOpen && (
                    <MatchRegistrationModal
                        isOpen={isMatchModalOpen}
                        onClose={() => setIsMatchModalOpen(false)}
                        onMatchRegistered={fetchTournamentDetail}
                        initialTournamentId={tournament.id}
                        initialContext={(tournament.structure.toLowerCase() === 'liga' || tournament.structure.toLowerCase() === 'suizo') ? 'Liga' : 'Eliminatoria'}
                        initialHomeTeam={selectedMatch ? { id: selectedMatch.team_home_id, name: selectedMatch.home_name, current_elo: selectedMatch.home_elo || 1200, logo_url: selectedMatch.home_logo } as any : null}
                        initialAwayTeam={selectedMatch ? { id: selectedMatch.team_away_id, name: selectedMatch.away_name, current_elo: selectedMatch.away_elo || 1200, logo_url: selectedMatch.away_logo } as any : null}
                        initialMatchId={selectedMatch?.id}
                        initialPlayedAt={selectedMatch?.played_at}
                    />
                )
            }

            {
                isEditMatchModalOpen && (
                    <EditMatchModal
                        isOpen={isEditMatchModalOpen}
                        onClose={() => setIsEditMatchModalOpen(false)}
                        onMatchUpdated={fetchTournamentDetail}
                        match={selectedMatch}
                    />
                )
            }
            {
                isMatchDetailsOpen && selectedMatch && (
                    <MatchDetailsModal
                        isOpen={isMatchDetailsOpen}
                        onClose={() => setIsMatchDetailsOpen(false)}
                        match={selectedMatch}
                        onEdit={() => {
                            setIsMatchDetailsOpen(false);
                            setIsEditMatchModalOpen(true);
                        }}
                    />
                )
            }

            {
                isCloseModalOpen && tournament && (
                    <CloseTournamentModal
                        isOpen={isCloseModalOpen}
                        onClose={() => setIsCloseModalOpen(false)}
                        tournament={tournament}
                        participants={participants.filter(p => Number(p.is_waiting) === 0)}
                        onClosed={fetchTournamentDetail}
                    />
                )
            }
            {
                isHybridSetupModalOpen && tournament && (
                    <HybridSetupModal
                        isOpen={isHybridSetupModalOpen}
                        onClose={() => setIsHybridSetupModalOpen(false)}
                        tournament={tournament}
                        participants={participants.filter(p => Number(p.is_waiting) === 0)}
                        onStarted={fetchTournamentDetail}
                    />
                )
            }

            {
                isManualFixtureModalOpen && tournament && (
                    <ManualFixtureModal
                        isOpen={isManualFixtureModalOpen}
                        onClose={() => setIsManualFixtureModalOpen(false)}
                        tournament={tournament}
                        participants={participants.filter(p => Number(p.is_waiting) === 0)}
                        onStarted={fetchTournamentDetail}
                    />
                )
            }


            {
                isBulkScheduleModalOpen && tournament && (
                    <BulkScheduleModal
                        isOpen={isBulkScheduleModalOpen}
                        onClose={() => setIsBulkScheduleModalOpen(false)}
                        tournamentId={tournament.id}
                        maxRound={maxRound}
                        defaultRound={selectedRound}
                        onScheduled={() => fetchTournamentDetail(true)}
                    />
                )
            }

            {
                isLinkDeckModalOpen && selectedParticipant && tournament && (
                    <LinkDeckModal
                        isOpen={isLinkDeckModalOpen}
                        onClose={() => {
                            setIsLinkDeckModalOpen(false);
                            setSelectedParticipant(null);
                        }}
                        tournamentId={tournament.id}
                        teamId={selectedParticipant.team_id}
                        teamName={selectedParticipant.team_name}
                        currentDeckId={selectedParticipant.deck_id}
                        userId={selectedParticipant.team_owner_user_id}
                        loggedUserId={currentUser?.id || ''}
                        onLinked={() => fetchTournamentDetail(true)}
                    />
                )
            }

            <ConfirmActionModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDangerous={confirmConfig.isDangerous}
                requiresInput={confirmConfig.requiresInput}
                confirmText={confirmConfig.isDangerous ? 'Confirmar Acción Crítica' : 'Confirmar Acción'}
            />
        </div >
    );
};

export default TournamentDetail;
