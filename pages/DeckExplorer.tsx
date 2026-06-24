import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

const DeckExplorer: React.FC = () => {
  const navigate = useNavigate();

  // States for Community Decks
  const [activeFilter, setActiveFilter] = useState<'TENDENCIAS' | 'NUEVOS' | 'MEJOR VALORADOS'>('TENDENCIAS');
  const [communityDecks, setCommunityDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // States for Top Cards
  const [topCards, setTopCards] = useState<any[]>([]);
  const [activeCardType, setActiveCardType] = useState('VER TODAS');
  const [loadingTopCards, setLoadingTopCards] = useState(false);

  // States for User
  const [userDecks, setUserDecks] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [likedDecks, setLikedDecks] = useState<Set<number | string>>(new Set());

  const ITEMS_PER_PAGE = 6;

  // Initial Load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      apiService.getUserDecks(user.id).then(setUserDecks);
    }
    fetchTopCards();
  }, []);

  // Sync Decks when filter changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    const savedUser = localStorage.getItem('user');
    let userId = currentUser?.id;
    if (!userId && savedUser) {
      try { userId = JSON.parse(savedUser).id; } catch (e) { }
    }
    fetchDecks(0, true, userId);
  }, [activeFilter]);

  // Sync Top Cards when type changes
  useEffect(() => {
    fetchTopCards();
  }, [activeCardType]);

  const fetchDecks = async (p: number, reset: boolean = false, passedUserId?: number | string) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const uid = passedUserId || currentUser?.id;
      const data = await apiService.getPublicDecks(activeFilter, ITEMS_PER_PAGE, p * ITEMS_PER_PAGE, uid);
      if (data.length < ITEMS_PER_PAGE) setHasMore(false);

      const newLikedIds = data.filter((d: any) => d.has_liked).map((d: any) => d.id);
      if (newLikedIds.length > 0) {
        setLikedDecks(prev => new Set([...prev, ...newLikedIds]));
      }

      if (reset) setCommunityDecks(data);
      else setCommunityDecks(prev => [...prev, ...data]);
    } catch (error) {
      console.error("Error fetching decks:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchTopCards = async () => {
    setLoadingTopCards(true);
    try {
      const data = await apiService.getTopCards(activeCardType);
      setTopCards(data);
    } catch (error) {
      console.error("Error fetching top cards:", error);
    } finally {
      setLoadingTopCards(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDecks(nextPage);
  };

  const handleLike = async (e: React.MouseEvent, deckId: number | string) => {
    e.stopPropagation();
    if (!currentUser) {
      alert('Debes iniciar sesión o registrarte para dar like a los mazos.');
      return;
    }

    try {
      const response = await apiService.likeDeck(deckId, currentUser.id);

      if (response.action === 'unliked') {
        setCommunityDecks(prev => prev.map(deck => deck.id === deckId ? { ...deck, likes: Math.max(0, Number(deck.likes || 0) - 1) } : deck));
        setLikedDecks(prev => {
          const newSet = new Set(prev);
          newSet.delete(deckId);
          return newSet;
        });
      } else {
        setCommunityDecks(prev => prev.map(deck => deck.id === deckId ? { ...deck, likes: Number(deck.likes || 0) + 1 } : deck));
        setLikedDecks(prev => new Set(prev).add(deckId));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0f1a] pb-20">
      {/* Header Area */}
      <section className="px-4 md:px-10 max-w-7xl mx-auto w-full pt-16 mb-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
          <div className="max-w-xl">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white mb-4">
              EXPLORADOR DE <span className="text-[#ffd900]">MAZOS</span>
            </h1>
            <p className="text-sm text-white/40 font-medium leading-relaxed uppercase tracking-wider">
              Domina el meta. Analiza formaciones ganadoras y construye tu escuadra legendaria a partir de estrategias probadas por la comunidad.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="flex bg-[#121926]/60 border border-white/5 p-1 rounded-sm w-full sm:w-auto">
              {(['TENDENCIAS', 'NUEVOS', 'MEJOR VALORADOS'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm ${activeFilter === filter ? 'bg-[#ffd900] text-[#101622]' : 'text-white/40 hover:text-white'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            {currentUser && (
              <button
                onClick={() => navigate('/builder')}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-[#ffd900] text-black rounded-sm font-black text-[11px] uppercase tracking-widest hover:bg-[#ffed4d] transition-all shadow-xl shadow-[#ffd900]/10"
              >
                <span className="material-symbols-outlined text-sm font-black">add</span> CREAR NUEVO MAZO
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Main Column: Community Meta & Analytics */}
        <div className="lg:col-span-8 space-y-12">

          {/* Section: Community Meta */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <span className="size-2 bg-[#ffd900] rounded-full"></span> META DE LA COMUNIDAD
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {loading && communityDecks.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center h-64 bg-[#121926]/20 border border-white/5 rounded-sm">
                  <div className="size-12 border-4 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin mb-4"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Sincronizando con el Meta...</p>
                </div>
              ) : communityDecks.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center h-64 bg-[#121926]/20 border border-white/5 rounded-sm">
                  <span className="material-symbols-outlined text-4xl text-white/10 mb-4">style</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">No hay mazos públicos disponibles.</p>
                </div>
              ) : (
                communityDecks.map((deck) => (
                  <div
                    key={deck.id}
                    onClick={() => navigate(`/deck/${deck.id}`)}
                    className="bg-[#121926]/40 border border-white/5 rounded-sm overflow-hidden flex flex-col group hover:border-[#ffd900]/30 transition-all cursor-pointer"
                  >
                    <div className="relative aspect-[16/8] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101622] via-transparent to-transparent z-10"></div>
                      <img
                        src={apiService.resolveImageUrl(deck.image_url)}
                        className="w-full h-full object-cover grayscale opacity-20 group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80")}
                      />

                      <button
                        onClick={(e) => handleLike(e, deck.id)}
                        className={`absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 backdrop-blur-sm rounded-sm border transition-all group/like ${likedDecks.has(deck.id) ? 'border-[#ffd900] bg-[#ffd900] text-black shadow-lg shadow-[#ffd900]/20 scale-105' : 'bg-black/60 border-white/5 hover:bg-[#ffd900]/20 hover:border-[#ffd900]/50 text-white'}`}
                      >
                        <span className={`material-symbols-outlined text-xs ${likedDecks.has(deck.id) ? 'fill-1' : 'text-[#ffd900] group-hover/like:scale-110 transition-transform'}`}>thumb_up</span>
                        <span className={`text-[10px] font-black ${likedDecks.has(deck.id) ? 'text-black' : 'text-white'}`}>{deck.likes || 0}</span>
                      </button>

                      <div className="absolute bottom-4 left-4 z-20">
                        <span className="px-2 py-0.5 bg-[#ffd900]/20 text-[#ffd900] text-[8px] font-black uppercase tracking-widest border border-[#ffd900]/30 rounded-sm mb-2 inline-block">
                          {deck.tag || 'COMUNIDAD'}
                        </span>
                        <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">{deck.name}</h3>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">TASA DE VICTORIA</p>
                          <p className="text-lg font-black text-emerald-500 italic tracking-tighter">{deck.winRate || '0%'}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[8px] font-black uppercase tracking-widest text-white/30">COSTO PROMEDIO</p>
                          <p className="text-lg font-black text-white italic tracking-tighter">{deck.avgCost || '0.0'}</p>
                        </div>
                      </div>

                      {/* Eliminadas las barras de distribución a petición del usuario */}

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-full bg-slate-800 overflow-hidden border border-white/10 flex-shrink-0">
                            <img src={deck.authorAvatar || 'https://www.gravatar.com/avatar/?d=mp'} className="w-full h-full object-cover" alt="Author avatar" />
                          </div>
                          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest truncate">POR {deck.author || 'USUARIO'}</span>
                        </div>
                        <button className="text-[10px] font-black uppercase tracking-widest text-[#ffd900] flex items-center gap-2 hover:underline">
                          VER MAZO <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {hasMore && communityDecks.length > 0 && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-10 py-3 bg-[#121926]/40 border border-white/5 text-white/40 font-black text-[10px] uppercase tracking-widest rounded-sm flex items-center gap-3 hover:bg-[#1a2332] hover:text-white transition-all disabled:opacity-50"
                >
                  {loadingMore ? 'CARGANDO...' : 'CARGAR MÁS MAZOS'}
                  <span className="material-symbols-outlined text-sm">{loadingMore ? 'sync' : 'expand_more'}</span>
                </button>
              </div>
            )}
          </section>

          {/* Section: Top Cards */}
          <section className="bg-[#121926]/40 border border-white/5 rounded-sm p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <span className="size-2 bg-[#ffd900] rounded-full"></span> CARTAS MÁS USADAS
              </h2>

              <div className="flex bg-[#121926]/60 border border-white/5 p-1 rounded-sm overflow-x-auto no-scrollbar">
                {['VER TODAS', 'JUGADOR', 'JUGADA', 'ESTRATEGIA', 'ENERGÍA', 'FOUL', 'HINCHADA'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveCardType(type)}
                    className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all rounded-sm whitespace-nowrap ${activeCardType === type ? 'bg-[#ffd900] text-[#101622]' : 'text-white/40 hover:text-white'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {loadingTopCards ? (
                <div className="col-span-full flex items-center justify-center h-32">
                  <div className="size-8 border-2 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin"></div>
                </div>
              ) : topCards.length === 0 ? (
                <div className="col-span-full py-10 text-center bg-black/20 border border-white/5 rounded-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No hay datos para esta categoría.</p>
                </div>
              ) : (
                topCards.map((stat) => (
                  <div key={stat.id} className="bg-black/20 border border-white/5 p-4 rounded-sm flex items-center gap-4 group hover:bg-[#1a2332]/40 transition-all cursor-pointer">
                    <div className="size-14 rounded-sm bg-slate-800 overflow-hidden border border-white/10 relative">
                      <img src={apiService.resolveImageUrl(stat.imageUrl)} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                      <div className="absolute top-0.5 right-0.5 bg-[#ffd900] text-black text-[8px] font-black px-1 rounded-sm">{stat.rating}</div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-[11px] font-black text-white uppercase italic tracking-tighter truncate">{stat.name}</h4>
                      <p className="text-[9px] font-bold text-[#ffd900] uppercase mb-1">{stat.usageRate}</p>
                      <div className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest ${stat.isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                        <span className="material-symbols-outlined text-[10px]">{stat.isUp ? 'trending_up' : 'trending_down'}</span>
                        {stat.trend}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column: My Decks */}
        <div className="lg:col-span-4 space-y-10">
          {currentUser && (
            <section className="bg-[#121926]/40 border border-white/5 rounded-sm overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
                  <span className="size-2 bg-[#ffd900] rounded-full"></span> MIS MAZOS GUARDADOS
                </h2>
                <button
                  onClick={() => navigate('/profile')}
                  className="text-[9px] font-black text-[#ffd900] uppercase tracking-widest hover:underline"
                >
                  VER TODOS
                </button>
              </div>

              <div className="divide-y divide-white/5">
                {userDecks.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No tienes mazos guardados aún.</p>
                  </div>
                ) : (
                  userDecks.slice(0, 5).map((deck) => (
                    <div
                      key={deck.id}
                      onClick={() => navigate(`/deck/${deck.id}`)}
                      className="p-6 hover:bg-white/5 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-black uppercase italic text-white tracking-tighter group-hover:text-[#ffd900] transition-colors">{deck.name}</h4>
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                            {(() => {
                              const s = deck.status || (deck.is_active === 1 ? 'PUBLIC' : 'DRAFT');
                              return s === 'PUBLIC' ? 'PÚBLICO' : s === 'PRIVATE' ? 'PRIVADO' : 'BORRADOR';
                            })()}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-[1px] text-[7px] font-black uppercase tracking-widest border ${deck.card_count >= 11 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-orange-500/10 text-orange-500 border-orange-500/30'}`}>
                          {deck.format || (deck.card_count >= 11 ? 'Pichanga' : 'INCOMPLETO')}
                        </span>
                      </div>

                      <div className="flex items-center justify-end mt-4">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-lg text-white/20 hover:text-white">edit</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Información de los Formatos de los Mazos */}
          <section className="bg-[#121926]/40 border border-white/5 rounded-sm p-6 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <span className="size-2 bg-[#ffd900] rounded-full"></span> FORMATOS DE MAZOS
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-sm border border-white/5 space-y-2 hover:border-purple-400/20 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-purple-400 tracking-wider">Internacional</span>
                  <span className="text-[9px] font-black text-white/30 px-2 py-0.5 bg-white/5 rounded-sm border border-white/10 uppercase">Full</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Este formato es conocido comúnmente en el mundo del TCG como libre o full. Su característica principal es que no tiene restricciones en el uso de cartas, ni tampoco en la composición de tu 7 inicial, ¡puedes utilizar todas las cartas oficiales del mundo de Kick On!
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-sm border border-white/5 space-y-2 hover:border-[#5ce1e6]/20 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#5ce1e6] tracking-wider">Fanático</span>
                  <span className="text-[9px] font-black text-white/30 px-2 py-0.5 bg-white/5 rounded-sm border border-white/10 uppercase">Competitivo</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Su característica principal es que tus jugadores que disputarán el partido deben compartir un mismo color de camiseta. Recuerda que los arqueros no tienen color de camiseta. Solo puedes utilizar 1 tipo de energía de color, aunque tus jugadores compartan más de un color de camiseta. ¡También puedes utilizar todas las cartas oficiales del mundo de Kick On!
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-start gap-2.5 text-[10px] font-bold text-white/40 leading-normal uppercase italic">
              <span className="material-symbols-outlined text-sm text-[#ffd900]">info</span>
              <span>Construye mazos válidos con exactamente 10-12 jugadores (7 titulares / 3 suplentes) y 45 cartas de apoyo.</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DeckExplorer;
