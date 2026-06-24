import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';

interface SearchResult {
  teams: any[];
  decks: any[];
  tournaments: any[];
  cards: any[];
  users: any[];
}

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults(null);
        return;
      }
      
      setIsLoading(true);
      setError('');
      try {
        const data = await apiService.globalSearch(query);
        setResults(data);
      } catch (err: any) {
        setError(err.message || 'Error al buscar');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const hasResults = results && (
    results.teams.length > 0 || 
    results.decks.length > 0 || 
    results.tournaments.length > 0 || 
    results.cards.length > 0 ||
    results.users.length > 0
  );

  return (
    <div className="min-h-screen bg-[#0a0f1a] py-12 px-4 md:px-10 font-display">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 italic">
            RESULTADOS DE BÚSQUEDA
          </h1>
          <p className="text-white/60">
            {query ? (
              <span>Mostrando resultados para: <strong className="text-[#ffd900]">&quot;{query}&quot;</strong></span>
            ) : (
              <span>Ingresa un término para buscar.</span>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-6 rounded-sm text-center">
            {error}
          </div>
        ) : !query.trim() ? (
          <div className="text-center py-20 text-white/40 italic">
            Usa la barra de búsqueda en la navegación para encontrar equipos, mazos, torneos o cartas.
          </div>
        ) : !hasResults ? (
          <div className="text-center py-20 text-white/40 italic">
            No se encontraron resultados para &quot;{query}&quot;.
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* EQUIPOS */}
            {results.teams.length > 0 && (
              <section>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffd900]">shield</span>
                  Equipos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.teams.map((team) => (
                    <Link key={team.id} to={`/team/${team.slug}`} className="bg-[#101622] border border-white/5 hover:border-[#ffd900]/50 rounded-sm p-4 flex items-center gap-4 transition-all hover:bg-[#1a2332] group">
                      <div className="size-12 rounded-full overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center p-1">
                        {team.logo_url ? (
                          <img src={apiService.resolveImageUrl(team.logo_url)} alt={team.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="material-symbols-outlined text-white/20">shield</span>
                        )}
                      </div>
                      <span className="font-bold text-sm text-white group-hover:text-[#ffd900] transition-colors line-clamp-2">
                        {team.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* USUARIOS */}
            {results.users && results.users.length > 0 && (
              <section>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffd900]">person</span>
                  Usuarios
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.users.map((user) => (
                    <Link key={user.id} to={`/profile/${user.id}`} className="bg-[#101622] border border-white/5 hover:border-[#ffd900]/50 rounded-sm p-4 flex items-center gap-4 transition-all hover:bg-[#1a2332] group">
                      <div className="size-12 rounded-full overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center p-0.5">
                        <img src={apiService.resolveImageUrl(user.profile_image || 'https://www.gravatar.com/avatar/?d=mp')} alt={user.username} className="w-full h-full object-cover rounded-full" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white group-hover:text-[#ffd900] transition-colors line-clamp-1 mb-1">
                          {user.username}
                        </h3>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm inline-block ${
                          user.global_role === 'SUPER_ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          user.global_role === 'ADMIN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          user.global_role === 'EDITOR' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-white/10 text-white/60 border border-white/20'
                        }`}>
                          {user.global_role}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* CARTAS */}
            {results.cards.length > 0 && (
              <section>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffd900]">style</span>
                  Cartas
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {results.cards.map((card) => (
                    <div key={card.id} className="bg-[#101622] rounded-sm overflow-hidden border border-white/5 hover:border-[#ffd900]/50 transition-all group flex flex-col">
                      <div className="aspect-[2.5/3.5] bg-black/40 relative overflow-hidden">
                        {card.image_url ? (
                          <img 
                            src={apiService.resolveImageUrl(card.image_url)} 
                            alt={card.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                            <span className="material-symbols-outlined text-4xl mb-2">style</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">{card.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-[10px] font-black text-white bg-[#ffd900]/20 px-2 py-1 rounded-sm border border-[#ffd900]/30 backdrop-blur-sm">
                            {card.type}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <span className="font-bold text-xs text-white group-hover:text-[#ffd900] transition-colors truncate">
                          {card.name}
                        </span>
                        <span className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                          {card.edition || 'Edición Estándar'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* MAZOS */}
            {results.decks.length > 0 && (
              <section>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffd900]">layers</span>
                  Mazos (Públicos)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {results.decks.map((deck) => (
                    <Link key={deck.id} to={`/deck/${deck.id}`} className="bg-[#101622] border border-white/5 hover:border-[#ffd900]/50 rounded-sm p-4 transition-all hover:bg-[#1a2332] group relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-8xl">layers</span>
                      </div>
                      <h3 className="font-bold text-white group-hover:text-[#ffd900] transition-colors mb-2 pr-6">
                        {deck.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[#ffd900] text-xs font-black">
                        <span className="material-symbols-outlined text-[14px]">favorite</span>
                        <span>{deck.likes || 0} LIKES</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* TORNEOS */}
            {results.tournaments.length > 0 && (
              <section>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffd900]">emoji_events</span>
                  Torneos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {results.tournaments.map((tournament) => (
                    <Link key={tournament.id} to={`/tournament/${tournament.id}`} className="bg-[#101622] border border-white/5 hover:border-[#ffd900]/50 rounded-sm p-4 flex items-center gap-4 transition-all hover:bg-[#1a2332] group">
                      <div className="size-16 rounded-sm overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center p-1">
                        {tournament.logo_url ? (
                          <img src={apiService.resolveImageUrl(tournament.logo_url)} alt={tournament.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="material-symbols-outlined text-white/20 text-3xl">emoji_events</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white group-hover:text-[#ffd900] transition-colors line-clamp-2 mb-1">
                          {tournament.name}
                        </h3>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm inline-block ${
                          tournament.status === 'EN_CURSO' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          tournament.status === 'FINALIZADO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-white/10 text-white/60 border border-white/20'
                        }`}>
                          {tournament.status.replace('_', ' ')}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
