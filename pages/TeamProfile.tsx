import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiService } from '../services/api';
import { Team } from '../types';
import { slugify } from '../utils/slugify';
import EditTeamModal from '../components/EditTeamModal';
import { formatStatus, parseLocalDate } from '../utils/formatters';
import { compressImage } from '../utils/imageUtils';
import MatchDetailsModal from '../components/MatchDetailsModal';
import EditMatchModal from '../components/EditMatchModal';


const TeamProfile: React.FC = () => {
    const { teamSlug } = useParams<{ teamSlug: string }>();
    const navigate = useNavigate();
    const [team, setTeam] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [rank, setRank] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [matches, setMatches] = useState<any[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [isMatchDetailsOpen, setIsMatchDetailsOpen] = useState(false);
    const [isEditMatchOpen, setIsEditMatchOpen] = useState(false);
    const [showNonOfficial, setShowNonOfficial] = useState(false);
    const [teamTournaments, setTeamTournaments] = useState<any[]>([]);
    const [activeTournamentTab, setActiveTournamentTab] = useState<'current' | 'history'>('current');


    const fetchTeam = async () => {
        setLoading(true);
        try {
            // En un escenario real, tendríamos apiService.getTeamBySlug
            // Por ahora filtraremos de apiService.getTeams()
            const data = await apiService.getTeams(false, true);
            const foundTeam = data.find((t: any) => t.slug === teamSlug);

            if (foundTeam) {
                // Calcular ranking dinámicamente
                const sortedTeams = [...data].sort((a, b) => {
                    const ptsA = Number(a.official_ranking_points) || 0;
                    const ptsB = Number(b.official_ranking_points) || 0;
                    if (ptsB !== ptsA) return ptsB - ptsA;

                    // 1. Rendimiento
                    const getPerformance = (t: any) => {
                        const w = Number(t.official_wins_count || 0);
                        const d = Number(t.official_draws_count || 0);
                        const l = Number(t.official_losses_count || 0);
                        const total = w + d + l;
                        return total === 0 ? 0 : (w * 3 + d) / (total * 3);
                    };
                    const perfA = getPerformance(a);
                    const perfB = getPerformance(b);
                    if (perfB !== perfA) return perfB - perfA;

                    // 2. ELO
                    const eloA = Number(a.current_elo) || 0;
                    const eloB = Number(b.current_elo) || 0;
                    if (eloB !== eloA) return eloB - eloA;

                    // 3. Partidos oficiales (menor arriba)
                    const matchesA = Number(a.official_total_matches) || 0;
                    const matchesB = Number(b.official_total_matches) || 0;
                    return matchesA - matchesB;
                });
                const currentRank = sortedTeams.findIndex(t => t.id === foundTeam.id) + 1;
                setRank(currentRank);
                setTeam(foundTeam);

                // Obtener historial de partidos
                const matchHistory = await apiService.getTeamMatches(foundTeam.id);
                console.log('Historial de partidos cargado:', matchHistory);
                setMatches(matchHistory);

                // Obtener torneos del equipo
                const tournamentsData = await apiService.getTeamTournaments(foundTeam.id);
                console.log('Torneos cargados:', tournamentsData);
                setTeamTournaments(tournamentsData);
            } else {
                setTeam(null);
            }
        } catch (error) {
            console.error('Error fetching team:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        const savedUser = localStorage.getItem('user');
        if (savedUser) setCurrentUser(JSON.parse(savedUser));
    }, []);

    useEffect(() => {
        if (teamSlug) fetchTeam();
    }, [teamSlug]);

    const canEdit = currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'EDITOR' || (currentUser && team && team.owner_user_id == currentUser.id);

    const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !team) return;
        try {
            setLoading(true);
            const compressedFile = await compressImage(file, 1920, 1080, 0.7);
            const uploadRes = await apiService.uploadImage(compressedFile, 'banners');
            if (uploadRes.status === 'success') {
                await apiService.updateTeam(team.id, {
                    ...team,
                    banner_url: uploadRes.url
                });
                fetchTeam();
            } else {
                alert('Error subiendo banner: ' + uploadRes.message);
                setLoading(false);
            }
        } catch (err: any) {
            alert('Error al adjuntar banner: ' + err.message);
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd900]"></div>
        </div>
    );

    if (!team) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f1a] text-center p-4">
            <span className="material-symbols-outlined text-6xl text-white/10 mb-4">error</span>
            <h2 className="text-2xl font-black uppercase text-white tracking-widest">Equipo no encontrado</h2>
            <button
                onClick={() => navigate(-1)}
                className="mt-6 px-8 py-3 bg-[#ffd900] text-black font-black uppercase tracking-widest text-xs"
            >
                Volver atrás
            </button>
        </div>
    );

    const titlesCount = team.official_titles_count;
    const secondCount = team.official_podium_second_count;
    const thirdCount = team.official_podium_third_count;
    const fourthCount = team.official_podium_fourth_count;
    const wonTournaments = team.official_won_tournament_names;

    const displayedMatches = matches.filter(m => {
        const isOfficial = m.is_jo === 1 || m.is_jo === '1' || String(m.is_jo) === '1';
        return showNonOfficial ? !isOfficial : isOfficial;
    });
    const currentWins = team.official_wins_count;
    const currentDraws = team.official_draws_count;
    const currentLosses = team.official_losses_count;
    const currentTotalMatches = team.official_total_matches;
    const currentGoalsFor = team.official_goals_for;
    const currentGoalsAgainst = team.official_goals_against;

    const bannerUrl = team.banner_url 
        ? apiService.resolveImageUrl(team.banner_url) 
        : '/imagenes/banners/Banner.png';

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-10 space-y-8">
            {/* Header section similar to Profile.tsx or TournamentDetail.tsx */}
            <div className="relative overflow-hidden rounded-xl border border-[#ffd900]/20 bg-gradient-to-br p-8 min-h-[400px] flex items-end"
                style={{
                    backgroundImage: `url(${bannerUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
                onError={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    if (!target.dataset.errorHandled) {
                        target.dataset.errorHandled = 'true';
                        target.style.backgroundImage = 'none';
                        target.classList.add('from-[#ffd900]/10', 'via-[#101622]', 'to-[#101622]');
                    }
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/80 to-transparent"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end w-full gap-8">
                    <div className="flex items-center gap-6">
                        <div className="h-32 w-32 rounded-xl bg-[#0d121f] border-2 border-[#ffd900] shadow-[0_0_20px_rgba(255,217,0,0.3)] overflow-hidden flex items-center justify-center relative">
                            <img 
                                src={team.logo_url ? apiService.resolveImageUrl(team.logo_url) : '/imagenes/logos/Escudo.png'} 
                                alt={team.name} 
                                className="w-full h-full object-contain p-2" 
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.errorHandled) {
                                        target.dataset.errorHandled = 'true';
                                        target.src = '/imagenes/logos/Escudo.png';
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-4xl font-extrabold tracking-tight uppercase text-white italic">
                                    {team.name}
                                </h2>
                                <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${team.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                                    team.status === 'HISTORICAL' ? 'bg-[#ffd900]/10 text-[#ffd900] border-[#ffd900]/30' :
                                        'bg-red-500/10 text-red-500 border-red-500/30'
                                    }`}>
                                    {formatStatus(team.status)}
                                </span>
                            </div>
                            <p className="text-white/40 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                <span className="material-symbols-outlined text-sm">person</span>
                                {(!team.owner_user_id || team.owner_user_id === '0' || team.owner_user_id === '') ? (
                                    team.status === 'HISTORICAL' ? 'Histórico' : 'Disponible'
                                ) : (
                                    <Link to={`/profile/${team.owner_user_id}`} className="text-[#ffd900] font-bold hover:underline">
                                        {team.owner_name || `Usuario #${team.owner_user_id}`}
                                    </Link>
                                )}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <div className="bg-[#ffd900] text-black px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(255,217,0,0.2)]">
                                    RANK #{rank || '--'}
                                </div>
                                <div className="bg-white/5 px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest text-white/60 border border-white/5 shadow-sm">
                                    {team.short_name || 'TCG'}
                                </div>

                                {canEdit && (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="bg-white text-black px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest hover:bg-[#ffd900] transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                        >
                                            <span className="material-symbols-outlined text-xs">settings</span>
                                            Gestionar Equipo
                                        </button>
                                        
                                        <label className="cursor-pointer bg-white/5 text-white/50 px-4 py-2 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 rounded border border-white/10 hover:border-white/30">
                                            <span className="material-symbols-outlined text-xs">image</span>
                                            Añadir Banner
                                            <input type="file" accept="image/*" className="hidden" onChange={handleUploadBanner} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#101622]/60 backdrop-blur border border-[#ffd900]/30 p-6 rounded-xl text-center min-w-[200px]">
                        <p className="text-xs font-bold text-[#ffd900] tracking-widest uppercase mb-1">Puntos Oficiales</p>
                        <div className="text-6xl font-black text-white leading-none italic">{Number(team.official_ranking_points || 0).toFixed(1)}</div>
                        <p className="text-[10px] font-bold text-white/55 uppercase tracking-widest mt-2 border-t border-white/10 pt-2 flex items-center justify-center gap-1.5">
                            ELO Actual: <span className="text-[#ffd900] font-black">{Number(team.current_elo || 0).toFixed(1)}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats and Charts */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            {
                                label: 'Rendimiento',
                                value: currentTotalMatches > 0
                                    ? `${Math.round(((currentWins * 3 + currentDraws * 1) / (currentTotalMatches * 3)) * 100)}%`
                                    : '--',
                                detail: `${currentTotalMatches || 0} Partidos Totales`,
                                color: '#ffd900'
                            },
                            {
                                label: 'Títulos',
                                value: titlesCount || 0,
                                detail: 'Títulos Oficiales',
                                color: '#4ade80'
                            },
                            {
                                label: 'Fundación',
                                value: team.founded_year || 'S/D',
                                detail: 'Año de Inicio',
                                color: 'white'
                            },
                            {
                                label: 'Mazos',
                                value: team.decks_count || 0,
                                detail: 'Estrategias Activas',
                                color: 'white'
                            },
                        ].map((stat, i) => (
                            <div key={i} className="bg-[#1a2332]/40 border border-white/5 p-5 rounded-lg">
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">{stat.label}</p>
                                <div className="text-2xl font-black text-white italic" style={{ color: stat.color }}>{stat.value}</div>
                                <p className="text-[9px] text-white/10 mt-2 font-bold uppercase tracking-widest">{stat.detail}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#1a2332]/40 border border-white/5 rounded-xl p-8">
                        <h3 className="font-bold text-lg mb-8 flex items-center gap-2 text-white uppercase tracking-widest italic">
                            <span className="material-symbols-outlined text-[#ffd900]">show_chart</span> RENDIMIENTO HISTÓRICO PUNTOS KO
                        </h3>
                        {(() => {
                            const historyData = team.official_points_history;
                            let accum = 0;
                            const parsedData = historyData
                                ? historyData.split('|')
                                    .map((entry: string) => {
                                        const parts = entry.split(':');
                                        if (parts.length < 2) return null;
                                        const [name, elo] = parts;
                                        accum += parseFloat(elo);
                                        return { name, elo: accum };
                                    })
                                    .filter((d): d is { name: string; elo: number } => d !== null && !isNaN(d.elo))
                                : [];

                            if (parsedData.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center h-[300px] border border-dashed border-white/10 rounded-lg bg-black/5">
                                        <span className="material-symbols-outlined text-4xl text-white/20 mb-2">show_chart</span>
                                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest text-center">Este equipo no ha disputado torneos oficiales</p>
                                    </div>
                                );
                            }

                            // Agregar punto actual
                            const chartData = [...parsedData, { 
                                name: 'ACTUAL', 
                                elo: Number(team.official_ranking_points || 0) 
                            }];

                            return (
                                <div className="h-[300px] w-full">
                                    {isMounted && (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorEloTeam" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ffd900" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#ffd900" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1a2332', border: '1px solid rgba(255,217,0,0.2)', borderRadius: '4px' }}
                                                    itemStyle={{ color: '#ffd900', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                                                    labelStyle={{ color: 'white', marginBottom: '4px', fontSize: '10px' }}
                                                />
                                                <Area type="monotone" dataKey="elo" stroke="#ffd900" fillOpacity={1} fill="url(#colorEloTeam)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Side panels */}
                <div className="space-y-8">
                    {/* Vitrina de Trofeos */}
                    <div className="bg-[#1a2332]/40 border border-[#ffd900]/20 rounded-xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-6xl text-[#ffd900]">emoji_events</span>
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#ffd900] mb-6 border-b border-[#ffd900]/10 pb-4 flex items-center gap-2">
                            VITRINA DE PODIOS
                        </h3>
                        <div className="grid grid-cols-4 gap-2">
                            <div className="text-center group">
                                <div className="text-3xl font-black text-[#ffd900] italic group-hover:scale-110 transition-transform">{titlesCount || 0}</div>
                                <div className="text-[7px] font-black text-white/30 uppercase tracking-widest mt-1">1° Lugar</div>
                                <div className="mt-2 flex justify-center">
                                    <span className="material-symbols-outlined text-[#ffd900] text-xl">workspace_premium</span>
                                </div>
                            </div>
                            <div className="text-center group">
                                <div className="text-3xl font-black text-slate-300 italic group-hover:scale-110 transition-transform">{secondCount || 0}</div>
                                <div className="text-[7px] font-black text-white/30 uppercase tracking-widest mt-1">2° Lugar</div>
                                <div className="mt-2 flex justify-center">
                                    <span className="material-symbols-outlined text-slate-300 text-xl">workspace_premium</span>
                                </div>
                            </div>
                            <div className="text-center group">
                                <div className="text-3xl font-black text-orange-400 italic group-hover:scale-110 transition-transform">{thirdCount || 0}</div>
                                <div className="text-[7px] font-black text-white/30 uppercase tracking-widest mt-1">3° Lugar</div>
                                <div className="mt-2 flex justify-center">
                                    <span className="material-symbols-outlined text-orange-400 text-xl">workspace_premium</span>
                                </div>
                            </div>
                            <div className="text-center group">
                                <div className="text-3xl font-black text-slate-500 italic group-hover:scale-110 transition-transform">{fourthCount || 0}</div>
                                <div className="text-[7px] font-black text-white/30 uppercase tracking-widest mt-1">4° Lugar</div>
                                <div className="mt-2 flex justify-center">
                                    <span className="material-symbols-outlined text-slate-500 text-xl">workspace_premium</span>
                                </div>
                            </div>
                        </div>

                        {/* Conteo de Títulos por Nivel */}
                        <div className="mt-6 pt-6 border-t border-white/5">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 text-center">TÍTULOS POR NIVEL</p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-[#10b981]/5 border border-[#10b981]/15 p-3 rounded text-center flex flex-col items-center">
                                    <div className="text-xl font-black text-[#10b981] italic">{team.official_titles_barrio || 0}</div>
                                    <span className="material-symbols-outlined text-[#10b981] text-lg my-1">emoji_events</span>
                                    <div className="text-[7px] font-black text-white/30 uppercase tracking-widest">Barrio</div>
                                </div>
                                <div className="bg-[#38bdf8]/5 border border-[#38bdf8]/15 p-3 rounded text-center flex flex-col items-center">
                                    <div className="text-xl font-black text-[#38bdf8] italic">{team.official_titles_ascenso || 0}</div>
                                    <span className="material-symbols-outlined text-[#38bdf8] text-lg my-1">military_tech</span>
                                    <div className="text-[7px] font-black text-white/30 uppercase tracking-widest">Ascenso</div>
                                </div>
                                <div className="bg-[#ffd900]/5 border border-[#ffd900]/15 p-3 rounded text-center flex flex-col items-center">
                                    <div className="text-xl font-black text-[#ffd900] italic">{team.official_titles_oro || 0}</div>
                                    <span className="material-symbols-outlined text-[#ffd900] text-lg my-1">workspace_premium</span>
                                    <div className="text-[7px] font-black text-white/30 uppercase tracking-widest">Oro</div>
                                </div>
                            </div>
                        </div>

                        {/* Copas Ganadas Detalle */}
                        {wonTournaments && (
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 text-center">Copas Obtenidas</p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {wonTournaments.split('|').map((entry: string, idx: number) => {
                                        const parts = entry.split('::');
                                        const name = parts[0];
                                        const id = parts[1];
                                        const level = (parts[2] || 'barrio').toLowerCase();

                                        let iconColor = 'text-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]';
                                        let iconName = 'emoji_events';
                                        if (level === 'ascenso') {
                                            iconColor = 'text-[#38bdf8] drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]';
                                            iconName = 'military_tech';
                                        } else if (level === 'oro') {
                                            iconColor = 'text-[#ffd900] drop-shadow-[0_0_8px_rgba(255,217,0,0.4)]';
                                            iconName = 'workspace_premium';
                                        }

                                        return (
                                            <div 
                                                key={idx} 
                                                className="relative group cursor-pointer hover:scale-110 transition-transform"
                                                onClick={() => id && navigate(`/tournament/${id}`)}
                                            >
                                                <span className={`material-symbols-outlined text-2xl ${iconColor}`}>{iconName}</span>
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-white/10 pointer-events-none z-50">
                                                    {name} ({level.toUpperCase()})
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black"></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detalle de Rendimiento */}
                    <div className="bg-[#1a2332]/60 border border-white/5 rounded-xl p-8">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#ffd900] mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#ffd900]">analytics</span> DETALLE DE RENDIMIENTO
                        </h3>

                        <div className="space-y-6">
                            {/* Ganados / Empatados / Perdidos */}
                            <div>
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Estadísticas de Partidos</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-green-500/10 border border-green-500/25 p-4 rounded-lg text-center relative overflow-hidden group">
                                        <div className="absolute -right-2 -bottom-2 text-green-500/10 text-4xl font-black italic pointer-events-none">PG</div>
                                        <div className="text-3xl font-black text-green-400 italic leading-none mb-1">{currentWins || 0}</div>
                                        <div className="text-[9px] font-black text-green-400/60 uppercase tracking-widest">PG (Ganados)</div>
                                    </div>
                                    <div className="bg-slate-500/10 border border-slate-500/25 p-4 rounded-lg text-center relative overflow-hidden group">
                                        <div className="absolute -right-2 -bottom-2 text-slate-400/10 text-4xl font-black italic pointer-events-none">PE</div>
                                        <div className="text-3xl font-black text-slate-300 italic leading-none mb-1">{currentDraws || 0}</div>
                                        <div className="text-[9px] font-black text-slate-300/60 uppercase tracking-widest">PE (Empatados)</div>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-lg text-center relative overflow-hidden group">
                                        <div className="absolute -right-2 -bottom-2 text-red-500/10 text-4xl font-black italic pointer-events-none">PP</div>
                                        <div className="text-3xl font-black text-red-400 italic leading-none mb-1">{currentLosses || 0}</div>
                                        <div className="text-[9px] font-black text-red-400/60 uppercase tracking-widest">PP (Perdidos)</div>
                                    </div>
                                </div>
                            </div>

                            {/* Goles Favor / Contra / Diferencia */}
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">Rendimiento de Goles</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-lg text-center relative overflow-hidden group">
                                        <div className="absolute -right-2 -bottom-2 text-white/5 text-4xl font-black italic pointer-events-none">GF</div>
                                        <div className="text-2xl font-black text-white italic leading-none mb-1">{currentGoalsFor || 0}</div>
                                        <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">GF (A Favor)</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 p-4 rounded-lg text-center relative overflow-hidden group">
                                        <div className="absolute -right-2 -bottom-2 text-white/5 text-4xl font-black italic pointer-events-none">GC</div>
                                        <div className="text-2xl font-black text-white italic leading-none mb-1">{currentGoalsAgainst || 0}</div>
                                        <div className="text-[9px] font-black text-white/40 uppercase tracking-widest">GC (En Contra)</div>
                                    </div>
                                    <div className={`border p-4 rounded-lg text-center relative overflow-hidden group ${
                                        (currentGoalsFor - currentGoalsAgainst) > 0 
                                            ? 'bg-green-500/10 border-green-500/25' 
                                            : (currentGoalsFor - currentGoalsAgainst) < 0 
                                                ? 'bg-red-500/10 border-red-500/25' 
                                                : 'bg-white/5 border-white/10'
                                    }`}>
                                        <div className="absolute -right-2 -bottom-2 opacity-10 text-4xl font-black italic pointer-events-none">DIF</div>
                                        <div className={`text-2xl font-black italic leading-none mb-1 ${
                                            (currentGoalsFor - currentGoalsAgainst) > 0 
                                                ? 'text-green-400' 
                                                : (currentGoalsFor - currentGoalsAgainst) < 0 
                                                    ? 'text-red-400' 
                                                    : 'text-white'
                                        }`}>
                                            {(currentGoalsFor - currentGoalsAgainst) > 0 ? '+' : ''}{currentGoalsFor - currentGoalsAgainst}
                                        </div>
                                        <div className={`text-[9px] font-black uppercase tracking-widest ${
                                            (currentGoalsFor - currentGoalsAgainst) > 0 
                                                ? 'text-green-400/60' 
                                                : (currentGoalsFor - currentGoalsAgainst) < 0 
                                                    ? 'text-red-400/60' 
                                                    : 'text-white/40'
                                        }`}>DIF (Diferencia)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sección de Torneos */}
            <div className="bg-[#1a2332]/40 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-lg flex items-center gap-3 text-white uppercase tracking-widest italic leading-none">
                        <span className="material-symbols-outlined text-[#ffd900]">emoji_events</span> TORNEOS
                    </h3>
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setActiveTournamentTab('current')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTournamentTab === 'current' ? 'border-[#ffd900] text-[#ffd900]' : 'border-transparent text-white/40 hover:text-white'}`}
                        >
                            En Curso / Inscritos
                        </button>
                        <button
                            onClick={() => setActiveTournamentTab('history')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTournamentTab === 'history' ? 'border-[#ffd900] text-[#ffd900]' : 'border-transparent text-white/40 hover:text-white'}`}
                        >
                            Disputados (Historial)
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    {activeTournamentTab === 'current' ? (
                        (() => {
                            const current = teamTournaments.filter(t => t.status !== 'finished' && t.status !== 'closed');
                            if (current.length === 0) {
                                return (
                                    <div className="text-center py-12">
                                        <span className="material-symbols-outlined text-4xl text-white/5 mb-2">sports_soccer</span>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">No hay torneos activos o inscripciones vigentes</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {current.map((t: any) => (
                                        <div key={t.id} className="bg-black/20 border border-white/5 p-5 rounded-lg flex items-center justify-between hover:border-[#ffd900]/20 transition-all">
                                            <div>
                                                <Link to={`/tournament/${t.id}`} className="text-sm font-black text-white uppercase tracking-wider hover:text-[#ffd900] transition-colors">
                                                    {t.name}
                                                </Link>
                                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                                                    {t.structure.toUpperCase()} • {t.participants_count} Equipos
                                                </p>
                                                {t.group_name && (
                                                    <span className="inline-block mt-2 bg-[#ffd900]/10 text-[#ffd900] border border-[#ffd900]/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                                        Grupo {t.group_name}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="px-3 py-1 bg-[#ffd900]/10 text-[#ffd900] border border-[#ffd900]/20 text-[9px] font-black uppercase tracking-widest rounded">
                                                {t.status === 'draft' ? 'Borrador' : t.status === 'open' ? 'Inscripciones' : 'En Curso'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()
                    ) : (
                        (() => {
                            const disputados = teamTournaments.filter(t => (t.status === 'finished' || t.status === 'closed') && Number(t.legacy) !== 1);
                            if (disputados.length === 0) {
                                return (
                                    <div className="text-center py-12">
                                        <span className="material-symbols-outlined text-4xl text-white/5 mb-2">emoji_events</span>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">El equipo no ha finalizado ningún torneo aún</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black/10">
                                                <th className="px-4 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5">Torneo</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 text-center">Rendimiento</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 text-center">Partidos</th>
                                                <th className="px-4 py-3 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 text-right">Resultado Final</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {disputados.map((t: any) => {
                                                // Calcular rendimiento del equipo en este torneo
                                                const tMatches = matches.filter(m => String(m.tournament_id) === String(t.id));
                                                const tTotal = tMatches.length;
                                                
                                                let tWins = 0;
                                                let tDraws = 0;
                                                tMatches.forEach(m => {
                                                    const isHome = String(team.id) === String(m.team_home_id);
                                                    if (m.score_home === m.score_away) {
                                                        tDraws++;
                                                    } else if (isHome && m.score_home > m.score_away) {
                                                        tWins++;
                                                    } else if (!isHome && m.score_away > m.score_home) {
                                                        tWins++;
                                                    }
                                                });

                                                const performance = tTotal > 0 
                                                    ? Math.round(((tWins * 3 + tDraws * 1) / (tTotal * 3)) * 100) 
                                                    : 0;

                                                const pos = parseInt(t.podium_position);

                                                return (
                                                    <tr key={t.id} className="hover:bg-white/[0.01]">
                                                        <td className="px-4 py-4">
                                                            <Link to={`/tournament/${t.id}`} className="text-xs font-black text-white uppercase tracking-wider hover:text-[#ffd900] transition-colors">
                                                                {t.name}
                                                            </Link>
                                                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">{t.season || 'Sin temporada'}</p>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className={`text-xs font-black italic ${performance >= 70 ? 'text-green-400' : performance >= 40 ? 'text-orange-400' : 'text-red-400'}`}>
                                                                {tTotal > 0 ? `${performance}%` : '--'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center text-xs font-bold text-white/50">
                                                            {tTotal} PJ ({tWins} G - {tDraws} E - {tTotal - tWins - tDraws} P)
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            {pos === 1 ? (
                                                                <span className="inline-flex items-center gap-1 bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(250,204,21,0.1)]">
                                                                    🏆 Campeón
                                                                </span>
                                                            ) : pos === 2 ? (
                                                                <span className="inline-flex items-center gap-1 bg-slate-300/10 text-slate-300 border border-slate-300/25 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                                                    🥈 Subcampeón
                                                                </span>
                                                            ) : pos === 3 ? (
                                                                <span className="inline-flex items-center gap-1 bg-amber-600/10 text-amber-500 border border-amber-500/25 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                                                    🥉 3° Puesto
                                                                </span>
                                                            ) : pos === 4 ? (
                                                                <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-400 border border-slate-500/25 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                                                    🏅 4° Puesto
                                                                </span>
                                                            ) : (
                                                                <span className="bg-white/5 text-white/40 border border-white/5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                                                    Participante
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()
                    )}
                </div>
            </div>

            {/* Historial de Partidos */}
            <div className="bg-[#1a2332]/40 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-lg flex items-center gap-3 text-white uppercase tracking-widest italic leading-none">
                        <span className="material-symbols-outlined text-[#ffd900]">history</span> 
                        {showNonOfficial ? 'HISTORIAL DE PARTIDOS NO OFICIALES' : 'HISTORIAL DE PARTIDOS OFICIALES'}
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black text-white/25 uppercase tracking-[0.2em]">{displayedMatches.length} Encuentros</div>
                        <div className="flex items-center gap-2 bg-black/30 border border-white/10 px-3 py-1.5 rounded-lg select-none">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/60">No Oficiales</span>
                            <button
                                onClick={() => setShowNonOfficial(!showNonOfficial)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showNonOfficial ? 'bg-[#ffd900]' : 'bg-white/15'}`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showNonOfficial ? 'translate-x-4.5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20">
                                <th className="px-8 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5">Fecha y Torneo</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 text-right">Local</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 text-center">Goles</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5">Visita</th>
                                <th className="px-8 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5 text-center">Variación ELO</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {displayedMatches.length > 0 ? (
                                displayedMatches.map((match: any) => {
                                    const isHome = String(team.id) === String(match.team_home_id);
                                    const eloDiff = parseInt(match.diff || '0');
                                    const matchDate = parseLocalDate(match.played_at);

                                    return (
                                        <tr key={match.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="text-[10px] font-black text-white uppercase tracking-wider mb-1">
                                                    {matchDate ? matchDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'S/D'}
                                                </div>
                                                <div className="text-[9px] font-bold text-[#ffd900]/40 uppercase tracking-widest">
                                                    {match.tournament_name || 'Amistoso / Especial'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <Link to={`/team/${match.home_slug}`} className={`text-[11px] font-black uppercase tracking-tighter hover:text-[#ffd900] transition-colors ${isHome ? 'text-[#ffd900]' : 'text-white/60'}`}>
                                                        {match.home_name}
                                                    </Link>
                                                    <div className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center p-1 overflow-hidden">
                                                        {match.home_logo ? (
                                                            <img src={apiService.resolveImageUrl(match.home_logo)} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-xs text-white/20">shield</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedMatch(match);
                                                        setIsMatchDetailsOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5 hover:border-[#ffd900]/40 hover:bg-[#ffd900]/5 transition-all cursor-pointer group/score"
                                                >
                                                    <span className={`text-sm font-black italic ${match.score_home > match.score_away ? 'text-[#ffd900]' : 'text-white/40'}`}>{match.score_home}</span>
                                                    <span className="text-[10px] text-white/10">-</span>
                                                    <span className={`text-sm font-black italic ${match.score_away > match.score_home ? 'text-[#ffd900]' : 'text-white/40'}`}>{match.score_away}</span>
                                                </button>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-black/40 border border-white/10 flex items-center justify-center p-1 overflow-hidden">
                                                        {match.away_logo ? (
                                                            <img src={apiService.resolveImageUrl(match.away_logo)} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-xs text-white/20">shield</span>
                                                        )}
                                                    </div>
                                                    <Link to={`/team/${match.away_slug}`} className={`text-[11px] font-black uppercase tracking-tighter hover:text-[#ffd900] transition-colors ${!isHome ? 'text-[#ffd900]' : 'text-white/60'}`}>
                                                        {match.away_name}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {match.diff !== null ? (
                                                        <div className={`text-[11px] font-black italic ${eloDiff > 0 ? 'text-green-500' : eloDiff < 0 ? 'text-red-500' : 'text-white/20'}`}>
                                                            {eloDiff > 0 ? '+' : ''}{eloDiff}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-white/10 italic">Pendiente</span>
                                                    )}
                                                    {(match.match_status || '').toUpperCase() === 'WALKOVER' && (
                                                        <div className="group/warn relative flex items-center">
                                                            <span className="material-symbols-outlined text-[14px] text-orange-500 cursor-help animate-pulse">report_problem</span>
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-orange-500/30 rounded text-[9px] text-orange-200 opacity-0 group-hover/warn:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl backdrop-blur-md">
                                                                <div className="font-black uppercase mb-1 flex items-center gap-1 border-b border-orange-500/20 pb-1">
                                                                    <span className="material-symbols-outlined text-[10px]">edit_note</span> Ajuste Admin
                                                                </div>
                                                                {match.admin_reason || 'Sin observación adicional'}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <span className="material-symbols-outlined text-4xl text-white/5 mb-4">analytics</span>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Sin registros históricos disponibles</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <EditTeamModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                team={team}
                onTeamUpdated={() => {
                    fetchTeam();
                    setIsEditModalOpen(false);
                }}
                currentUser={currentUser}
            />

            {isMatchDetailsOpen && selectedMatch && (
                <MatchDetailsModal
                    isOpen={isMatchDetailsOpen}
                    onClose={() => setIsMatchDetailsOpen(false)}
                    match={selectedMatch}
                    onEdit={currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'EDITOR' ? () => {
                        setIsMatchDetailsOpen(false);
                        setIsEditMatchOpen(true);
                    } : undefined}
                />
            )}

            {isEditMatchOpen && selectedMatch && (
                <EditMatchModal
                    isOpen={isEditMatchOpen}
                    onClose={() => setIsEditMatchOpen(false)}
                    onMatchUpdated={fetchTeam}
                    match={selectedMatch}
                />
            )}
        </div>
    );
};

export default TeamProfile;
