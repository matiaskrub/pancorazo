import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Card, Team, Match, Tournament, User, Noticia } from '../types';
import AddCardModal from '../components/AddCardModal';
import EditTeamModal from '../components/EditTeamModal';
import CreateTeamModal from '../components/CreateTeamModal';
import EditMatchModal from '../components/EditMatchModal';
import ScheduleMatchModal from '../components/ScheduleMatchModal';
import CreateTournamentModal from '../components/CreateTournamentModal';
import EditTournamentModal from '../components/EditTournamentModal';
import CreateCategoryModal from '../components/CreateCategoryModal';
import AddNewsModal from '../components/AddNewsModal';
import ConfirmActionModal from '../components/ConfirmActionModal';
import EditSeasonModal from '../components/EditSeasonModal';
import { formatStatus } from '../utils/formatters';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    const savedUser = localStorage.getItem('user');
    const currentUser: User | null = savedUser ? JSON.parse(savedUser) : null;

    // Validar acceso del usuario
    const hasAccess = currentUser && (
        currentUser.global_role === 'SUPER_ADMIN' ||
        currentUser.global_role === 'ADMIN' ||
        currentUser.global_role === 'EDITOR'
    );

    const [activeTab, setActiveTab] = useState<'cartas' | 'equipos' | 'partidos' | 'torneos' | 'configuracion'>(
        (localStorage.getItem('adminActiveTab') as any) || 'cartas'
    );
    const [settingsTab, setSettingsTab] = useState<'elo' | 'equipos' | 'noticias' | 'otros' | 'cierre_elo'>(
        (localStorage.getItem('adminSettingsTab') as any) || 'elo'
    );

    // Estados para los listados de datos
    const [cards, setCards] = useState<Card[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [teamClaims, setTeamClaims] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [news, setNews] = useState<Noticia[]>([]);
    const [seasons, setSeasons] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [matchStatusFilter, setMatchStatusFilter] = useState<string>('ALL');
    const [tournamentStatusFilter, setTournamentStatusFilter] = useState<string>('ALL');

    // Estado para nueva temporada
    const [newSeasonName, setNewSeasonName] = useState('');

    // Estados para Modales
    const [isAddCardOpen, setIsAddCardOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    
    const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
    const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    const [isScheduleMatchOpen, setIsScheduleMatchOpen] = useState(false);
    const [isEditMatchOpen, setIsEditMatchOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    const [isCreateTournamentOpen, setIsCreateTournamentOpen] = useState(false);
    const [isEditTournamentOpen, setIsEditTournamentOpen] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

    const [isAddNewsOpen, setIsAddNewsOpen] = useState(false);
    const [selectedNews, setSelectedNews] = useState<Noticia | null>(null);

    const [isEditSeasonOpen, setIsEditSeasonOpen] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState<any | null>(null);

    // Confirm Modal
    const [confirmModal, setConfirmModal] = useState<{
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

    const openConfirm = (opts: { title: string; message: string; onConfirm: () => void; isDangerous?: boolean }) => {
        setConfirmModal({
            isOpen: true,
            title: opts.title,
            message: opts.message,
            onConfirm: opts.onConfirm,
            isDangerous: opts.isDangerous
        });
    };

    // Función unificada para cargar la pestaña seleccionada
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'cartas') {
                const data = await apiService.getCards({ search: searchTerm });
                setCards(data);
            } else if (activeTab === 'equipos') {
                const data = await apiService.getTeams(false, true, searchTerm);
                setTeams(data);
            } else if (activeTab === 'partidos') {
                const data = await apiService.getMatches();
                setMatches(data);
            } else if (activeTab === 'torneos') {
                const data = await apiService.getTournaments();
                setTournaments(data);
            } else if (activeTab === 'configuracion') {
                if (settingsTab === 'elo') {
                    const data = await apiService.getMatches();
                    setMatches(data);
                } else if (settingsTab === 'equipos') {
                    const claims = await apiService.getPendingTeamClaims();
                    setTeamClaims(claims);
                } else if (settingsTab === 'noticias') {
                    const notices = await apiService.getNoticias(100, 0, undefined, true);
                    setNews(notices);
                } else if (settingsTab === 'otros') {
                    const cats = await apiService.getTournamentCategories();
                    setCategories(cats);
                } else if (settingsTab === 'cierre_elo') {
                    const s = await apiService.getSeasons();
                    setSeasons(s);
                }
            }
        } catch (err: any) {
            console.error('Error loading admin dashboard data:', err);
            setError(err.message || 'Error al conectar con la base de datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasAccess) {
            localStorage.setItem('adminActiveTab', activeTab);
            localStorage.setItem('adminSettingsTab', settingsTab);
            fetchData();
        }
    }, [activeTab, settingsTab, hasAccess]);

    const handleTabChange = (tab: typeof activeTab) => {
        setActiveTab(tab);
        setSearchTerm('');
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    // ACCIONES DE CARTA
    const handleDeleteCard = async (cardId: string) => {
        openConfirm({
            title: 'Eliminar Carta',
            message: '¿Estás seguro de eliminar esta carta de manera permanente? Esta acción no se puede deshacer.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.deleteCard(cardId);
                    fetchData();
                } catch (err: any) {
                    alert('Error al eliminar la carta: ' + err.message);
                }
            }
        });
    };

    // ACCIONES DE TORNEO
    const handleDeleteTournament = async (id: string | number) => {
        openConfirm({
            title: 'Eliminar Torneo',
            message: '¿Estás seguro de eliminar este torneo permanentemente? Se eliminarán todos los enfrentamientos y estadísticas vinculadas.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.deleteTournament(id);
                    fetchData();
                } catch (err: any) {
                    alert('Error al eliminar torneo: ' + err.message);
                }
            }
        });
    };

    // ACCIONES DE PARTIDO
    const handleRollbackMatch = async (matchId: string | number) => {
        openConfirm({
            title: 'Deshacer ELO de Partido',
            message: '¿Estás seguro de revertir este partido? Volverá al estado pendiente y se recalcularán los puntos correspondientes de ranking y ELO.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.rollbackMatch(matchId);
                    alert('Resultado ELO revertido con éxito.');
                    fetchData();
                } catch (err: any) {
                    alert('Error al revertir partido: ' + err.message);
                }
            }
        });
    };

    // ACCIONES DE CONFIGURACIÓN
    const handleAuthorizeElo = async (matchId: string | number) => {
        openConfirm({
            title: 'Autorizar ELO',
            message: '¿Estás seguro de autorizar este resultado de partido y aplicar los puntos de ELO en el ranking?',
            onConfirm: async () => {
                try {
                    await apiService.authorizeElo(matchId);
                    alert('Partido autorizado y ranking recalculado.');
                    fetchData();
                } catch (err: any) {
                    alert('Error al autorizar ELO: ' + err.message);
                }
            }
        });
    };

    const handleDiscardElo = async (matchId: string | number) => {
        openConfirm({
            title: 'Descartar Partido',
            message: '¿Estás seguro de descartar este partido? Se ignorarán los cambios ELO para el ranking y quedará registrado como suspendido.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.discardElo(matchId);
                    alert('Partido descartado.');
                    fetchData();
                } catch (err: any) {
                    alert('Error al descartar: ' + err.message);
                }
            }
        });
    };

    const handleResolveClaim = async (claimId: number | string, action: 'approve' | 'reject') => {
        openConfirm({
            title: `${action === 'approve' ? 'Aprobar' : 'Rechazar'} Solicitud`,
            message: `¿Estás seguro de resolver la solicitud de pertenencia de equipo como ${action === 'approve' ? 'aprobada' : 'rechazada'}?`,
            isDangerous: action === 'reject',
            onConfirm: async () => {
                try {
                    await apiService.resolveTeamClaim(claimId, action);
                    alert('Solicitud resuelta con éxito.');
                    fetchData();
                } catch (err: any) {
                    alert('Error al procesar solicitud: ' + err.message);
                }
            }
        });
    };

    const handleDeleteNews = async (id: string) => {
        openConfirm({
            title: 'Eliminar Noticia',
            message: '¿Estás seguro de eliminar esta noticia? Esta acción no se puede deshacer.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.deleteNoticia(id);
                    fetchData();
                } catch (err: any) {
                    alert('Error al eliminar noticia: ' + err.message);
                }
            }
        });
    };

    const handleDeleteCategory = async (id: number) => {
        openConfirm({
            title: 'Eliminar Serie',
            message: '¿Eliminar esta serie/categoría de torneos? Los torneos asociados quedarán huérfanos de categoría.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.deleteTournamentCategory(id);
                    fetchData();
                } catch (err: any) {
                    alert('Error al eliminar la categoría: ' + err.message);
                }
            }
        });
    };

    const handleCreateSeason = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSeasonName.trim()) return;
        try {
            await apiService.createSeason(newSeasonName.trim().toUpperCase());
            alert('Temporada creada con éxito.');
            setNewSeasonName('');
            fetchData();
        } catch (err: any) {
            alert('Error al crear temporada: ' + err.message);
        }
    };

    const handleActivateSeason = async (id: number | string) => {
        openConfirm({
            title: 'Activar Temporada',
            message: '¿Estás seguro de activar esta temporada? Pasará a ser la actual y desactivará las demás temporadas.',
            onConfirm: async () => {
                try {
                    await apiService.activateSeason(id);
                    alert('Temporada activada correctamente.');
                    fetchData();
                } catch (err: any) {
                    alert('Error al activar la temporada: ' + err.message);
                }
            }
        });
    };

    const handleCloseSeason = async (id: number | string) => {
        openConfirm({
            title: 'Cerrar Temporada',
            message: '¿Cerrar esta temporada? Guardará los puntajes finales de ELO de los equipos en el histórico y ya no estará activa.',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await apiService.closeSeason(id);
                    alert('Temporada cerrada y snapshot de ranking ELO guardado correctamente.');
                    fetchData();
                } catch (err: any) {
                    alert('Error al cerrar temporada: ' + err.message);
                }
            }
        });
    };

    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex flex-col items-center justify-center p-4">
                <span className="material-symbols-outlined text-6xl text-red-500 mb-4 animate-pulse">lock</span>
                <h1 className="text-2xl font-black uppercase text-white tracking-widest text-center">Acceso Denegado</h1>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-2 text-center">
                    No tienes los privilegios de administrador para ingresar a esta consola.
                </p>
                <Link to="/" className="mt-8 px-6 py-3 bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-colors">
                    Volver a Inicio
                </Link>
            </div>
        );
    }

    // Filtrar partidos en memoria con corrección de nombres de equipo
    const filteredMatches = matches.filter(m => {
        if (matchStatusFilter !== 'ALL' && m.status !== matchStatusFilter) return false;
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        const homeName = (m.home_name || m.home_team_name || '').toLowerCase();
        const awayName = (m.away_name || m.away_team_name || '').toLowerCase();
        return (
            homeName.includes(query) ||
            awayName.includes(query) ||
            m.tournament_name?.toLowerCase().includes(query) ||
            String(m.id).includes(query)
        );
    });

    // Agrupar partidos filtrados por torneo
    const getGroupedMatches = () => {
        const grouped: Record<string, Match[]> = {};
        filteredMatches.forEach(m => {
            const tName = m.tournament_name || 'Amistoso Oficial';
            if (!grouped[tName]) {
                grouped[tName] = [];
            }
            grouped[tName].push(m);
        });
        return grouped;
    };

    // Ordenar torneos del más nuevo al más antiguo y filtrar por estado/búsqueda
    const getFilteredTournaments = () => {
        const sorted = [...tournaments].sort((a, b) => parseInt(b.id) - parseInt(a.id));
        return sorted.filter(t => {
            if (tournamentStatusFilter !== 'ALL') {
                if (tournamentStatusFilter === 'closed') {
                    // closed y finished se consideran terminados
                    if (t.status !== 'closed' && t.status !== 'finished') return false;
                } else if (t.status !== tournamentStatusFilter) {
                    return false;
                }
            }
            if (!searchTerm.trim()) return true;
            const query = searchTerm.toLowerCase();
            return t.name.toLowerCase().includes(query) || String(t.id).includes(query);
        });
    };

    // Agrupar autorizaciones ELO pendientes por torneo
    const getGroupedPendingEloMatches = () => {
        const pending = matches.filter(m => m.status === 'PENDING' && m.score_home !== null);
        const grouped: Record<string, Match[]> = {};
        pending.forEach(m => {
            const tName = m.tournament_name || 'Amistoso Oficial';
            if (!grouped[tName]) {
                grouped[tName] = [];
            }
            grouped[tName].push(m);
        });
        return grouped;
    };

    return (
        <div className="min-h-screen bg-[#0a0f1a] pt-24 pb-20 px-4 md:px-10 font-display">
            {/* Header del Dashboard */}
            <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                    <div className="flex items-center gap-2 text-[#ffd900] mb-2">
                        <span className="h-[1px] w-6 bg-[#ffd900]"></span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Panel de Control</span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Administración</h1>
                </div>

                {/* Tabs Principales */}
                <div className="flex flex-wrap gap-1 bg-black/40 border border-white/5 p-1 rounded-sm">
                    {[
                        { id: 'cartas', label: 'Cartas', icon: 'style' },
                        { id: 'equipos', label: 'Equipos', icon: 'shield' },
                        { id: 'partidos', label: 'Partidos', icon: 'sports_soccer' },
                        { id: 'torneos', label: 'Torneos', icon: 'emoji_events' },
                        { id: 'configuracion', label: 'Ajustes', icon: 'settings' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm ${
                                activeTab === tab.id
                                    ? 'bg-[#ffd900] text-black shadow-lg shadow-[#ffd900]/10'
                                    : 'text-white/40 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {/* Panel Central */}
                <div className="bg-[#0d121f]/95 border border-white/5 shadow-2xl rounded-sm min-h-[600px] flex flex-col relative overflow-hidden backdrop-blur-md">
                    {/* Barra de Búsqueda y Herramientas (excepto en configuración) */}
                    {activeTab !== 'configuracion' && (
                        <div className="p-6 border-b border-white/5 bg-white/2 flex flex-col md:flex-row gap-4 justify-between items-center">
                            <form onSubmit={handleSearchSubmit} className="flex w-full md:max-w-md bg-black/40 border border-white/10 rounded-sm overflow-hidden focus-within:border-[#ffd900] transition-colors">
                                <input
                                    type="text"
                                    placeholder={`Buscar por nombre o ID...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 bg-transparent px-4 py-2.5 text-xs text-white outline-none placeholder:text-white/20"
                                />
                                <button type="submit" className="px-4 text-white/40 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-sm">search</span>
                                </button>
                            </form>

                            <div className="flex gap-3 w-full md:w-auto justify-end">
                                {activeTab === 'cartas' && (
                                    <button
                                        onClick={() => { setEditingCard(null); setIsAddCardOpen(true); }}
                                        className="bg-[#ffd900] text-black px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#ffed4d] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1 shadow-lg shadow-[#ffd900]/5"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span> Nueva Carta
                                    </button>
                                )}
                                {activeTab === 'equipos' && (
                                    <button
                                        onClick={() => setIsCreateTeamOpen(true)}
                                        className="bg-[#ffd900] text-black px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#ffed4d] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1 shadow-lg shadow-[#ffd900]/5"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span> Nuevo Equipo
                                    </button>
                                )}
                                {activeTab === 'partidos' && (
                                    <select
                                        value={matchStatusFilter}
                                        onChange={(e) => setMatchStatusFilter(e.target.value)}
                                        className="bg-black/40 border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 focus:outline-none focus:border-[#ffd900] cursor-pointer rounded-sm"
                                    >
                                        <option value="ALL">TODOS LOS ESTADOS</option>
                                        <option value="PENDING">PENDIENTES</option>
                                        <option value="SCHEDULED">PROGRAMADOS</option>
                                        <option value="PLAYED">JUGADOS</option>
                                        <option value="COMPLETED">COMPLETADOS</option>
                                        <option value="WALKOVER">WALKOVER (ADMIN)</option>
                                    </select>
                                )}
                                {activeTab === 'torneos' && (
                                    <button
                                        onClick={() => setIsCreateTournamentOpen(true)}
                                        className="bg-[#ffd900] text-black px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#ffed4d] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1 shadow-lg shadow-[#ffd900]/5"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span> Nuevo Torneo
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sub-Navegación de Ajustes */}
                    {activeTab === 'configuracion' && (
                        <div className="flex flex-wrap border-b border-white/5 bg-black/40">
                            {[
                                { id: 'elo', label: 'Autorización ELO', icon: 'sports_score' },
                                { id: 'equipos', label: 'Autorizar Equipos (Claims)', icon: 'how_to_reg' },
                                { id: 'noticias', label: 'Noticias / Novedades', icon: 'newspaper' },
                                { id: 'otros', label: 'Categorías (Series)', icon: 'category', superOnly: true },
                                { id: 'cierre_elo', label: 'Temporadas y Cierre', icon: 'lock_open', superOnly: true }
                            ].filter(subTab => !subTab.superOnly || currentUser?.global_role === 'SUPER_ADMIN').map(subTab => (
                                <button
                                    key={subTab.id}
                                    onClick={() => setSettingsTab(subTab.id as any)}
                                    className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest relative transition-all flex items-center gap-2 ${
                                        settingsTab === subTab.id ? 'text-[#ffd900]' : 'text-white/40 hover:text-white'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-xs">{subTab.icon}</span>
                                    {subTab.label}
                                    {settingsTab === subTab.id && (
                                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#ffd900]"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Área de Contenido Principal (Listados / Tablas) */}
                    <div className="flex-1 overflow-x-auto">
                        {loading ? (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center gap-3 py-20">
                                <div className="w-10 h-10 border-4 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin"></div>
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] animate-pulse">Sincronizando Base de Datos</span>
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-500 flex flex-col items-center justify-center gap-2 py-20">
                                <span className="material-symbols-outlined text-4xl">error</span>
                                <p className="text-xs font-bold uppercase">{error}</p>
                            </div>
                        ) : (
                            <div className="w-full">
                                {/* TAB 1: CARTAS */}
                                {activeTab === 'cartas' && (
                                    <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="bg-white/2 border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                <th className="px-6 py-4">Carta / Identificación</th>
                                                <th className="px-6 py-4">Tipo / Rareza</th>
                                                <th className="px-6 py-4 text-center">Ataque/Defensa</th>
                                                <th className="px-6 py-4 text-center">Costo</th>
                                                <th className="px-6 py-4 text-center">Edición</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {cards.map(card => (
                                                <tr key={card.id} className="hover:bg-white/2 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-14 bg-black/50 border border-white/10 rounded-sm overflow-hidden flex items-center justify-center relative shrink-0">
                                                                {card.image_url ? (
                                                                    <img src={apiService.resolveImageUrl(card.image_url)} alt={card.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="material-symbols-outlined text-white/10 text-xl">style</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-white uppercase">{card.name}</div>
                                                                <div className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">ID: #{card.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-[10px] font-black uppercase text-[#ffd900] tracking-wider">{card.rarity}</div>
                                                        <div className="text-[9px] text-white/50 uppercase mt-0.5">{card.type} {card.position && `• ${card.position}`}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {card.type === 'Jugador' ? (
                                                            <span className="text-xs font-bold text-white italic">{card.stats_attack}/{card.stats_defense}</span>
                                                        ) : (
                                                            <span className="text-xs text-white/10">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-xs font-black text-white italic">
                                                        {card.has_x_cost ? 'X' : card.cost}
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-[10px] font-bold text-white/40 uppercase">
                                                        {card.edition}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => { setEditingCard(card); setIsAddCardOpen(true); }}
                                                                className="p-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-[#ffd900] hover:border-[#ffd900]/30 transition-colors"
                                                                title="Editar Carta"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCard(card.id)}
                                                                className="p-1.5 bg-red-500/5 border border-red-500/10 text-red-500/60 hover:text-red-500 hover:border-red-500/30 transition-colors"
                                                                title="Eliminar Carta"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {cards.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                        No se encontraron cartas
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {/* TAB 2: EQUIPOS */}
                                {activeTab === 'equipos' && (
                                    <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="bg-white/2 border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                <th className="px-6 py-4">Equipo / Escudo</th>
                                                <th className="px-6 py-4 text-center">Año Fundación</th>
                                                <th className="px-6 py-4">Propietario</th>
                                                <th className="px-6 py-4 text-center">Estado</th>
                                                <th className="px-6 py-4 text-center">ELO</th>
                                                <th className="px-6 py-4 text-center">Puntos JO</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {teams.map(team => (
                                                <tr key={team.id} className="hover:bg-white/2 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-black/40 border border-white/10 rounded-sm overflow-hidden flex items-center justify-center p-1.5 shrink-0">
                                                                {team.logo_url ? (
                                                                    <img src={apiService.resolveImageUrl(team.logo_url)} alt={team.name} className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <span className="material-symbols-outlined text-white/10 text-xl">shield</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-white uppercase">{team.name}</div>
                                                                <div className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{team.short_name} • ID: #{team.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-xs text-white/60 font-bold">
                                                        {team.founded_year || 'S/D'}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-white/60">
                                                        {team.owner_name ? (
                                                            <span className="normal-case">{team.owner_name}</span>
                                                        ) : (
                                                            <span className="text-white/20 italic">Sin dueño asignado</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                                                            team.status === 'Activo'
                                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                                : team.status === 'Histórico'
                                                                ? 'bg-[#ffd900]/10 text-[#ffd900] border border-[#ffd900]/20'
                                                                : 'bg-white/5 text-white/40'
                                                        }`}>
                                                            {formatStatus(team.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-xs font-black text-white italic">
                                                        {team.current_elo}
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-xs font-black text-[#ffd900] italic">
                                                        {team.official_ranking_points || 0}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => { setSelectedTeam(team); setIsEditTeamOpen(true); }}
                                                            className="p-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-[#ffd900] hover:border-[#ffd900]/30 transition-colors"
                                                            title="Editar Equipo"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">edit</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {teams.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                        No se encontraron equipos
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {/* TAB 3: PARTIDOS */}
                                {activeTab === 'partidos' && (
                                    <div className="p-6 space-y-10">
                                        {Object.entries(getGroupedMatches()).map(([tournamentName, tournamentMatches]) => (
                                            <div key={tournamentName} className="space-y-4 bg-black/10 border border-white/5 p-4 rounded-sm">
                                                <div className="flex items-center gap-2 text-[#ffd900]">
                                                    <span className="h-[1px] w-4 bg-[#ffd900]"></span>
                                                    <h3 className="text-xs font-black uppercase tracking-widest">{tournamentName}</h3>
                                                    <span className="text-[9px] text-white/20 font-bold">({tournamentMatches.length} partidos)</span>
                                                </div>
                                                
                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse text-left">
                                                        <thead>
                                                            <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                                <th className="px-4 py-3">Enfrentamiento</th>
                                                                <th className="px-4 py-3 text-center">Fecha / Hora</th>
                                                                <th className="px-4 py-3 text-center">Marcador</th>
                                                                <th className="px-4 py-3 text-center">Evidencia</th>
                                                                <th className="px-4 py-3 text-right">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {tournamentMatches.map(m => {
                                                                const isCompleted = m.status === 'COMPLETED' || m.status === 'PLAYED' || m.status === 'WALKOVER';
                                                                return (
                                                                    <tr key={m.id} className="hover:bg-white/2 transition-colors">
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex flex-col">
                                                                                <div className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                                                                                    <span>{m.home_name || m.home_team_name || 'Desconocido'}</span>
                                                                                    <span className="text-[10px] font-black text-white/20 italic">VS</span>
                                                                                    <span>{m.away_name || m.away_team_name || 'Desconocido'}</span>
                                                                                </div>
                                                                                <span className="text-[8px] text-white/20 uppercase mt-0.5">ID: #{m.id}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center text-xs text-white/60 font-medium">
                                                                            {m.played_at ? (
                                                                                new Date(m.played_at.replace(' ', 'T')).toLocaleString('es-CL', {
                                                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                                                })
                                                                            ) : (
                                                                                <span className="text-white/20 italic">Por definir</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {isCompleted ? (
                                                                                <div className="inline-flex items-center gap-1 bg-black/40 border border-white/5 px-2.5 py-0.5 rounded-sm text-xs font-black text-white italic">
                                                                                    <span>{m.score_home}</span>
                                                                                    <span className="text-white/20 font-normal">:</span>
                                                                                    <span>{m.score_away}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                                                                                    m.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-white/5 text-white/40'
                                                                                }`}>
                                                                                    {formatStatus(m.status)}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {(m as any).proof_url ? (
                                                                                <a
                                                                                    href={apiService.resolveImageUrl((m as any).proof_url)}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="inline-flex items-center gap-1 text-[9px] font-black text-[#ffd900] hover:underline"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-xs">open_in_new</span> VER
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-white/10 text-xs">—</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <div className="flex justify-end gap-2">
                                                                                {(!isCompleted) && (
                                                                                    <button
                                                                                        onClick={() => { setSelectedMatch(m); setIsScheduleMatchOpen(true); }}
                                                                                        className="p-1 bg-white/5 border border-white/10 text-white/60 hover:text-[#ffd900] hover:border-[#ffd900]/30 transition-colors"
                                                                                        title="Programar Fecha/Hora"
                                                                                    >
                                                                                        <span className="material-symbols-outlined text-xs">calendar_month</span>
                                                                                    </button>
                                                                                )}
                                                                                
                                                                                <button
                                                                                    onClick={() => { setSelectedMatch(m); setIsEditMatchOpen(true); }}
                                                                                    className="p-1 bg-white/5 border border-white/10 text-[#ffd900]/70 hover:text-[#ffd900] hover:border-[#ffd900]/40 transition-colors"
                                                                                    title="Registrar / Editar Resultado"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-xs">emoji_events</span>
                                                                                </button>

                                                                                {isCompleted && (
                                                                                    <button
                                                                                        onClick={() => handleRollbackMatch(m.id)}
                                                                                        className="p-1 bg-red-500/5 border border-red-500/10 text-red-500/60 hover:text-red-500 hover:border-red-500/30 transition-colors"
                                                                                        title="Deshacer ELO / Revertir Resultado"
                                                                                    >
                                                                                        <span className="material-symbols-outlined text-xs">history</span>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                        {Object.keys(getGroupedMatches()).length === 0 && (
                                            <div className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                No se encontraron partidos
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 4: TORNEOS */}
                                {activeTab === 'torneos' && (
                                    <div className="flex flex-col">
                                        {/* Subtabs de estado de torneos */}
                                        <div className="flex flex-wrap border-b border-white/5 bg-black/40">
                                            {[
                                                { id: 'ALL', label: 'Todos' },
                                                { id: 'draft', label: 'Borrador' },
                                                { id: 'open', label: 'Abiertos' },
                                                { id: 'registration_closed', label: 'Inscrip. Cerradas' },
                                                { id: 'in_progress', label: 'En Curso' },
                                                { id: 'closed', label: 'Terminados' }
                                            ].map(subTab => (
                                                <button
                                                    key={subTab.id}
                                                    onClick={() => setTournamentStatusFilter(subTab.id)}
                                                    className={`px-6 py-3 text-[9px] font-black uppercase tracking-widest relative transition-all ${
                                                        tournamentStatusFilter === subTab.id ? 'text-[#ffd900]' : 'text-white/40 hover:text-white'
                                                    }`}
                                                >
                                                    {subTab.label}
                                                    {tournamentStatusFilter === subTab.id && (
                                                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#ffd900]"></div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <table className="w-full border-collapse text-left">
                                            <thead>
                                                <tr className="bg-white/2 border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                    <th className="px-6 py-4">Torneo</th>
                                                    <th className="px-6 py-4">Estructura</th>
                                                    <th className="px-6 py-4 text-center">Estado</th>
                                                    <th className="px-6 py-4">Detalles / Ámbito</th>
                                                    <th className="px-6 py-4 text-center">Inscritos</th>
                                                    <th className="px-6 py-4 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {getFilteredTournaments().map(t => (
                                                    <tr key={t.id} className="hover:bg-white/2 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <Link to={`/tournament/${t.id}`} className="text-xs font-bold text-white uppercase hover:text-[#ffd900] transition-colors">
                                                                    {t.name}
                                                                </Link>
                                                                <span className="text-[9px] text-white/20 uppercase mt-0.5">ID: #{t.id} • Temporada: {t.season || 'Sin temporada'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-[10px] font-bold text-white/60 uppercase">{t.structure}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                                                                t.status === 'in_progress' ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' :
                                                                t.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                t.status === 'closed' ? 'bg-white/5 text-white/40' : 'bg-white/10 text-white/60'
                                                            }`}>
                                                                {formatStatus(t.status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[10px] text-white/80 flex items-center gap-1 font-bold">
                                                                {Number(t.is_jo) === 1 ? (
                                                                    <span className="text-[#ffd900] uppercase tracking-wider flex items-center gap-0.5 text-[8px]">
                                                                        <span className="material-symbols-outlined text-[10px]">workspace_premium</span> Oficial JO ({t.tournament_type})
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-white/40 uppercase text-[8px]">Comunidad</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-xs font-bold text-white/60">
                                                            {(t as any).participants_count || 0} / {t.max_teams || 32}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => { setSelectedTournament(t); setIsEditTournamentOpen(true); }}
                                                                    className="p-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-[#ffd900] hover:border-[#ffd900]/30 transition-colors"
                                                                    title="Configuración de Torneo"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">settings</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteTournament(t.id)}
                                                                    className="p-1.5 bg-red-500/5 border border-red-500/10 text-red-500/60 hover:text-red-500 hover:border-red-500/30 transition-colors"
                                                                    title="Eliminar Torneo"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {getFilteredTournaments().length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                            No se encontraron torneos
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* TAB 5: CONFIGURACIONES */}
                                {activeTab === 'configuracion' && (
                                    <div className="p-8">
                                        {/* SUBTAB: AUTORIZACIÓN ELO */}
                                        {settingsTab === 'elo' && (
                                            <div className="space-y-8">
                                                <h3 className="text-xs font-black uppercase text-white tracking-widest">Partidos Pendientes de Calificación ELO</h3>
                                                
                                                {Object.entries(getGroupedPendingEloMatches()).map(([tournamentName, tournamentMatches]) => (
                                                    <div key={tournamentName} className="space-y-4 bg-black/10 border border-white/5 p-4 rounded-sm">
                                                        <div className="flex items-center gap-2 text-[#ffd900]">
                                                            <span className="h-[1px] w-4 bg-[#ffd900]"></span>
                                                            <h4 className="text-[11px] font-black uppercase tracking-widest">{tournamentName}</h4>
                                                        </div>
                                                        
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full border-collapse text-left">
                                                                <thead>
                                                                    <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                                        <th className="px-4 py-3">Partido</th>
                                                                        <th className="px-4 py-3 text-center">Resultado</th>
                                                                        <th className="px-4 py-3 text-right">Acciones de Control</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-white/5">
                                                                    {tournamentMatches.map(m => (
                                                                        <tr key={m.id} className="hover:bg-white/2 transition-colors">
                                                                            <td className="px-4 py-3">
                                                                                <div className="text-xs font-bold text-white uppercase">
                                                                                    {m.home_name || m.home_team_name} <span className="text-white/25 italic text-[10px] font-black px-1">VS</span> {m.away_name || m.away_team_name}
                                                                                </div>
                                                                                <span className="text-[8px] text-white/20 uppercase mt-0.5">ID: #{m.id}</span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center text-xs font-black italic text-white">
                                                                                {m.score_home} : {m.score_away}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                <div className="flex justify-end gap-3">
                                                                                    <button
                                                                                        onClick={() => handleAuthorizeElo(m.id)}
                                                                                        className="px-3 py-1.5 bg-[#ffd900] text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md flex items-center gap-1"
                                                                                    >
                                                                                        <span className="material-symbols-outlined text-xs font-black">check</span> Autorizar
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDiscardElo(m.id)}
                                                                                        className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                                                                                    >
                                                                                        <span className="material-symbols-outlined text-xs">close</span> Descartar
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ))}
                                                {Object.keys(getGroupedPendingEloMatches()).length === 0 && (
                                                    <div className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                        No hay partidos pendientes de autorización ELO
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* SUBTAB: AUTORIZAR EQUIPOS (CLAIMS) */}
                                        {settingsTab === 'equipos' && (
                                            <div className="space-y-6">
                                                <h3 className="text-xs font-black uppercase text-white tracking-widest">Solicitudes de Dueño de Equipo Pendientes</h3>
                                                <table className="w-full border-collapse text-left mt-4">
                                                    <thead>
                                                        <tr className="bg-white/2 border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                            <th className="px-6 py-4">Usuario Solicitante</th>
                                                            <th className="px-6 py-4">Equipo</th>
                                                            <th className="px-6 py-4">Fecha Solicitud</th>
                                                            <th className="px-6 py-4 text-right">Acciones de Control</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {teamClaims.map(claim => (
                                                            <tr key={claim.id} className="hover:bg-white/2 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="text-xs font-bold text-white uppercase">{claim.username}</div>
                                                                    <div className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">Correo: {claim.email}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-xs font-bold text-[#ffd900] uppercase">{claim.team_name}</div>
                                                                    <div className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">Fundado: {claim.founded_year || 'S/D'}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-white/40">
                                                                    {new Date(claim.created_at).toLocaleDateString('es-CL')}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-3">
                                                                        <button
                                                                            onClick={() => handleResolveClaim(claim.id, 'approve')}
                                                                            className="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-1 shadow-md"
                                                                        >
                                                                            <span className="material-symbols-outlined text-xs">check</span> Aprobar
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleResolveClaim(claim.id, 'reject')}
                                                                            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                                                                        >
                                                                            <span className="material-symbols-outlined text-xs">close</span> Rechazar
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {teamClaims.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                                    No hay solicitudes pendientes de asignación de equipo
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* SUBTAB: NOTICIAS */}
                                        {settingsTab === 'noticias' && (
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-xs font-black uppercase text-white tracking-widest">Administración de Noticias</h3>
                                                    <button
                                                        onClick={() => { setSelectedNews(null); setIsAddNewsOpen(true); }}
                                                        className="bg-[#ffd900] text-black px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#ffed4d] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1 shadow-lg shadow-[#ffd900]/5"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">add</span> Redactar Noticia
                                                    </button>
                                                </div>

                                                <table className="w-full border-collapse text-left mt-4">
                                                    <thead>
                                                        <tr className="bg-white/2 border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                            <th className="px-6 py-4">Titular</th>
                                                            <th className="px-6 py-4 text-center">Categoría</th>
                                                            <th className="px-6 py-4 text-center">Estado</th>
                                                            <th className="px-6 py-4 text-center">Fecha de Creación</th>
                                                            <th className="px-6 py-4 text-right">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {news.map(item => (
                                                            <tr key={item.id} className="hover:bg-white/2 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="text-xs font-bold text-white uppercase truncate max-w-[320px]">{item.titular}</div>
                                                                    <div className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">ID: #{item.id}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center text-[10px] font-bold text-[#ffd900] uppercase">
                                                                    {item.categoria}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                                                                        item.status === 'Publicado'
                                                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                                            : 'bg-white/5 text-white/40'
                                                                    }`}>
                                                                        {item.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center text-xs text-white/60 font-bold">
                                                                    {new Date(item.fecha).toLocaleDateString('es-CL')}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => { setSelectedNews(item); setIsAddNewsOpen(true); }}
                                                                            className="p-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-[#ffd900] hover:border-[#ffd900]/30 transition-colors"
                                                                            title="Editar Noticia"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">edit</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteNews(item.id)}
                                                                            className="p-1.5 bg-red-500/5 border border-red-500/10 text-red-500/60 hover:text-red-500 hover:border-red-500/30 transition-colors"
                                                                            title="Eliminar Noticia"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {news.length === 0 && (
                                                            <tr>
                                                                <td colSpan={5} className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                                    No hay noticias registradas
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* SUBTAB: OTROS (CATEGORÍAS DE TORNEO) */}
                                        {settingsTab === 'otros' && (
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="text-xs font-black uppercase text-white tracking-widest">Series de Torneos</h3>
                                                    <button
                                                        onClick={() => { setSelectedCategory(null); setIsCategoryModalOpen(true); }}
                                                        className="bg-[#ffd900] text-black px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#ffed4d] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1 shadow-lg shadow-[#ffd900]/5"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">add</span> Crear Nueva Serie
                                                    </button>
                                                </div>

                                                <table className="w-full border-collapse text-left mt-4">
                                                    <thead>
                                                        <tr className="bg-white/2 border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                            <th className="px-6 py-4">Serie / Categoría</th>
                                                            <th className="px-6 py-4">Descripción</th>
                                                            <th className="px-6 py-4 text-right">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {categories.map(cat => (
                                                            <tr key={cat.id} className="hover:bg-white/2 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 bg-black/40 border border-white/10 rounded-sm overflow-hidden flex items-center justify-center p-1 shrink-0">
                                                                            {cat.logo_url ? (
                                                                                <img src={apiService.resolveImageUrl(cat.logo_url)} alt={cat.name} className="w-full h-full object-contain" />
                                                                            ) : (
                                                                                <span className="material-symbols-outlined text-white/10 text-xl">shield</span>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-xs font-bold text-white uppercase">{cat.name}</div>
                                                                            <div className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">ID: #{cat.id}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs font-medium text-white/60 max-w-sm truncate">
                                                                    {cat.description || 'Sin descripción'}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => { setSelectedCategory(cat); setIsCategoryModalOpen(true); }}
                                                                            className="p-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-[#ffd900] hover:border-[#ffd900]/30 transition-colors"
                                                                            title="Editar Serie"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">edit</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteCategory(cat.id)}
                                                                            className="p-1.5 bg-red-500/5 border border-red-500/10 text-red-500/60 hover:text-red-500 hover:border-red-500/30 transition-colors"
                                                                            title="Eliminar Serie"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {categories.length === 0 && (
                                                            <tr>
                                                                <td colSpan={3} className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                                    No hay series/categorías registradas
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* SUBTAB: CIERRE ELO / TEMPORADAS */}
                                        {settingsTab === 'cierre_elo' && (
                                            <div className="space-y-10">
                                                {/* Sección Crear Temporada */}
                                                <div className="bg-black/20 border border-white/5 p-6 rounded-sm">
                                                    <h3 className="text-xs font-black uppercase text-[#ffd900] tracking-widest mb-4">Nueva Temporada</h3>
                                                    <form onSubmit={handleCreateSeason} className="flex flex-col sm:flex-row gap-4">
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: CLAUSURA 2026"
                                                            value={newSeasonName}
                                                            onChange={(e) => setNewSeasonName(e.target.value)}
                                                            className="flex-1 bg-black/40 border border-white/10 px-4 py-3 text-xs uppercase text-white font-bold tracking-wider outline-none focus:border-[#ffd900]"
                                                            required
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="bg-[#ffd900] text-black px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-[#ffed4d] active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-md shadow-[#ffd900]/5"
                                                        >
                                                            <span className="material-symbols-outlined text-sm font-black">add</span> Crear Temporada
                                                        </button>
                                                    </form>
                                                </div>

                                                {/* Listado de Temporadas */}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs font-black uppercase text-white tracking-widest">Historial de Temporadas</h3>
                                                    <table className="w-full border-collapse text-left">
                                                        <thead>
                                                            <tr className="bg-white/2 border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-widest">
                                                                <th className="px-6 py-4">ID</th>
                                                                <th className="px-6 py-4">Temporada</th>
                                                                <th className="px-6 py-4 text-center">Estado</th>
                                                                <th className="px-6 py-4 text-center">Fecha Inicio</th>
                                                                <th className="px-6 py-4 text-center">Fecha Fin</th>
                                                                <th className="px-6 py-4 text-right">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {seasons.map(s => (
                                                                <tr key={s.id} className="hover:bg-white/2 transition-colors">
                                                                    <td className="px-6 py-4 text-xs font-bold text-white/40">
                                                                        #{s.id}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-xs font-black text-white uppercase tracking-wider">
                                                                        {s.name}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded ${
                                                                            Number(s.is_active) === 1
                                                                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                                                : s.end_date
                                                                                ? 'bg-white/5 text-white/30 border border-white/5'
                                                                                : 'bg-[#ffd900]/10 text-[#ffd900] border border-[#ffd900]/20'
                                                                        }`}>
                                                                            {Number(s.is_active) === 1 ? 'Activa actual' : s.end_date ? 'Cerrada' : 'Inactiva'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center text-xs text-white/60">
                                                                        {s.start_date ? new Date(s.start_date.replace(' ', 'T')).toLocaleDateString('es-CL') : '—'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center text-xs text-white/60">
                                                                        {s.end_date ? new Date(s.end_date.replace(' ', 'T')).toLocaleDateString('es-CL') : '—'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <div className="flex justify-end gap-2">
                                                                            {/* Activar temporada inactiva */}
                                                                            {Number(s.is_active) !== 1 && !s.end_date && (
                                                                                <button
                                                                                    onClick={() => handleActivateSeason(s.id)}
                                                                                    className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all rounded-sm flex items-center gap-1"
                                                                                    title="Establecer como activa"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-xs font-black">check</span> Activar
                                                                                </button>
                                                                            )}

                                                                            {/* Cerrar temporada activa */}
                                                                            {Number(s.is_active) === 1 && (
                                                                                <button
                                                                                    onClick={() => handleCloseSeason(s.id)}
                                                                                    className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all rounded-sm flex items-center gap-1"
                                                                                    title="Cerrar y Snapshot ELO"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-xs">lock</span> Cerrar
                                                                                </button>
                                                                            )}

                                                                            <button
                                                                                onClick={() => { setSelectedSeason(s); setIsEditSeasonOpen(true); }}
                                                                                className="p-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-[#ffd900] hover:border-[#ffd900]/30 transition-colors"
                                                                                title="Editar Fechas/Nombre"
                                                                            >
                                                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {seasons.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={6} className="py-20 text-center text-white/20 uppercase text-[10px] font-black tracking-widest">
                                                                        No hay registros de temporadas
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* MODALS INTEGRADOS */}
            
            {/* Modal Agregar/Editar Carta */}
            <AddCardModal
                isOpen={isAddCardOpen}
                onClose={() => setIsAddCardOpen(false)}
                onCardAdded={fetchData}
                initialData={editingCard}
            />

            {/* Modal Crear Equipo */}
            <CreateTeamModal
                isOpen={isCreateTeamOpen}
                onClose={() => { setIsCreateTeamOpen(false); fetchData(); }}
                userId={currentUser?.id || ''}
                isAdmin={true}
            />

            {/* Modal Editar Equipo Completo */}
            <EditTeamModal
                isOpen={isEditTeamOpen}
                onClose={() => setIsEditTeamOpen(false)}
                team={selectedTeam}
                onTeamUpdated={fetchData}
                currentUser={currentUser}
            />

            {/* Modal Programar Partido */}
            <ScheduleMatchModal
                isOpen={isScheduleMatchOpen}
                onClose={() => setIsScheduleMatchOpen(false)}
                match={selectedMatch}
                onScheduled={fetchData}
            />

            {/* Modal Registrar/Editar Resultado Partido */}
            <EditMatchModal
                isOpen={isEditMatchOpen}
                onClose={() => setIsEditMatchOpen(false)}
                onMatchUpdated={fetchData}
                match={selectedMatch}
            />

            {/* Modal Crear Torneo */}
            <CreateTournamentModal
                isOpen={isCreateTournamentOpen}
                onClose={() => setIsCreateTournamentOpen(false)}
                onTournamentCreated={fetchData}
            />

            {/* Modal Editar Torneo */}
            {selectedTournament && (
                <EditTournamentModal
                    isOpen={isEditTournamentOpen}
                    onClose={() => setIsEditTournamentOpen(false)}
                    tournament={selectedTournament}
                    onTournamentUpdated={fetchData}
                />
            )}

            {/* Modal Crear Categoría de Torneos */}
            <CreateCategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onCategorySaved={fetchData}
                initialData={selectedCategory}
            />

            {/* Modal Redactar/Editar Noticias */}
            <AddNewsModal
                isOpen={isAddNewsOpen}
                onClose={() => setIsAddNewsOpen(false)}
                onSuccess={fetchData}
                initialData={selectedNews}
            />

            {/* Modal Editar Temporada */}
            <EditSeasonModal
                isOpen={isEditSeasonOpen}
                onClose={() => setIsEditSeasonOpen(false)}
                season={selectedSeason}
                onSeasonUpdated={fetchData}
            />

            {/* Modal Confirmación Genérico */}
            <ConfirmActionModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                confirmText={confirmModal.isDangerous ? 'Confirmar Acción' : 'Confirmar'}
            />
        </div>
    );
};

export default AdminDashboard;