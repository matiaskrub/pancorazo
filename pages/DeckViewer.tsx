import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Card, User } from '../types';
import DeckStats from '../components/DeckStats';

const DeckViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<any>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [deckCounts, setDeckCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [cardsData, deckData] = await Promise.all([
          apiService.getCards(),
          apiService.getDeck(id!)
        ]);

        setAllCards(cardsData);
        setDeck(deckData);
        setLocalLikes(Number(deckData.likes) || 0);
        setHasLiked(!!deckData.has_liked);

        const counts: Record<string, number> = {};
        if (deckData.cards) {
          deckData.cards.forEach((dc: any) => {
            counts[dc.card_id] = parseInt(dc.quantity) || 1;
          });
        }
        setDeckCounts(counts);
      } catch (error) {
        console.error("Error loading deck data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // --- Logic Helpers ---
  const isPlayerCard = (card: Card) => {
    const category = String(card.category || '').toUpperCase();
    const type = String(card.type || '').toUpperCase();
    return category.includes('JUGADOR') || category.includes('PLAYER') || type.includes('JUGADOR');
  };

  const autoDistribute = (players: Card[]) => {
    const cancha: string[] = [];
    const banca: string[] = [];

    // Group players by position
    const posGroups: Record<string, Card[]> = { PO: [], DF: [], MC: [], DL: [] };
    players.forEach(p => {
      const pos = (p.position || '').toUpperCase();
      if (posGroups[pos]) {
        posGroups[pos].push(p);
      } else {
        posGroups.DF.push(p);
      }
    });

    // 1. Assign POs (First PO to cancha, second PO to banca - mandatory)
    if (posGroups.PO.length >= 2) {
      cancha.push(String(posGroups.PO[0].id));
      banca.push(String(posGroups.PO[1].id));
      posGroups.PO = posGroups.PO.slice(2);
    } else if (posGroups.PO.length === 1) {
      cancha.push(String(posGroups.PO[0].id));
      posGroups.PO = [];
    }

    // 2. Assign 1 of each of DF, MC, DL to Cancha if available
    ['DF', 'MC', 'DL'].forEach(pos => {
      if (posGroups[pos].length > 0) {
        cancha.push(String(posGroups[pos][0].id));
        posGroups[pos] = posGroups[pos].slice(1);
      }
    });

    // 3. Distribute remaining players
    const remaining = [...posGroups.PO, ...posGroups.DF, ...posGroups.MC, ...posGroups.DL];
    remaining.forEach(p => {
      const pPos = (p.position || '').toUpperCase();
      const currentCanchaPosCount = cancha.filter(id => {
        const c = players.find(x => String(x.id) === String(id));
        return c && (c.position || '').toUpperCase() === pPos;
      }).length;

      // Rule: Cancha max 7 players, position max 3, no extra POs (already have 1)
      if (cancha.length < 7 && currentCanchaPosCount < 3 && pPos !== 'PO') {
        cancha.push(String(p.id));
      } else if (banca.length < 3 && pPos !== 'PO') {
        // Banca max 3 players, no extra POs (already have 1)
        banca.push(String(p.id));
      }
    });

    return { cancha, banca };
  };

  const deckCardsDetailed = useMemo(() => {
    return Object.entries(deckCounts)
      .map(([cardId, q]) => ({ 
        card: allCards.find(c => String(c.id) === String(cardId)) || { id: cardId, name: 'Cargando...', rarity: 'AMATEUR', cost: 0, category: '?', type: '?' }, 
        q, 
        id: cardId 
      })) as { card: Card, q: number, id: string }[];
  }, [deckCounts, allCards]);

  const totalCards = Object.values(deckCounts).reduce((a, b) => Number(a) + Number(b), 0);
  
  const playersInDeck = useMemo(() => deckCardsDetailed.filter(item => isPlayerCard(item.card)).map(i => i.card), [deckCardsDetailed]);
  const supportInDeckItems = useMemo(() => deckCardsDetailed.filter(item => !isPlayerCard(item.card)), [deckCardsDetailed]);

  const totalPlayers = Number(playersInDeck.length);
  const totalSupport = Number(totalCards) - totalPlayers;

  const isLegacyDeck = useMemo(() => {
    return deck && deck.cards && !deck.cards.some((dc: any) => dc.zone === 'cancha' || dc.zone === 'banca');
  }, [deck]);

  const canchaCards = useMemo(() => {
    if (!deck || !deck.cards) return [];
    
    let canchaIds: string[];
    if (isLegacyDeck) {
      canchaIds = autoDistribute(playersInDeck).cancha;
    } else {
      canchaIds = deck.cards.filter((dc: any) => dc.zone === 'cancha').map((dc: any) => String(dc.card_id));
    }

    const positionOrder = ['PO', 'DF', 'MC', 'DL'];
    return playersInDeck
      .filter(p => canchaIds.includes(String(p.id)))
      .sort((a, b) => positionOrder.indexOf((a.position || '').toUpperCase()) - positionOrder.indexOf((b.position || '').toUpperCase()));
  }, [playersInDeck, deck, isLegacyDeck]);

  const bancaCards = useMemo(() => {
    if (!deck || !deck.cards) return [];
    
    let bancaIds: string[];
    if (isLegacyDeck) {
      bancaIds = autoDistribute(playersInDeck).banca;
    } else {
      bancaIds = deck.cards.filter((dc: any) => dc.zone === 'banca').map((dc: any) => String(dc.card_id));
    }

    const positionOrder = ['PO', 'DF', 'MC', 'DL'];
    return playersInDeck
      .filter(p => bancaIds.includes(String(p.id)))
      .sort((a, b) => positionOrder.indexOf((a.position || '').toUpperCase()) - positionOrder.indexOf((b.position || '').toUpperCase()));
  }, [playersInDeck, deck, isLegacyDeck]);

  const unassignedCards = useMemo(() => {
    if (!deck || !deck.cards) return [];
    
    let canchaIds: string[];
    let bancaIds: string[];
    if (isLegacyDeck) {
      canchaIds = autoDistribute(playersInDeck).cancha;
      bancaIds = autoDistribute(playersInDeck).banca;
    } else {
      canchaIds = deck.cards.filter((dc: any) => dc.zone === 'cancha').map((dc: any) => String(dc.card_id));
      bancaIds = deck.cards.filter((dc: any) => dc.zone === 'banca').map((dc: any) => String(dc.card_id));
    }

    return playersInDeck.filter(p => !canchaIds.includes(String(p.id)) && !bancaIds.includes(String(p.id)));
  }, [playersInDeck, deck, isLegacyDeck]);

  const sortedPlayersByPosition = useMemo(() => {
    const positionOrder = ['PO', 'DF', 'MC', 'DL'];
    return [...playersInDeck].sort((a, b) => 
      positionOrder.indexOf((a.position || '').toUpperCase()) - positionOrder.indexOf((b.position || '').toUpperCase())
    );
  }, [playersInDeck]);

  // Sorting for Deck View: Type then Rarity
  const sortedSupportItems = useMemo(() => {
    const rarityOrder: Record<string, number> = {
      'LEYENDA': 0, 'CLASE MUNDIAL': 1, 'PROFESIONAL': 2, 'SEMIPROFESIONAL': 3, 'AMATEUR': 4
    };
    const getRarityValue = (r: string) => rarityOrder[(r || '').toUpperCase()] ?? 5;

    return [...supportInDeckItems].sort((a, b) => {
      const typeA = (a.card.category || a.card.type || '').toUpperCase();
      const typeB = (b.card.category || b.card.type || '').toUpperCase();
      if (typeA !== typeB) return typeA.localeCompare(typeB);
      return getRarityValue(a.card.rarity || '') - getRarityValue(b.card.rarity || '');
    });
  }, [supportInDeckItems]);

  const baseEnergy = useMemo(() => {
    if (canchaCards.length === 0) return { captain: false, nationality: false, jersey: false };

    const hasCaptain = canchaCards.some(p => 
      (p.ability?.toLowerCase().includes('capitán') || p.ability?.toLowerCase().includes('capitan')) ||
      (p.ability_text?.toLowerCase().includes('capitán') || p.ability_text?.toLowerCase().includes('capitan'))
    );

    const nationalitiesSets = canchaCards.map(p => new Set((p.nationality || '').split(',').map(s => s.trim().toLowerCase())));
    const commonNationalities = nationalitiesSets.length > 0 
      ? nationalitiesSets.reduce((acc, current) => new Set([...acc].filter(x => current.has(x))))
      : new Set();

    const playersToInlcudeInJersey = canchaCards.filter(p => (p.position || '').toUpperCase() !== 'PO');
    const colorSets = playersToInlcudeInJersey.map(p => new Set((p.shirt_color || '').split(',').map(s => s.trim().toLowerCase())));
    const commonColors = colorSets.length > 0 
      ? colorSets.reduce((acc, current) => new Set([...acc].filter(x => current.has(x))))
      : new Set();

    return {
      captain: hasCaptain,
      nationality: commonNationalities.size > 0,
      jersey: commonColors.size > 0
    };
  }, [canchaCards]);

  const typeStats = useMemo(() => {
    const acc = { jugada: 0, foul: 0, estrategia: 0, hinchada: 0, energia: 0 };
    supportInDeckItems.forEach(({card, q}) => {
      const cat = String(card.category || '').toUpperCase();
      const type = String(card.type || '').toUpperCase();
      if (cat.includes('JUGADA') || type.includes('JUGADA')) acc.jugada += q;
      else if (cat.includes('FOUL') || type.includes('FOUL')) acc.foul += q;
      else if (cat.includes('ESTRATEGIA') || type.includes('ESTRATEGIA')) acc.estrategia += q;
      else if (cat.includes('HINCHADA') || type.includes('HINCHADA')) acc.hinchada += q;
      else if (cat.includes('ENERGÍA') || cat.includes('ENERGIA') || type.includes('ENERGIA') || type.includes('ENERGÍA')) acc.energia += q;
    });
    return acc;
  }, [supportInDeckItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0f1a]">
        <div className="size-16 border-4 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1a] text-white">
        <h2 className="text-2xl font-black mb-4">Mazo no encontrado</h2>
        <button onClick={() => navigate('/explorer')} className="text-[#ffd900] hover:underline">Volver al explorador</button>
      </div>
    );
  }

  const isOwner = currentUser && String(currentUser.id) === String(deck.user_id);

  const handleLike = async () => {
    if (!currentUser) {
      navigate('/profile');
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await apiService.likeDeck(deck.id, currentUser.id);
      // Actualización optimista y precisa según si dio like o quitó el like
      if (res.action === 'liked') {
        setLocalLikes(prev => Number(prev) + 1);
        setHasLiked(true);
      } else if (res.action === 'unliked') {
        setLocalLikes(prev => Math.max(0, Number(prev) - 1));
        setHasLiked(false);
      } else {
        // Fallback en caso de que la API no devuelva 'action'
        const newHasLiked = !hasLiked;
        setLocalLikes(prev => newHasLiked ? Number(prev) + 1 : Math.max(0, Number(prev) - 1));
        setHasLiked(newHasLiked);
      }
    } catch (error) {
      console.error('Error al dar like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-display pb-20">
      {/* Hero Section */}
      <section className="relative pt-24 pb-12 px-6 md:px-12 border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={apiService.resolveImageUrl(deck.image_url)} 
            className="w-full h-full object-cover opacity-20 grayscale blur-sm" 
            alt="Deck background"
            onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a] via-[#0a0f1a]/80 to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-[2px] text-[10px] font-black uppercase tracking-widest border ${deck.status === 'PUBLIC' ? 'bg-[#ffd900]/20 text-[#ffd900] border-[#ffd900]/30' : 'bg-white/10 text-white/60 border-white/20'}`}>
                {deck.status === 'PUBLIC' ? 'PÚBLICO' : 'PRIVADO'}
              </span>
              <span className="px-3 py-1 rounded-[2px] text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {deck.format || 'PICHANGA'}
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter text-white mb-2">
              {deck.name}
            </h1>
            <div className="flex items-center gap-4 text-white/60 text-[11px] font-black uppercase tracking-widest">
              <Link to={`/profile/${deck.user_id}`} className="flex items-center gap-2 hover:text-white transition-colors group">
                <div className="size-6 rounded-full bg-white/10 overflow-hidden border border-transparent group-hover:border-[#ffd900]/50 transition-colors flex-shrink-0 flex items-center justify-center">
                  <img 
                    src={deck.authorAvatar || 'https://www.gravatar.com/avatar/?d=mp'} 
                    alt="Author" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span>POR {deck.author || 'USUARIO'}</span>
              </Link>
              <span>•</span>
              <button 
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-[2px] transition-all group border ${hasLiked ? 'border-[#ffd900] bg-[#ffd900] text-[#101622] shadow-lg shadow-[#ffd900]/20' : 'bg-white/5 border-white/10 hover:border-[#ffd900]/50 text-white/60 hover:text-white'}`}
                title="Votar por este mazo"
              >
                <span className={`material-symbols-outlined text-[14px] ${hasLiked ? 'fill-1' : 'group-hover:text-[#ffd900]'}`}>
                  thumb_up
                </span> 
                <span className="font-black text-[10px] tracking-widest">{localLikes} LIKES</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isOwner && (
              <button 
                onClick={() => navigate(`/builder?id=${deck.id}`)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-[11px] uppercase tracking-widest rounded-sm flex items-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-sm">edit</span> EDITAR MAZO
              </button>
            )}
            <button 
              onClick={() => {
                if (!currentUser) {
                  navigate('/profile');
                } else {
                  navigate(`/builder?clone=${deck.id}`);
                }
              }}
              className="px-6 py-3 bg-[#ffd900] text-black font-black text-[11px] uppercase tracking-widest rounded-sm hover:bg-[#ffed4d] transition-all shadow-xl shadow-[#ffd900]/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span> DUPLICAR MAZO
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {!currentUser && (
          <div className="mb-8 p-4 bg-[#ffd900]/5 border border-[#ffd900]/10 rounded-sm flex items-center gap-3 animate-pulse">
            <span className="material-symbols-outlined text-base text-[#ffd900]">info</span>
            <span className="text-xs font-black uppercase tracking-widest text-[#ffd900]/80 leading-tight">
              Regístrate o inicia sesión para votar o interactuar con los mazos de la comunidad
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Cards */}
        <div className="lg:col-span-8 space-y-16">
          
          {/* Jugadores */}
          <section className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                <span className="w-1.5 h-6 bg-[#ffd900] block"></span> JUGADORES <span className="text-white/30 text-sm ml-2">[{totalPlayers}/10]</span>
              </h2>
            </div>

            {totalPlayers === 0 ? (
              <div className="py-12 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">NO HAY JUGADORES EN ESTE MAZO</p>
              </div>
            ) : (
              <div className="space-y-8">
                {isOwner ? (
                  <>
                    {/* Cancha / Titulares */}
                    {canchaCards.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#ffd900] mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">sports_soccer</span> TITULARES ({canchaCards.length} / 7)
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                          {canchaCards.map((card, i) => (
                            <div key={`cancha-${card.id}-${i}`} className="aspect-[3/4.2] relative group">
                              <img 
                                src={apiService.resolveImageUrl(card.image_url)} 
                                alt={card.name}
                                className="w-full h-full object-cover rounded-lg border border-white/10 shadow-lg hover:border-[#ffd900]/50 transition-all hover:-translate-y-2 hover:shadow-[#ffd900]/20"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Banca / Suplentes */}
                    {bancaCards.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#5ce1e6] mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">chair</span> BANCA SUPLENTE ({bancaCards.length} / 3)
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                          {bancaCards.map((card, i) => (
                            <div key={`banca-${card.id}-${i}`} className="aspect-[3/4.2] relative group">
                              <img 
                                src={apiService.resolveImageUrl(card.image_url)} 
                                alt={card.name}
                                className="w-full h-full object-cover rounded-lg border border-white/10 shadow-lg hover:border-[#5ce1e6]/50 transition-all hover:-translate-y-2 hover:shadow-[#5ce1e6]/20"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unassigned / Otros */}
                    {unassignedCards.length > 0 && (
                      <div className="pt-4 border-t border-white/5">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white/45 mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">group</span> OTROS JUGADORES / RESERVA ({unassignedCards.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                          {unassignedCards.map((card, i) => (
                            <div key={`unassigned-${card.id}-${i}`} className="aspect-[3/4.2] relative group">
                              <img 
                                src={apiService.resolveImageUrl(card.image_url)} 
                                alt={card.name}
                                className="w-full h-full object-cover rounded-lg border border-white/10 shadow-lg hover:border-white/30 transition-all hover:-translate-y-2 hover:shadow-white/10"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#ffd900] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">groups</span> PLANTEL DE JUGADORES ({sortedPlayersByPosition.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                      {sortedPlayersByPosition.map((card, i) => (
                        <div key={`player-${card.id}-${i}`} className="aspect-[3/4.2] relative group">
                          <img 
                            src={apiService.resolveImageUrl(card.image_url)} 
                            alt={card.name}
                            className="w-full h-full object-cover rounded-lg border border-white/10 shadow-lg hover:border-[#ffd900]/50 transition-all hover:-translate-y-2 hover:shadow-[#ffd900]/20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Apoyo */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                <span className="w-1.5 h-6 bg-[#5ce1e6] block"></span> CARTAS DE APOYO <span className="text-white/30 text-sm ml-2">[{totalSupport}/45]</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-y-10 gap-x-6 pt-4 pl-4">
              {sortedSupportItems.map(({card, q}) => (
                <div key={`deck-support-${card.id}`} className="relative group aspect-[3/4.2] transition-transform duration-300 hover:-translate-y-2 hover:scale-105 cursor-pointer">
                  {/* Cartas Apiladas */}
                  {Array.from({ length: Math.min(q, 4) }).map((_, j) => {
                    const isFront = j === Math.min(q, 4) - 1;
                    const offset = (Math.min(q, 4) - 1 - j) * 8; // 8px por carta
                    return (
                      <img 
                        key={j}
                        src={apiService.resolveImageUrl(card.image_url)} 
                        className={`absolute w-full h-full object-cover rounded-lg border border-black/50 shadow-md ${isFront ? 'z-10 shadow-black/80' : 'brightness-[0.4] grayscale-[0.2]'}`} 
                        style={{ 
                          top: `-${offset}px`, 
                          left: `-${offset}px`, 
                          zIndex: j,
                        }}
                        alt={card.name}
                      />
                    );
                  })}
                  
                  {/* Etiqueta de Cantidad */}
                  <div className="absolute -top-3 -right-3 bg-[#ffd900] text-black size-7 rounded-full flex items-center justify-center font-black text-[12px] shadow-lg z-20 border-2 border-[#101622]">
                    {q}
                  </div>
                </div>
              ))}
              {totalSupport === 0 && (
                <div className="col-span-full py-12 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">NO HAY CARTAS DE APOYO EN ESTE MAZO</p>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Analysis */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Tactical Rayos & Support Counters */}
          <section className="bg-[#101622]/80 border border-white/5 rounded-2xl p-6 shadow-xl space-y-8">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6">Sinergias Activas</h3>
              <div className="flex items-center justify-around">
                {[
                  { active: baseEnergy.captain, label: 'Capitán' },
                  { active: baseEnergy.nationality, label: 'Nacionalidad' },
                  { active: baseEnergy.jersey, label: 'Camiseta' }
                ].map(bolt => (
                  <div key={bolt.label} className="flex flex-col items-center gap-2 group">
                    <span className={`material-symbols-outlined text-4xl transition-all duration-300 ${bolt.active ? 'text-[#ffd900] fill-1 drop-shadow-[0_0_10px_rgba(255,217,0,0.5)]' : 'text-white/5 scale-100'}`}>bolt</span>
                    <p className={`text-[9px] font-black uppercase tracking-widest transition-all ${bolt.active ? 'text-[#ffd900]' : 'text-white/20'}`}>{bolt.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6">Distribución de Apoyo</h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: 'Jugada', val: typeStats.jugada, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                  { label: 'Foul', val: typeStats.foul, color: 'bg-white/5 text-gray-300 border-white/10' },
                  { label: 'Estr.', val: typeStats.estrategia, color: 'bg-gray-400/20 text-gray-300 border-gray-400/30' },
                  { label: 'Hinc.', val: typeStats.hinchada, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                  { label: 'Ener.', val: typeStats.energia, color: 'bg-[#ffd900]/20 text-[#ffd900] border-[#ffd900]/30' },
                ].map(stat => (
                  <div key={stat.label} className={`px-2 py-3 rounded-xl border ${stat.color} flex flex-col items-center text-center shadow-lg`}>
                    <p className="text-[8px] font-black uppercase leading-none mb-2 opacity-60 break-all">{stat.label}</p>
                    <p className="text-sm font-black leading-none">{stat.val}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Detailed Stats */}
          <div className="bg-[#101622]/80 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <DeckStats deckItems={deckCardsDetailed} canchaCards={isOwner ? canchaCards : playersInDeck} />
          </div>
        </div>
        
        </div>
      </div>
    </div>
  );
};

export default DeckViewer;
