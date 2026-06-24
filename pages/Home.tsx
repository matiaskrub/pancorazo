import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Team, Noticia, User, Card } from '../types';
import { parseLocalDate } from '../utils/formatters';
import CreateDeckModal from '../components/CreateDeckModal';


const Home: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [publicDecks, setPublicDecks] = useState<any[]>([]);

  const [heroCards, setHeroCards] = useState<Card[]>([]);
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [eligibleTournaments, setEligibleTournaments] = useState<any[]>([]);
  const [currentTournamentIdx, setCurrentTournamentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<{ d: string, h: string, m: string, s: string } | null>(null);
  const [currentHeroCardIdx, setCurrentHeroCardIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Create Deck Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [likedDecks, setLikedDecks] = useState<Set<number | string>>(new Set());

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    let userId;
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setCurrentUser(u);
      userId = u.id;
    }

    const fetchData = async () => {
      try {
        const [teamsData, noticiasData, decksData, heroCardsData, tournamentsData] = await Promise.all([
          apiService.getTeams(false, true),
          apiService.getNoticias(4, 0, true),
          apiService.getPublicDecks('TENDENCIAS', 3, 0, userId),
          apiService.getCards({ is_hero: 1, order: 'random', limit: 15 }),
          apiService.getTournaments()
        ]);
        setTeams(teamsData);
        setNoticias(noticiasData);
        setPublicDecks(decksData);

        const newLikedIds = decksData.filter((d: any) => d.has_liked).map((d: any) => d.id);
        if (newLikedIds.length > 0) {
          setLikedDecks(prev => new Set([...prev, ...newLikedIds]));
        }

        setHeroCards(heroCardsData);
        setAllTournaments(tournamentsData);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allTournaments.length === 0) return;

    const activeLevels = { 'open': 1, 'registration_closed': 2, 'in_progress': 3 };
    const eligible = allTournaments
      .filter((t: any) => t.status === 'open' || t.status === 'registration_closed' || t.status === 'in_progress')
      .filter((t: any) => t.is_jo == 1 || String(t.is_jo) === '1')
      .sort((a: any, b: any) => {
         const prioA = activeLevels[a.status as keyof typeof activeLevels];
         const prioB = activeLevels[b.status as keyof typeof activeLevels];
         if (prioA !== prioB) return prioA - prioB;
         const dateA = parseLocalDate(a.estimated_start) || new Date(0);
         const dateB = parseLocalDate(b.estimated_start) || new Date(0);
         return dateA.getTime() - dateB.getTime();
      });
    
    setEligibleTournaments(eligible);
    setCurrentTournamentIdx(0);
  }, [allTournaments]);

  // Auto-slide para torneos
  useEffect(() => {
    if (eligibleTournaments.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTournamentIdx(prev => (prev + 1) % eligibleTournaments.length);
    }, 10000); // 10 segundos
    return () => clearInterval(interval);
  }, [eligibleTournaments]);

  // Timer para el torneo activo (el que está visible en el slider)
  useEffect(() => {
    const activeTournament = eligibleTournaments[currentTournamentIdx];
    if (!activeTournament || activeTournament.status === 'in_progress' || !activeTournament.estimated_start) {
      setTimeLeft(null);
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = (parseLocalDate(activeTournament.estimated_start) || new Date(0)).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
        clearInterval(timer);
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({
          d: d.toString().padStart(2, '0'),
          h: h.toString().padStart(2, '0'),
          m: m.toString().padStart(2, '0'),
          s: s.toString().padStart(2, '0')
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [eligibleTournaments, currentTournamentIdx]);

  useEffect(() => {
    if (heroCards.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroCardIdx(prev => (prev + 1) % heroCards.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [heroCards]);

  const getTopThree = () => {
    return [...teams]
      .filter(t => (Number(t.official_ranking_points) || 0) > 0)
      .sort((a, b) => {
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
      })
      .slice(0, 3);
  };

  const topThree = getTopThree();

  const getLegacyMultiplier = (count: number) => {
    if (count >= 7) return 2.0;
    if (count === 6) return 1.8;
    if (count === 5) return 1.6;
    if (count === 4) return 1.4;
    if (count === 3) return 1.2;
    return 1.0;
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
        setPublicDecks(prev => prev.map(deck => deck.id === deckId ? { ...deck, likes: Math.max(0, Number(deck.likes || 0) - 1) } : deck));
        setLikedDecks(prev => {
          const newSet = new Set(prev);
          newSet.delete(deckId);
          return newSet;
        });
      } else {
        setPublicDecks(prev => prev.map(deck => deck.id === deckId ? { ...deck, likes: Number(deck.likes || 0) + 1 } : deck));
        setLikedDecks(prev => new Set(prev).add(deckId));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="flex flex-col pb-20 bg-[#0a0f1a]">
      {/* 1. HERO SECTION */}
      <section className="relative w-full min-h-[85vh] flex items-center overflow-hidden px-4 md:px-10">
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${apiService.resolveImageUrl('banners/PancorazoBanner.png')})` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#101622]/20 via-[#101622]/80 to-[#0a0f1a]"></div>
        </div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 pt-10">
          <div className="flex flex-col gap-6 text-center lg:text-left">
            <div className="inline-flex items-center self-center lg:self-start gap-2 px-3 py-1 rounded-full bg-[#ffd900]/10 border border-[#ffd900]/20 text-[#ffd900] text-[10px] font-black uppercase tracking-[0.2em]">
              <span className="material-symbols-outlined text-xs">workspace_premium</span> Trading Card Game
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black uppercase italic leading-[0.9] tracking-tighter text-white">
              ÚNETE A <br /><span className="text-[#ffd900]">KICK ON TCG</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-white/60 max-w-md mx-auto lg:mx-0 font-medium leading-relaxed">
              El juego de cartas coleccionables de fútbol, que te convertirá en un DT. Crea tu equipo y compite por la gloria eterna.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-6">
              <Link to="/tournaments" className="w-full sm:w-auto px-10 py-3.5 bg-[#ffd900] hover:bg-[#ffed4d] transition-colors rounded-sm font-black text-xs sm:text-sm uppercase tracking-widest text-[#101622] text-center">
                Jugar Ahora
              </Link>
              <Link to="/library" className="w-full sm:w-auto px-10 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm font-black text-xs sm:text-sm uppercase tracking-widest text-white transition-all text-center">
                Ver Colección
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center items-center scale-90 sm:scale-100">
            {/* Main Hero Card (Dynamic) */}
            {heroCards.length > 0 ? (
              <div 
                key={heroCards[currentHeroCardIdx].id}
                className="relative w-[280px] sm:w-[340px] aspect-[2/3] bg-[#101622] border border-[#ffd900]/40 rounded-sm p-1 shadow-[0_0_50px_rgba(255,217,0,0.15)] group rotate-3 hover:rotate-0 transition-all duration-500 animate-in fade-in zoom-in-95 duration-700"
              >
                <div 
                  className="h-full w-full bg-cover bg-top grayscale group-hover:grayscale-0 transition-all duration-1000 overflow-hidden" 
                  style={{ backgroundImage: `url(${apiService.resolveImageUrl(heroCards[currentHeroCardIdx].image_url)})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#101622] via-transparent to-transparent"></div>
                </div>
              </div>
            ) : (
              <div className="relative w-[280px] sm:w-[340px] aspect-[2/3] bg-[#101622] border border-[#ffd900]/20 rounded-sm p-1 animate-pulse">
                <div className="h-full w-full bg-white/5 rounded-sm"></div>
              </div>
            )}
            {/* Background Glow */}
            <div className="absolute -z-10 w-[300px] sm:w-[400px] aspect-square bg-[#ffd900]/10 rounded-full blur-[80px] sm:blur-[120px]"></div>
          </div>
        </div>
      </section>

      {/* 2. LIVE TOURNAMENTS SLIDER */}
      {eligibleTournaments.length > 0 && (
        <section className="px-4 md:px-10 max-w-7xl mx-auto w-full mb-32 relative group/slider">
          <div className="relative w-full rounded-sm overflow-hidden p-8 md:p-14 border border-white/5 bg-[#121926]/40 backdrop-blur-sm min-h-[400px] flex items-center">
            {/* Animación de entrada/salida para el slide (efecto fade suave) */}
            <div 
              key={eligibleTournaments[currentTournamentIdx].id}
              className="w-full animate-in fade-in duration-700"
            >
              <div className="absolute inset-0 -z-10 opacity-20 transition-all duration-1000">
                <img 
                  src={apiService.resolveImageUrl(eligibleTournaments[currentTournamentIdx].banner_url || eligibleTournaments[currentTournamentIdx].image) || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80"} 
                  className="w-full h-full object-cover" 
                  alt="Tournament Banner"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#121926] via-[#121926]/80 to-transparent"></div>
              </div>
              
              <div className="max-w-2xl relative z-10">
                <div className="inline-block px-2 py-0.5 bg-red-600 rounded-sm text-[9px] font-black uppercase mb-6 tracking-wider text-white shadow-lg">
                  {eligibleTournaments[currentTournamentIdx].status === 'in_progress' ? 'En Vivo' : eligibleTournaments[currentTournamentIdx].structure || 'Torneo'}
                </div>
                <h2 className="text-5xl md:text-6xl font-black uppercase italic mb-6 tracking-tighter text-white leading-tight drop-shadow-2xl">
                  {eligibleTournaments[currentTournamentIdx].name}
                </h2>
                <p className="text-base text-white/50 mb-10 leading-relaxed font-medium uppercase tracking-widest">
                  Organizado por <span className="text-[#ffd900] font-bold">{eligibleTournaments[currentTournamentIdx].organizer_id || 'Pancorazo Oficial'}</span>
                </p>
                <div className="flex flex-wrap gap-10 items-center">
                  <Link 
                    to={`/tournament/${eligibleTournaments[currentTournamentIdx].id}`}
                    className="px-10 py-3 bg-[#ffd900] text-black rounded-sm font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-[#ffd900]/10"
                  >
                    {eligibleTournaments[currentTournamentIdx].status === 'open' ? 'Inscríbete Ahora' : 'Ver Torneo'}
                  </Link>
                  {timeLeft && (
                    <div className="flex flex-col text-white">
                      <span className="text-[10px] uppercase text-white/30 font-bold tracking-widest">
                        {timeLeft.d === '00' && timeLeft.h === '00' && timeLeft.m === '00' && timeLeft.s === '00' 
                          ? 'Por Comenzar' 
                          : 'Comienza en'}
                      </span>
                      {!(timeLeft.d === '00' && timeLeft.h === '00' && timeLeft.m === '00' && timeLeft.s === '00') && (
                        <span className="text-2xl font-black italic tabular-nums tracking-tighter">
                          {timeLeft.d}d : {timeLeft.h}h : {timeLeft.m}m : {timeLeft.s}s
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navegación por Puntos (Dots) */}
            {eligibleTournaments.length > 1 && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
                {eligibleTournaments.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTournamentIdx(idx)}
                    className={`size-1.5 rounded-full transition-all duration-300 ${
                      currentTournamentIdx === idx 
                        ? 'w-8 bg-[#ffd900] shadow-[0_0_10px_rgba(255,217,0,0.5)]' 
                        : 'bg-white/20 hover:bg-white/40'
                    }`}
                    aria-label={`Ir al torneo ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. RANKING SECTION (Podium) */}
      <section className="px-4 md:px-10 max-w-7xl mx-auto w-full mb-32">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">RANKING</h2>
          <div className="w-12 h-1 bg-[#ffd900] mx-auto mt-2"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 items-end max-w-5xl mx-auto min-h-[400px]">
          {loading ? (
            <div className="col-span-full flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ffd900]"></div>
            </div>
          ) : (
            <>
              {/* Rank 2 */}
              <div className="order-2 md:order-1 flex flex-col items-center w-full">
                {topThree[1] ? (
                  <Link to={`/team/${topThree[1].slug}`} className="bg-[#121926]/60 border border-white/5 p-6 sm:p-8 rounded-sm w-full relative flex flex-col items-center text-center min-h-[240px] sm:min-h-[280px] justify-center hover:border-[#ffd900]/30 transition-all group">
                    <div className="absolute -top-4 bg-slate-800 text-white font-black px-4 py-1 rounded-sm shadow-xl italic">2</div>
                    <div className="size-16 sm:size-20 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden mb-4 shadow-2xl flex items-center justify-center">
                      {topThree[1].logo_url ? (
                        <img src={apiService.resolveImageUrl(topThree[1].logo_url)} alt="" className="size-full object-contain p-2" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-slate-400">shield</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black uppercase italic text-white tracking-tighter mb-2 group-hover:text-[#ffd900] transition-colors">{topThree[1].name}</h3>
                    <div className="bg-[#101622] px-4 py-2 rounded shadow-inner">
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-tight mb-1">
                        PUNTOS KO
                      </p>
                      <p className="text-xl font-black text-[#ffd900]">
                        {Number(topThree[1].official_ranking_points).toFixed(1)}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-[#121926]/20 border border-white/5 border-dashed p-6 sm:p-8 rounded-sm w-full relative flex flex-col items-center text-center min-h-[240px] sm:min-h-[280px] justify-center opacity-50">
                    <span className="material-symbols-outlined text-4xl text-white/10 mb-4">person_off</span>
                    <p className="text-[10px] text-white/20 font-black uppercase">Sin clasificar</p>
                  </div>
                )}
              </div>

              {/* Rank 1 */}
              <div className="order-1 md:order-2 flex flex-col items-center w-full">
                {topThree[0] ? (
                  <Link to={`/team/${topThree[0].slug}`} className="bg-[#101622] border-2 border-[#ffd900] p-8 sm:p-10 rounded-sm w-full relative flex flex-col items-center text-center min-h-[320px] sm:min-h-[380px] justify-center shadow-[0_0_60px_rgba(255,217,0,0.1)] z-10 md:scale-105 hover:bg-[#101622]/80 transition-all group">
                    <div className="absolute -top-6 bg-[#ffd900] text-black font-black px-6 py-2 rounded-sm shadow-2xl italic text-xl">1</div>
                    <div className="size-20 sm:size-28 rounded-lg bg-slate-900 border-2 border-[#ffd900] overflow-hidden mb-6 shadow-2xl flex items-center justify-center">
                      {topThree[0].logo_url ? (
                        <img src={apiService.resolveImageUrl(topThree[0].logo_url)} alt="" className="size-full object-contain p-2" />
                      ) : (
                        <span className="material-symbols-outlined text-6xl text-[#ffd900]">trophy</span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black uppercase italic text-[#ffd900] tracking-tighter mb-3">{topThree[0].name}</h3>
                    <div className="bg-black/40 px-6 py-3 rounded-sm border border-[#ffd900]/20">
                      <p className="text-xs text-white/60 uppercase font-black tracking-widest mb-1">
                        LÍDER OFICIAL
                      </p>
                      <p className="text-3xl font-black text-white italic">
                        {Number(topThree[0].official_ranking_points).toFixed(1)}
                      </p>
                    </div>
                    <span className="mt-4 text-[10px] font-black uppercase text-black bg-[#ffd900] px-3 py-1 rounded-sm italic">
                      LEGADO X{getLegacyMultiplier(topThree[0].official_legacy_count || 0).toFixed(1)}
                    </span>
                  </Link>
                ) : (
                  <div className="bg-[#101622]/20 border-2 border-white/5 border-dashed p-8 sm:p-10 rounded-sm w-full relative flex flex-col items-center text-center min-h-[320px] sm:min-h-[380px] justify-center opacity-50 z-10 md:scale-105">
                    <span className="material-symbols-outlined text-6xl text-white/5 mb-6">workspace_premium</span>
                    <p className="text-xs text-white/10 font-black uppercase">Sin clasificar</p>
                  </div>
                )}
              </div>

              {/* Rank 3 */}
              <div className="order-3 flex flex-col items-center w-full">
                {topThree[2] ? (
                  <Link to={`/team/${topThree[2].slug}`} className="bg-[#121926]/60 border border-white/5 p-6 sm:p-8 rounded-sm w-full relative flex flex-col items-center text-center min-h-[220px] sm:min-h-[260px] justify-center hover:border-[#ffd900]/30 transition-all group">
                    <div className="absolute -top-4 bg-orange-800 text-white font-black px-4 py-1 rounded-sm shadow-xl italic">3</div>
                    <div className="size-16 sm:size-20 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden mb-4 shadow-2xl flex items-center justify-center">
                      {topThree[2].logo_url ? (
                        <img src={apiService.resolveImageUrl(topThree[2].logo_url)} alt="" className="size-full object-contain p-2" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-slate-400">shield</span>
                      )}
                    </div>
                    <h3 className="text-lg font-black uppercase italic text-white tracking-tighter mb-2 group-hover:text-[#ffd900] transition-colors">{topThree[2].name}</h3>
                    <div className="bg-[#101622] px-4 py-2 rounded shadow-inner">
                      <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-tight mb-1">
                        PUNTOS KO
                      </p>
                      <p className="text-xl font-black text-[#ffd900]">
                        {Number(topThree[2].official_ranking_points).toFixed(1)}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-[#121926]/20 border border-white/5 border-dashed p-6 sm:p-8 rounded-sm w-full relative flex flex-col items-center text-center min-h-[220px] sm:min-h-[260px] justify-center opacity-50">
                    <span className="material-symbols-outlined text-4xl text-white/10 mb-4">person_off</span>
                    <p className="text-[10px] text-white/20 font-black uppercase">Sin clasificar</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. NOVEDADES (NEWS/EXPANSIONS) SECTION */}
      <section className="px-4 md:px-10 max-w-7xl mx-auto w-full mb-32">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">NOVEDADES</h2>
          </div>
          <Link className="text-[#ffd900] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all" to="/novedades">
            TODAS LAS NOTICIAS <span className="material-symbols-outlined text-sm">chevron_right</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {noticias.length > 0 ? (
            noticias.map((item) => (
              <Link key={item.id} to={`/novedades/${item.id}`} className="group relative aspect-[3/4] rounded-sm overflow-hidden cursor-pointer border border-white/5">
                <img src={apiService.resolveImageUrl(item.foto)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 p-6 w-full">
                  <span className="text-[#ffd900] text-[9px] font-black uppercase tracking-widest mb-2 block">{item.categoria || 'NOTICIA'}</span>
                  <h3 className="text-xl font-black uppercase italic leading-none text-white mb-2 line-clamp-2">{item.titular}</h3>
                  <p className="text-white/40 text-[10px] leading-relaxed uppercase font-bold line-clamp-2">{item.bajada}</p>
                </div>
              </Link>
            ))
          ) : !loading && (
            <div className="col-span-full py-20 text-center text-white/10 font-black uppercase italic tracking-widest border border-white/5 bg-white/5 rounded-sm">
              No hay novedades destacadas en este momento
            </div>
          )}


        </div>
      </section>

      {/* 5. META DE LA COMUNIDAD SECTION */}
      <section className="px-4 md:px-10 max-w-7xl mx-auto w-full mb-32">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">META DE LA COMUNIDAD</h2>
            <p className="text-white/30 text-xs font-bold tracking-widest uppercase mt-1">Los mazos ganadores más populares de esta semana</p>
          </div>
          <button 
            onClick={() => {
              if (currentUser) {
                setIsCreateModalOpen(true);
              } else {
                navigate('/profile');
              }
            }}
            className="px-8 py-3 bg-[#ffd900] border border-[#ffd900]/20 text-black hover:bg-[#ffed4d] rounded-sm text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-[#ffd900]/10"
          >
            CONSTRUIR MAZO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {publicDecks.length > 0 ? (
            publicDecks.map((deck) => (
              <div 
                key={deck.id} 
                className="bg-[#121926]/40 border border-white/5 rounded-sm p-6 hover:bg-[#121926]/60 transition-all group flex flex-col justify-between min-h-[130px] cursor-pointer hover:border-[#ffd900]/20"
                onClick={() => navigate(`/deck/${deck.id}`)}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black italic uppercase text-white tracking-tighter truncate max-w-[70%] group-hover:text-[#ffd900] transition-colors">{deck.name}</h3>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#ffd900] border border-[#ffd900]/30 bg-[#ffd900]/5 px-2 py-0.5 rounded-sm">
                    {deck.format || 'Pichanga'}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <Link 
                    to={`/profile/${deck.user_id}`} 
                    className="flex items-center gap-2 group/author"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="size-6 rounded-full bg-slate-700 overflow-hidden border border-white/10 flex-shrink-0 flex items-center justify-center">
                      <img 
                        src={deck.authorAvatar || `https://www.gravatar.com/avatar/${deck.user_id}?d=identicon`} 
                        className="w-full h-full object-cover" 
                        alt=""
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase group-hover/author:text-white transition-colors truncate max-w-[100px]">By {deck.author || 'Pancorazo User'}</span>
                  </Link>
                  <div className="flex items-center gap-3">
                     <button 
                       onClick={(e) => handleLike(e, deck.id)}
                       className={`flex items-center gap-1.5 text-[10px] font-black transition-all group/like px-2 py-1 rounded-sm ${likedDecks.has(deck.id) ? 'bg-[#ffd900] text-black shadow-md shadow-[#ffd900]/20 scale-105' : 'text-white/30 hover:text-[#ffd900]'}`}
                     >
                        <span className={`material-symbols-outlined text-sm ${likedDecks.has(deck.id) ? 'fill-1' : 'group-hover/like:scale-110 transition-transform'}`}>thumb_up</span>
                        {deck.likes || 0}
                     </button>
                  </div>
                </div>
              </div>
            ))
          ) : !loading && (
             <div className="col-span-full py-10 text-center bg-white/5 border border-white/5 rounded-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">No hay mazos destacados esta semana</p>
             </div>
          )}
        </div>
      </section>

      {/* Modal de Construcción */}
      {currentUser && (
        <CreateDeckModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(deckId) => navigate(`/builder?id=${deckId}`)}
          userId={currentUser.id}
        />
      )}
    </div>
  );
};

export default Home;
