import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Tournament, User } from '../types';
import { formatStatus } from '../utils/formatters';
import CreateTournamentModal from '../components/CreateTournamentModal';
interface CardProps {
  tournament: Tournament;
  statusText: string;
  statusColorClass: string;
  navigate: any;
}

const RenderJoCard: React.FC<CardProps> = ({ tournament, statusText, statusColorClass, navigate }) => {
  return (
    <div className="bg-gradient-to-br from-[#121926]/90 to-[#1b2537]/80 border-2 border-[#ffd900]/30 hover:border-[#ffd900]/60 rounded-sm overflow-hidden flex flex-col sm:flex-row h-full transition-all duration-300 shadow-[0_0_25px_rgba(255,217,0,0.08)] hover:shadow-[0_0_40px_rgba(255,217,0,0.18)] group relative">
      <div className="absolute top-0 right-0 bg-gradient-to-l from-[#ffd900]/20 to-transparent px-4 py-1.5 text-[8px] font-black text-[#ffd900] tracking-[0.25em] uppercase rounded-bl-sm flex items-center gap-1 border-b border-l border-[#ffd900]/20 z-10">
        <span className="material-symbols-outlined text-[10px]">workspace_premium</span> OFICIAL JO
      </div>
      <div className="relative w-full sm:w-[240px] aspect-video sm:aspect-auto overflow-hidden">
        <img
          src={apiService.resolveImageUrl(tournament.banner_url || tournament.image)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.errorHandled) {
              target.dataset.errorHandled = 'true';
              target.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80';
            }
          }}
        />
        <div className={`absolute top-2 left-2 text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase ${statusColorClass}`}>
          {statusText}
        </div>
      </div>
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter group-hover:text-[#ffd900] transition-colors leading-tight">{tournament.name}</h3>
          <p className="text-[10px] text-[#ffd900]/80 font-bold uppercase tracking-widest mt-1">Temporada Oficial Pancorazo</p>
          <div className="flex flex-col gap-1.5 mt-4">
            <div className="flex items-center gap-2 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm text-[#ffd900]">group</span> {(tournament as any).participants_count || 0} / {tournament.max_teams || 32} EQUIPOS
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm text-[#ffd900]">calendar_today</span> {tournament.start_date || 'Próximamente'}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => navigate(`/tournament/${tournament.id}`)}
            className="flex-1 bg-[#ffd900] text-black font-black text-[10px] py-3 rounded-sm uppercase tracking-widest hover:bg-[#ffed4d] hover:scale-[1.02] transition-all duration-300"
          >
            INGRESAR AL TORNEO
          </button>
        </div>
      </div>
    </div>
  );
};

const RenderCommunityCard: React.FC<CardProps> = ({ tournament, statusText, statusColorClass, navigate }) => {
  return (
    <div className="bg-[#121926]/40 border border-white/5 rounded-sm overflow-hidden flex flex-col sm:flex-row h-full hover:border-white/10 transition-all duration-300">
      <div className="relative w-full sm:w-[180px] aspect-video sm:aspect-auto overflow-hidden">
        <img
          src={apiService.resolveImageUrl(tournament.banner_url || tournament.image)}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.errorHandled) {
              target.dataset.errorHandled = 'true';
              target.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80';
            }
          }}
        />
        <div className={`absolute top-2 left-2 text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase ${statusColorClass}`}>
          {statusText}
        </div>
      </div>
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-black italic uppercase text-white tracking-tighter truncate leading-snug">{tournament.name}</h3>
          {(tournament as any).creator_username && (
            <p className="text-[9px] text-slate-400 font-bold italic mt-0.5">
              por <span className="normal-case">{(tournament as any).creator_username}</span>
            </p>
          )}
          <div className="flex flex-col gap-1 mt-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-xs">group</span> {(tournament as any).participants_count || 0} EQUIPOS
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
              <span className="material-symbols-outlined text-xs">schedule</span> {tournament.end_date || 'En curso'}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => navigate(`/tournament/${tournament.id}`)}
            className="flex-1 bg-[#1a2332] text-white border border-white/5 font-black text-[9px] py-2 rounded-sm uppercase tracking-widest hover:bg-white/5"
          >
            REVISAR
          </button>
        </div>
      </div>
    </div>
  );
};

interface CardVerticalProps {
  tournament: Tournament;
  statusText: string;
  navigate: any;
}

const RenderJoCardVertical: React.FC<CardVerticalProps> = ({ tournament, statusText, navigate }) => {
  return (
    <div className="bg-gradient-to-b from-[#121926]/90 to-[#1b2537]/80 border-2 border-[#ffd900]/30 hover:border-[#ffd900]/60 rounded-sm overflow-hidden flex flex-col transition-all duration-300 shadow-[0_0_25px_rgba(255,217,0,0.08)] hover:shadow-[0_0_40px_rgba(255,217,0,0.18)] group relative h-full justify-between">
      <div className="absolute top-0 right-0 bg-gradient-to-l from-[#ffd900]/20 to-transparent px-4 py-1.5 text-[8px] font-black text-[#ffd900] tracking-[0.25em] uppercase rounded-bl-sm flex items-center gap-1 border-b border-l border-[#ffd900]/20 z-20">
        <span className="material-symbols-outlined text-[10px]">workspace_premium</span> OFICIAL JO
      </div>
      <div className="aspect-video relative overflow-hidden">
        <img
          src={apiService.resolveImageUrl(tournament.banner_url || tournament.image)}
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.errorHandled) {
              target.dataset.errorHandled = 'true';
              target.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80';
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101622] via-transparent to-transparent"></div>
        {statusText && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-sm uppercase">
            {statusText}
          </div>
        )}
      </div>
      <div className="p-6 -mt-8 relative z-10 space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter group-hover:text-[#ffd900] transition-colors leading-tight mb-1">{tournament.name}</h3>
            <p className="text-[#ffd900] font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">emoji_events</span> Temporada Oficial Pancorazo
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-300">
              <div className="flex flex-col gap-1">
                <span>INICIA</span>
                <span className="text-white">{tournament.start_date || 'Próximamente'}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span>EQUIPOS</span>
                <span className="text-white">{(tournament as any).participants_count || 0} / {tournament.max_teams || 32}</span>
              </div>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#ffd900]"
                style={{ width: `${Math.min(((tournament as any).participants_count || 0) / (tournament.max_teams || 32) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/tournament/${tournament.id}`)}
          className="w-full bg-[#ffd900] text-black font-black text-[10px] py-3.5 rounded-sm uppercase tracking-widest hover:bg-[#ffed4d] hover:scale-[1.02] transition-all duration-300 mt-6 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">person_add</span> UNIRSE AL TORNEO
        </button>
      </div>
    </div>
  );
};

const RenderCommunityCardVertical: React.FC<CardVerticalProps> = ({ tournament, statusText, navigate }) => {
  return (
    <div className="bg-[#121926]/40 border border-white/5 rounded-sm overflow-hidden flex flex-col hover:border-white/10 transition-all duration-300 h-full justify-between">
      <div className="aspect-video relative group overflow-hidden">
        <img
          src={apiService.resolveImageUrl(tournament.banner_url || tournament.image)}
          className="w-full h-full object-cover opacity-60 group-hover:scale-102 transition-transform duration-500"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.dataset.errorHandled) {
              target.dataset.errorHandled = 'true';
              target.src = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80';
            }
          }}
        />
        {statusText && (
          <div className="absolute top-2 right-2 bg-white/10 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase border border-white/10">
            {statusText}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101622] via-transparent to-transparent"></div>
      </div>
      <div className="p-5 -mt-10 relative z-10 space-y-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-black italic uppercase text-white tracking-tighter truncate leading-snug mb-0.5">{tournament.name}</h3>
          <p className="text-slate-400 font-bold text-[9px] tracking-normal italic">
            de {tournament.organizer_id || 'Organizador'}
            {(tournament as any).creator_username && (
              <span className="text-slate-500 font-normal">
                {' '}| por <span className="normal-case">{(tournament as any).creator_username}</span>
              </span>
            )}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400">
            <div className="flex flex-col gap-0.5">
              <span>INICIA</span>
              <span className="text-white">{tournament.start_date || '--/--/--'}</span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span>EQUIPOS</span>
              <span className="text-white">{(tournament as any).participants_count || 0}</span>
            </div>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/20"
              style={{ width: `${Math.min(((tournament as any).participants_count || 0) / 32 * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/tournament/${tournament.id}`)}
          className="w-full bg-[#1a2332] text-white border border-white/5 font-black text-[9px] py-2.5 rounded-sm uppercase tracking-widest hover:bg-white/5 mt-4"
        >
          REVISAR
        </button>
      </div>
    </div>
  );
};

const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [pastTab, setPastTab] = useState<'oficiales' | 'pichangas'>('oficiales');

  const savedUser = localStorage.getItem('user');
  const currentUser: User | null = savedUser ? JSON.parse(savedUser) : null;
  const canCreate = !!currentUser;

  useEffect(() => {
    fetchTournaments();
    fetchCategories();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTournaments();
      setTournaments(data);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError('Error al cargar los torneos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await apiService.getTournamentCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const isAdminOrEditor = currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'EDITOR';

  const visibleTournaments = tournaments.filter(t => t.structure?.toLowerCase() !== 'legacy' && Number(t.legacy) !== 1);

  // 1. Torneos en Curso / Inscripciones Cerradas (in_progress / registration_closed)
  const inProgressTournaments = visibleTournaments.filter(t => t.status?.toLowerCase() === 'in_progress' || t.status?.toLowerCase() === 'registration_closed');
  const inProgressJO = inProgressTournaments.filter(t => Number(t.is_jo) === 1);
  const inProgressCommunity = inProgressTournaments.filter(t => Number(t.is_jo) !== 1);

  // 3. Inscripciones Abiertas (open / draft)
  const openTournaments = visibleTournaments.filter(t => t.status?.toLowerCase() === 'open' || (isAdminOrEditor && t.status?.toLowerCase() === 'draft'));
  const openJO = openTournaments.filter(t => Number(t.is_jo) === 1);
  const openCommunity = openTournaments.filter(t => Number(t.is_jo) !== 1);

  const pastTournaments = visibleTournaments
    .filter(t => t.status?.toLowerCase() === 'closed' || t.status?.toLowerCase() === 'finished')
    .sort((a, b) => parseInt(b.id) - parseInt(a.id));

  const filteredPastTournaments = pastTournaments.filter(t => {
    if (pastTab === 'oficiales') {
      return Number(t.is_jo) === 1;
    } else {
      return Number(t.is_jo) !== 1;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[#ffd900] font-black tracking-widest animate-pulse">CARGANDO TORNEOS...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-500 font-black tracking-widest">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-10 py-10 space-y-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic mb-4">TORNEOS Y LIGAS</h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Compite en torneos oficiales y de la comunidad, suma ELO y gana puntos para llegar a lo mas alto en la tabla.
          </p>
        </div>
        <div className="flex gap-3">
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#ffd900] text-black rounded-sm font-black text-[11px] uppercase tracking-widest hover:bg-[#ffed4d] transition-all shadow-xl shadow-[#ffd900]/10"
            >
              <span className="material-symbols-outlined text-sm">add</span> CREAR TORNEO
            </button>
          )}
        </div>
      </div>

      {/* Torneos en Curso */}
      {inProgressTournaments.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#ffd900] flex items-center gap-2">
            <span className="size-2 bg-red-600 rounded-full animate-pulse"></span> TORNEOS EN CURSO
          </h2>
          
          {/* Oficiales JO */}
          {inProgressJO.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                🏆 Ligas y Torneos Oficiales
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {inProgressJO.map(t => {
                  const isClosed = t.status?.toLowerCase() === 'registration_closed';
                  return (
                    <RenderJoCard 
                      key={t.id} 
                      tournament={t} 
                      statusText={isClosed ? 'POR COMENZAR' : 'EN CURSO'} 
                      statusColorClass={isClosed ? 'bg-blue-600' : 'bg-red-600'} 
                      navigate={navigate} 
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Comunidad */}
          {inProgressCommunity.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                👥 Torneos de la Comunidad
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressCommunity.map(t => {
                  const isClosed = t.status?.toLowerCase() === 'registration_closed';
                  return (
                    <RenderCommunityCard 
                      key={t.id} 
                      tournament={t} 
                      statusText={isClosed ? 'POR COMENZAR' : 'EN CURSO'} 
                      statusColorClass={isClosed ? 'bg-blue-600/60' : 'bg-red-600/60'} 
                      navigate={navigate} 
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Inscripciones Abiertas */}
      {(openJO.length > 0 || openCommunity.length > 0) && (
        <section className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-[#ffd900]"></span> INSCRIPCIONES ABIERTAS
          </h2>

          {/* Oficiales JO */}
          {openJO.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                🏆 Ligas y Torneos Oficiales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {openJO.map(t => (
                  <RenderJoCardVertical key={t.id} tournament={t} statusText={t.status?.toLowerCase() === 'draft' ? 'BORRADOR' : ''} navigate={navigate} />
                ))}
              </div>
            </div>
          )}

          {/* Comunidad */}
          {openCommunity.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                👥 Torneos de la Comunidad
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {openCommunity.map(t => (
                  <RenderCommunityCardVertical key={t.id} tournament={t} statusText={t.status?.toLowerCase() === 'draft' ? 'BORRADOR' : ''} navigate={navigate} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}


      {/* Past Tournaments */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <span className="w-1 h-4 bg-[#ffd900]"></span> TORNEOS PASADOS
            </h2>
            
            {/* Pestañas de Filtro */}
            <div className="flex bg-[#101622] border border-white/5 p-1 rounded-sm">
              <button
                onClick={() => setPastTab('oficiales')}
                className={`px-4 py-1.5 text-[9px] font-black tracking-widest uppercase transition-all rounded-sm ${
                  pastTab === 'oficiales'
                    ? 'bg-[#ffd900] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                OFICIALES
              </button>
              <button
                onClick={() => setPastTab('pichangas')}
                className={`px-4 py-1.5 text-[9px] font-black tracking-widest uppercase transition-all rounded-sm ${
                  pastTab === 'pichangas'
                    ? 'bg-[#ffd900] text-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                PICHANGAS
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="size-8 rounded border border-white/10 flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
            <button className="size-8 rounded border border-white/10 flex items-center justify-center hover:bg-white/5"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPastTournaments.map(tournament => (
            <div
              key={tournament.id}
              onClick={() => navigate(`/tournament/${tournament.id}`)}
              className="group bg-[#121926]/60 border border-white/5 rounded-sm p-6 hover:border-[#ffd900]/30 transition-all cursor-pointer flex flex-col gap-4 relative overflow-hidden"
            >
              {/* Badge de Estructura, Tipo y Fecha */}
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[#ffd900] text-[8px] font-black uppercase tracking-widest rounded-sm">
                    {tournament.structure?.toLowerCase() === 'legacy' ? 'HISTÓRICO' : tournament.structure?.toUpperCase()}
                  </span>
                  {tournament.tournament_type && (
                    <span className="px-2 py-0.5 bg-[#ffd900]/10 border border-[#ffd900]/20 text-white text-[8px] font-black uppercase tracking-widest rounded-sm">
                      {tournament.tournament_type}
                    </span>
                  )}
                </div>
                {(tournament.end_date || tournament.start_date) && (
                  <span className="flex items-center gap-1 text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[11px] text-[#ffd900]">calendar_today</span>
                    {tournament.end_date || tournament.start_date}
                  </span>
                )}
              </div>

              {/* Información Principal */}
              <div className="space-y-1">
                <h3 className="text-lg font-black italic uppercase text-white tracking-tighter group-hover:text-[#ffd900] transition-colors leading-tight line-clamp-2">
                  {tournament.name}
                </h3>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                  {tournament.organizer_id || 'Organizador Oficial'}
                  {Number(tournament.is_jo) === 0 && (tournament as any).creator_username && (
                    <span className="text-slate-400 font-bold text-[9px] tracking-normal italic ml-1 block mt-0.5">
                      por <span className="normal-case">{(tournament as any).creator_username}</span>
                    </span>
                  )}
                </p>
              </div>

              {/* Separador */}
              <div className="h-px bg-white/5 w-full"></div>

              {/* Sección Campeón */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-[#ffd900] uppercase tracking-[0.3em]">CAMPEÓN</p>
                <div className="flex items-center gap-3">
                  {((tournament as any).winner_name) ? (
                    <>
                      <div className="size-10 rounded-full bg-black/40 border border-white/5 p-1 flex items-center justify-center overflow-hidden">
                        <img
                          src={apiService.resolveImageUrl((tournament as any).winner_logo)}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.errorHandled) {
                              target.dataset.errorHandled = 'true';
                              target.src = "https://images.unsplash.com/photo-1590845947698-8ec156372558?auto=format&fit=crop&w=300&q=80";
                            }
                          }}
                        />
                      </div>
                      <span className="text-sm font-black text-white uppercase tracking-tighter italic leading-tight flex-1">
                        {(tournament as any).winner_name}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-white/20 uppercase italic">Sin podio registrado</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredPastTournaments.length === 0 && (
            <div className="col-span-full py-20 text-center bg-[#121926]/20 border border-dashed border-white/5 rounded-sm">
              <span className="material-symbols-outlined text-4xl text-white/5 mb-4">history</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No hay torneos finalizados registrados</p>
            </div>
          )}
        </div>
      </section>

      {/* Modal de Creación */}
      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTournamentCreated={fetchTournaments}
      />
    </div>
  );
};

export default Tournaments;

