import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Team } from '../types';
const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'ranking' | 'titles' | 'elo'>('ranking');
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'ACTIVE' | 'INACTIVE' | 'HISTORICAL'>('Todos');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const data = await apiService.getTeams(false, true); // Get all teams
        setTeams(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar equipos');
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const filteredTeams = teams.filter((team) => {
    if (!team.owner_user_id || team.owner_user_id === '0' || team.owner_user_id === '') return false;
    if (filterStatus === 'Todos') return true;
    return team.status === filterStatus;
  });

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'ranking') {
      return (Number(b.official_ranking_points) || 0) - (Number(a.official_ranking_points) || 0);
    } else if (sortBy === 'titles') {
      return (b.official_titles_count || 0) - (a.official_titles_count || 0);
    } else if (sortBy === 'elo') {
      return (Number(b.current_elo) || 0) - (Number(a.current_elo) || 0);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ffd900]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 md:gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-widest text-white mb-2 drop-shadow-lg">
            EQUIPOS
          </h1>
          <p className="text-white/60 text-sm font-medium uppercase tracking-wider">
            Descubre todos los clubes del meta de Kick On TCG
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-2 bg-[#1a2332] p-1.5 rounded-md border border-white/5 shadow-xl">
            <span className="text-white/40 text-xs font-black uppercase tracking-widest pl-2">Estado:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'Todos' | 'ACTIVE' | 'INACTIVE' | 'HISTORICAL')}
              className="bg-transparent text-white text-xs font-black uppercase tracking-widest px-2 py-2 outline-none cursor-pointer appearance-none hover:text-[#ffd900] transition-colors"
            >
              <option value="Todos" className="bg-[#1a2332] text-white">Todos</option>
              <option value="ACTIVE" className="bg-[#1a2332] text-white">Activo</option>
              <option value="INACTIVE" className="bg-[#1a2332] text-white">Inactivo</option>
              <option value="HISTORICAL" className="bg-[#1a2332] text-white">Histórico</option>
            </select>
          </div>

          {/* Sort Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-[#1a2332] p-1.5 rounded-md border border-white/5 shadow-xl">
            <button
              onClick={() => setSortBy('name')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all rounded ${sortBy === 'name' ? 'bg-[#ffd900] text-[#0a0f1a] shadow-md scale-100' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              Alfabético
            </button>
            <button
              onClick={() => setSortBy('ranking')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all rounded ${sortBy === 'ranking' ? 'bg-[#ffd900] text-[#0a0f1a] shadow-md scale-100' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              Por Ránking
            </button>
            <button
              onClick={() => setSortBy('titles')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all rounded ${sortBy === 'titles' ? 'bg-[#ffd900] text-[#0a0f1a] shadow-md scale-100' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              Por Títulos
            </button>
            <button
              onClick={() => setSortBy('elo')}
              className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all rounded ${sortBy === 'elo' ? 'bg-[#ffd900] text-[#0a0f1a] shadow-md scale-100' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              Por ELO
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {sortedTeams.map((team) => (
          <Link
            to={`/team/${team.slug}`}
            key={team.id}
            className="group relative bg-[#101622] aspect-square rounded-2xl border border-white/10 flex flex-col items-center justify-center p-6 hover:border-[#ffd900]/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#ffd900]/20 overflow-hidden"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 transition-opacity duration-300 group-hover:opacity-90"></div>
            <div className="absolute inset-0 bg-[#ffd900]/0 group-hover:bg-[#ffd900]/5 transition-colors z-0"></div>

            <div className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 mb-4">
              <img
                src={apiService.resolveImageUrl(team.logo_url) || 'https://images.unsplash.com/photo-1590845947698-8ec156372558?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80'}
                alt={`${team.name} Logo`}
                className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:drop-shadow-[0_0_25px_rgba(255,217,0,0.4)] transition-all duration-300 transform group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.errorHandled) {
                    target.dataset.errorHandled = 'true';
                    target.src = 'https://images.unsplash.com/photo-1590845947698-8ec156372558?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80';
                  }
                }}
              />
            </div>

            <h3 className="relative z-20 text-center text-white font-black italic uppercase tracking-wider text-sm sm:text-base group-hover:text-[#ffd900] transition-colors line-clamp-2 w-full mt-auto">
              {team.name}
            </h3>

            <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5 items-end">
              {/* Ranking Badge */}
              {sortBy === 'ranking' && (
                <div className="bg-[#1a2332]/90 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded text-[10px] sm:text-xs font-black italic text-[#ffd900] flex items-center gap-1 shadow-lg transform group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[10px] sm:text-xs">trending_up</span>
                  {Number(team.official_ranking_points || 0).toFixed(1)}
                </div>
              )}
              {/* Titles Badge */}
              {sortBy === 'titles' && Number(team.official_titles_count) > 0 && (
                <div className="bg-[#1a2332]/90 backdrop-blur-sm border border-[#ffd900]/40 px-2.5 py-1 rounded text-[10px] sm:text-xs font-black italic text-[#ffd900] flex items-center gap-1 shadow-[#ffd900]/20 shadow-lg transform group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[10px] sm:text-xs">emoji_events</span>
                  {team.official_titles_count}
                </div>
              )}
              {sortBy === 'elo' && (
                <div className="bg-[#1a2332]/90 backdrop-blur-sm border border-white/10 px-2.5 py-1 rounded text-[10px] sm:text-xs font-black italic text-[#ffd900] flex items-center gap-1 shadow-lg transform group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[10px] sm:text-xs">sports_soccer</span>
                  {team.current_elo || 1000} ELO
                </div>
              )}
            </div>
          </Link>
        ))}
        {sortedTeams.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center gap-4">
            <span className="material-symbols-outlined text-6xl text-white/10">shield</span>
            <p className="text-white/40 font-bold uppercase tracking-widest">No se encontraron equipos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
