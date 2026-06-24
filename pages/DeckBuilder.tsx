
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { Card, Team, User } from '../types';
import BuilderCard from '../components/BuilderCard';
import DeckStats from '../components/DeckStats';
import SaveDeckModal from '../components/SaveDeckModal';
import CardDetailModal from '../components/CardDetailModal';

interface TacticalCardProps {
  card: Card;
  location: 'cancha' | 'banca';
  onMoveToCancha?: () => void;
  onMoveToBanca?: () => void;
  onMoveToPool: () => void;
  onShowDetails: () => void;
}

const TacticalCard: React.FC<TacticalCardProps> = ({ 
  card, 
  location, 
  onMoveToCancha, 
  onMoveToBanca, 
  onMoveToPool, 
  onShowDetails 
}) => {
  const getPositionColor = (pos: string) => {
    switch (String(pos).toUpperCase()) {
      case 'PO': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'DF': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      case 'MC': return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'DL': return 'bg-red-500/20 border-red-500/50 text-red-400';
      default: return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    }
  };

  const getRarityBorder = (rarity: string) => {
    const r = String(rarity || '').toUpperCase();
    if (r.includes('LEYENDA')) return 'border-slate-300 shadow-slate-300/10';
    if (r.includes('MUNDIAL')) return 'border-green-500 shadow-green-500/10';
    if (r.includes('PROFESIONAL') && !r.includes('SEMI')) return 'border-[#ffd900] shadow-[#ffd900]/10';
    if (r.includes('SEMIPROFESIONAL')) return 'border-red-500 shadow-red-500/10';
    return 'border-blue-500 shadow-blue-500/10';
  };

  const isBanca = location === 'banca';

  return (
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', card.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`relative aspect-[3/4.2] ${isBanca ? 'w-20 sm:w-24' : 'w-16 sm:w-[76px]'} bg-[#101622] border rounded-xl overflow-hidden shadow-lg group/tactical cursor-grab active:cursor-grabbing transition-all duration-300 hover:scale-105 hover:z-20 ${getRarityBorder(card.rarity)} ${isBanca ? 'rotate-270 origin-center' : ''}`}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${apiService.resolveImageUrl(card.image_url)})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
      </div>

      {/* Position Badge & Details trigger */}
      <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
        <span className={`px-1 py-0.5 rounded text-[7px] font-black border ${getPositionColor(card.position)}`}>
          {card.position}
        </span>
      </div>

      {/* Action Buttons overlay */}
      <div className="absolute top-1.5 right-1.5 z-10 flex gap-1 opacity-0 group-hover/tactical:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onShowDetails(); }}
          className="bg-black/85 hover:bg-black text-white w-5 h-5 rounded-full flex items-center justify-center border border-white/10"
          title="Ver detalles"
        >
          <span className="material-symbols-outlined text-[10px] flex items-center justify-center">info</span>
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onMoveToPool(); }}
          className="bg-red-600/90 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center shadow"
          title="Quitar"
        >
          <span className="material-symbols-outlined text-[10px] flex items-center justify-center">close</span>
        </button>
      </div>

      {/* Bottom Move Actions */}
      <div className="absolute inset-x-0 bottom-0 p-1 bg-black/90 backdrop-blur-sm transform translate-y-full group-hover/tactical:translate-y-0 transition-transform duration-300 flex justify-center z-15">
        {isBanca && onMoveToCancha && (
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveToCancha(); }}
            className="w-full bg-[#ffd900] text-black font-black text-[7px] py-0.5 rounded uppercase tracking-wider flex items-center justify-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[8px]">sports_soccer</span> Cancha
          </button>
        )}
        {!isBanca && onMoveToBanca && (
          <button 
            onClick={(e) => { e.stopPropagation(); onMoveToBanca(); }}
            className="w-full bg-[#5ce1e6] text-black font-black text-[7px] py-0.5 rounded uppercase tracking-wider flex items-center justify-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[8px]">chair</span> Banca
          </button>
        )}
      </div>

      {/* Bottom Info: Name */}
      <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black to-transparent group-hover/tactical:opacity-0 transition-opacity text-center">
        <p className="text-[8px] font-black text-white truncate px-0.5 uppercase tracking-tighter">{card.name}</p>
      </div>
    </div>
  );
};

const DeckBuilder2: React.FC = () => {
  const [searchParams] = useSearchParams();
  const deckIdFromUrl = searchParams.get('id');
  const cloneIdFromUrl = searchParams.get('clone');

  // --- States ---
  const [catalogCards, setCatalogCards] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]); // Cache for deck cards info
  const [loading, setLoading] = useState(true);
  const [deckCounts, setDeckCounts] = useState<Record<string, number>>({});
  const [deckId, setDeckId] = useState<string | null>(deckIdFromUrl);
  const [deckName, setDeckName] = useState('');
  const [deckStatus, setDeckStatus] = useState<'DRAFT' | 'PRIVATE' | 'PUBLIC'>('DRAFT');
  const [deckFormat, setDeckFormat] = useState<string>('Internacional');
  const [isFormatManuallySelected, setIsFormatManuallySelected] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<{ cloudUpdatedAt: string } | null>(null);

  // --- Player Positioning States ---
  const [canchaPlayers, setCanchaPlayers] = useState<string[]>([]);
  const [bancaPlayers, setBancaPlayers] = useState<string[]>([]);
  const [distributedForDeckId, setDistributedForDeckId] = useState<string | null>(null);

  // --- Autosave States & Refs ---
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved' | 'synced' | 'error' | ''>('');
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<any>(null);
  const hasLoadedInitial = useRef(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [activePosition, setActivePosition] = useState('Limpiar');
  const [activeRarities, setActiveRarities] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<string[]>([]); // Multi-select categories
  const [activeCost, setActiveCost] = useState<number | 'Limpiar'>('Limpiar');
  const [activeShirtColor, setActiveShirtColor] = useState('Limpiar');
  const [sortBy, setSortBy] = useState('DEFAULT');

  // UI States
  const [mainView, setMainView] = useState<'catalog' | 'deck_players' | 'deck_support'>('deck_players');
  const [activeTab, setActiveTab] = useState<'cards' | 'stats'>('cards');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // --- Initial Loads ---
  useEffect(() => {
    // Load ALL cards initially to have a complete cache for the deck
    apiService.getCards().then(data => {
      setAllCards(data);
    });

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      apiService.getUserTeam(user.id).then(setUserTeam);
    }

    const targetId = deckIdFromUrl || cloneIdFromUrl;
    if (targetId) {
      apiService.getDeck(targetId).then(deck => {
        if (deckIdFromUrl) {
          setDeckId(deck.id);
          setDeckName(deck.name);
          setDeckStatus(deck.status || (Number(deck.is_active) === 1 ? 'PUBLIC' : 'DRAFT'));
          setIsLocked(!!deck.is_locked);
          setCloudUpdatedAt(deck.updated_at || null);
        } else {
          // Es una copia/duplicación de otro mazo
          setDeckId(null);
          setDeckName(`${deck.name} (Copia)`);
          setDeckStatus('DRAFT');
          setIsLocked(false);
          setCloudUpdatedAt(null);
        }
        setDeckFormat(deck.format === 'Pichanga' ? 'Internacional' : (deck.format || 'Internacional'));
        setIsFormatManuallySelected(true);
        
        const counts: Record<string, number> = {};
        const cancha: string[] = [];
        const banca: string[] = [];
        deck.cards.forEach((dc: any) => {
          counts[dc.card_id] = parseInt(dc.quantity) || 1;
          if (dc.zone === 'cancha') {
            cancha.push(String(dc.card_id));
          } else if (dc.zone === 'banca') {
            banca.push(String(dc.card_id));
          }
        });
        setDeckCounts(counts);
        setCanchaPlayers(cancha);
        setBancaPlayers(banca);
        setDistributedForDeckId(deck.id);
        
        // Evitamos disparos falsos de autoguardado al cargar
        setTimeout(() => {
          hasLoadedInitial.current = true;
        }, 200);
      }).catch(err => {
        console.error("Error loading deck:", err);
        setTimeout(() => {
          hasLoadedInitial.current = true;
        }, 200);
      });
    } else {
      setTimeout(() => {
        hasLoadedInitial.current = true;
      }, 200);
    }
  }, [deckIdFromUrl, cloneIdFromUrl]);

  // Catalog update (filtered)
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const filters: any = {
          search,
          position: activePosition === 'Limpiar' ? '' : activePosition,
          rarity: activeRarities.length > 0 ? activeRarities.join(',') : '',
          type: activeTypes.length > 0 ? activeTypes.join(',') : '',
          shirt_color: activeShirtColor === 'Limpiar' ? '' : activeShirtColor,
        };
        const data = await apiService.getCards(filters);
        
        // Local Filter for Cost (ensures it works even if API is limited)
        let filteredData = data;
        if (activeCost !== 'Limpiar') {
          filteredData = data.filter(c => Number(c.cost) === Number(activeCost));
        }
        
        setCatalogCards(filteredData);
      } catch (error) {
        console.error('Error fetching catalog:', error);
      } finally {
        setLoading(false);
      }
    };
    const debounce = setTimeout(fetchCatalog, 300);
    return () => clearTimeout(debounce);
  }, [search, activePosition, activeRarities, activeTypes, activeCost, activeShirtColor]);

  const sortedCatalogCards = useMemo(() => {
    const rarityOrder: Record<string, number> = {
      'Leyenda': 5,
      'Clase Mundial': 4,
      'Profesional': 3,
      'Semiprofesional': 2,
      'Amateur': 1
    };
    return [...catalogCards].sort((a, b) => {
      switch (sortBy) {
        case 'NAME_ASC':
          return a.name.localeCompare(b.name);
        case 'NAME_DESC':
          return b.name.localeCompare(a.name);
        case 'RARITY_DESC': {
          const orderA = rarityOrder[a.rarity] || 0;
          const orderB = rarityOrder[b.rarity] || 0;
          if (orderA !== orderB) return orderB - orderA;
          return parseInt(b.id) - parseInt(a.id);
        }
        case 'RARITY_ASC': {
          const orderA = rarityOrder[a.rarity] || 0;
          const orderB = rarityOrder[b.rarity] || 0;
          if (orderA !== orderB) return orderA - orderB;
          return parseInt(b.id) - parseInt(a.id);
        }
        default:
          return 0;
      }
    });
  }, [catalogCards, sortBy]);

  // --- Borrador Local: Detección y Recuperación ---
  useEffect(() => {
    const checkDraft = () => {
      try {
        const rawDraft = localStorage.getItem('pancorazo_deck_draft');
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          const draftId = draft.id || null;
          const currentUrlId = deckIdFromUrl || null;
          
          if (draftId === currentUrlId) {
            setPendingDraft(draft);
            setShowRestorePrompt(true);
          }
        }
      } catch (e) {
        console.error("Error al analizar el borrador local:", e);
      }
    };
    const t = setTimeout(checkDraft, 600);
    return () => clearTimeout(t);
  }, [deckIdFromUrl]);

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setDeckCounts(pendingDraft.deckCounts || {});
      setDeckName(pendingDraft.name || '');
      setDeckFormat(pendingDraft.format === 'Pichanga' ? 'Internacional' : (pendingDraft.format || 'Internacional'));
      setIsFormatManuallySelected(true);
      setDeckStatus(pendingDraft.status || 'DRAFT');
      setDeckId(pendingDraft.id || null);
      setCanchaPlayers(pendingDraft.canchaPlayers || []);
      setBancaPlayers(pendingDraft.bancaPlayers || []);
      setDistributedForDeckId(pendingDraft.id || null);
      setAutosaveStatus('saved');
    }
    setShowRestorePrompt(false);
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('pancorazo_deck_draft');
    setShowRestorePrompt(false);
    setPendingDraft(null);
  };

  // --- Sistema Híbrido de Autoguardado con Debounce ---
  useEffect(() => {
    if (!hasLoadedInitial.current) return;
    if (isLocked) return;
    if (allCards.length === 0) return; // Asegurar que las cartas globales se han cargado para no vaciar el mazo

    // 1. Guardar de inmediato en localStorage
    const draftData = {
      id: deckId,
      name: deckName,
      format: deckFormat,
      status: deckStatus,
      deckCounts: deckCounts,
      canchaPlayers: canchaPlayers,
      bancaPlayers: bancaPlayers,
      timestamp: Date.now()
    };
    localStorage.setItem('pancorazo_deck_draft', JSON.stringify(draftData));
    setAutosaveStatus('saved');

    // 2. Si no hay usuario logueado, nos limitamos al borrador local
    if (!currentUser) return;

    // 3. Debounce de 5 segundos para sincronizar con el servidor en segundo plano
    setAutosaveStatus('saving');
    const timer = setTimeout(async () => {
      const allCardsData: any[] = [];
      Object.entries(deckCounts).forEach(([id, q]) => {
        const qty = Number(q);
        const card = allCards.find(c => String(c.id) === String(id));
        if (!card) return;
        const slotType = isPlayerCard(card) ? 'PLAYER' : 'SUPPORT';
        let zone = null;
        if (isPlayerCard(card)) {
          if (canchaPlayers.includes(String(id))) {
            zone = 'cancha';
          } else if (bancaPlayers.includes(String(id))) {
            zone = 'banca';
          }
        }
        for (let i = 0; i < qty; i++) {
          allCardsData.push({ 
            card_id: id, 
            slot_type: slotType,
            zone: zone
          });
        }
      });

      const nameForAutosave = deckName.trim() || 'Borrador Autoguardado';
      let finalName = nameForAutosave;
      if (userTeam?.short_name) {
        const prefix = `(${userTeam.short_name})`;
        if (!nameForAutosave.includes(prefix)) {
          finalName = `${prefix} ${nameForAutosave}`;
        }
      }

      try {
        const result = await apiService.saveDeck({
          id: deckId,
          name: finalName,
          user_id: currentUser.id,
          team_id: userTeam?.id || null,
          status: deckStatus, // Conservar el estado actual del mazo en el autoguardado
          format: deckFormat,
          is_active: deckStatus === 'PUBLIC' ? 1 : 0,
          cards: allCardsData,
          last_updated_at: cloudUpdatedAt
        });

        // Si es un mazo nuevo, nos retorna un ID nuevo
        if (!deckId && result.id) {
          setDeckId(result.id);
          setDistributedForDeckId(result.id);
          // Inyectamos silenciosamente el ID en la URL de la SPA sin recargar
          const newUrl = `${window.location.pathname}?id=${result.id}`;
          window.history.replaceState(null, '', newUrl);
        }
        if (result.updated_at) {
          setCloudUpdatedAt(result.updated_at);
        }
        setAutosaveStatus('synced');
      } catch (error: any) {
        if (error.status === 409 || error.data?.error === 'CONFLICT') {
          setAutosaveStatus('error');
          setConflictData({ cloudUpdatedAt: error.data?.cloud_updated_at || 'Desconocida' });
        } else {
          console.error("Error en autoguardado silencioso:", error);
          setAutosaveStatus('error');
        }
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [deckCounts, deckName, deckFormat, deckStatus, deckId, currentUser, allCards, userTeam, canchaPlayers, bancaPlayers, cloudUpdatedAt]);

  const shirtColors = [
    { name: 'Rojo', color: 'bg-red-600', text: 'text-white' },
    { name: 'Verde', color: 'bg-green-600', text: 'text-white' },
    { name: 'Azul', color: 'bg-blue-600', text: 'text-white' },
    { name: 'Negro', color: 'bg-black', text: 'text-white' },
    { name: 'Amarillo', color: 'bg-yellow-400', text: 'text-black' },
    { name: 'Blanco', color: 'bg-white', text: 'text-black' },
    { name: 'De Selección', color: 'bg-[#ffd900]', text: 'text-black', icon: 'military_tech' }
  ];

  // --- Logic Helpers ---
  const isPlayerCard = (card: Card) => {
    const category = String(card.category || '').toUpperCase();
    const type = String(card.type || '').toUpperCase();
    return category.includes('JUGADOR') || category.includes('PLAYER') || type.includes('JUGADOR');
  };

  const isEnergyCard = (card: Card) => {
    const category = String(card.category || '').toUpperCase();
    const type = String(card.type || '').toUpperCase();
    return category.includes('ENERGÍA') || category.includes('ENERGIA') || type.includes('ENERGÍA') || type.includes('ENERGIA');
  };

  const isCaptainCard = (card: Card) => {
    const ability = String(card.ability || '').toUpperCase();
    const abilityText = String(card.ability_text || '').toUpperCase();
    return ability.includes('CAPITÁN') || ability.includes('CAPITAN') || abilityText.includes('CAPITÁN') || abilityText.includes('CAPITAN');
  };

  const getMaxAllowed = (card: Card) => {
    if (Number(card.is_unlimited) === 1) return Infinity;
    if (isPlayerCard(card)) return 1;
    
    const rarity = String(card.rarity || '').toUpperCase();
    if (rarity.includes('LEYENDA')) return 1;
    if (rarity.includes('MUNDIAL')) return 2;
    return 3;
  };

  // --- Refined Tactical Logic ---

  // Deck items use "allCards" to BE INDEPENDENT OF FILTERS
  const deckCardsDetailed = useMemo(() => {
    return Object.entries(deckCounts)
      .map(([id, q]) => ({ 
        card: allCards.find(c => String(c.id) === String(id)) || { id, name: 'Cargando...', rarity: 'AMATEUR', cost: 0, category: '?', type: '?' }, 
        q, 
        id 
      })) as { card: Card, q: number, id: string }[];
  }, [deckCounts, allCards]);

  const totalCards = Object.values(deckCounts).reduce((a, b) => Number(a) + Number(b), 0);
  
  const playersInDeck = useMemo(() => deckCardsDetailed.filter(item => isPlayerCard(item.card)).map(i => i.card), [deckCardsDetailed]);

  // --- Auto-Distribution & Load Restore ---
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

  useEffect(() => {
    if (playersInDeck.length === 0) return;
    if (distributedForDeckId === deckId) return;

    // Check if we can restore from local draft first
    const rawDraft = localStorage.getItem('pancorazo_deck_draft');
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft);
        const currentUrlId = deckIdFromUrl || null;
        if (draft.id === currentUrlId && draft.canchaPlayers && draft.bancaPlayers) {
          setCanchaPlayers(draft.canchaPlayers);
          setBancaPlayers(draft.bancaPlayers);
          setDistributedForDeckId(deckId);
          return;
        }
      } catch (e) {
        console.error("Error parsing local draft for positions:", e);
      }
    }

    // Auto-distribute players
    const { cancha, banca } = autoDistribute(playersInDeck);
    setCanchaPlayers(cancha);
    setBancaPlayers(banca);
    setDistributedForDeckId(deckId);
  }, [playersInDeck, deckId, distributedForDeckId, deckIdFromUrl]);

  const supportInDeckItems = useMemo(() => deckCardsDetailed.filter(item => !isPlayerCard(item.card)), [deckCardsDetailed]);

  const totalPlayers = Number(playersInDeck.length);
  const totalSupport = Number(totalCards) - totalPlayers;

  const canchaCards = useMemo(() => {
    return playersInDeck.filter(p => canchaPlayers.includes(String(p.id)));
  }, [playersInDeck, canchaPlayers]);

  // Colores de camiseta compartidos en cancha (excluyendo porteros)
  const canchaPlayersColors = useMemo(() => {
    const playersToInclude = canchaCards.filter(p => (p.position || '').toUpperCase() !== 'PO');
    if (playersToInclude.length === 0) {
      return { commonColors: new Set<string>(), shareColor: false };
    }

    const colorSets = playersToInclude.map(p => 
      new Set((p.shirt_color || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
    );
    
    const common = colorSets.length > 0 
      ? colorSets.reduce((acc, current) => new Set([...acc].filter(x => current.has(x))))
      : new Set<string>();

    return {
      commonColors: common,
      shareColor: common.size > 0
    };
  }, [canchaCards]);

  // Constante de mapeo de colores para cartas FAN
  const FAN_CARDS_COLORS: Record<string, string[]> = {
    'Avalancha verde': ['verde'],
    'Albo desde la cuna': ['blanco'],
    'Sangre azul': ['azul'],
    'Fanático pirata': ['amarillo', 'negro']
  };

  // Helper para saber si una carta es FAN
  const isFanaticSpecialCard = (card: Card) => {
    return Number(card.is_fan) === 1;
  };

  // Cartas especiales FAN en el mazo
  const fanSpecialCardsInDeck = useMemo(() => {
    const items: Card[] = [];
    Object.entries(deckCounts).forEach(([id, q]) => {
      if (Number(q) > 0) {
        const card = allCards.find(c => String(c.id) === String(id));
        if (card && isFanaticSpecialCard(card)) {
          items.push(card);
        }
      }
    });
    return items;
  }, [deckCounts, allCards]);

  // Validaciones de formato y color de cartas FAN
  const fanCardsValidation = useMemo(() => {
    if (fanSpecialCardsInDeck.length === 0) return { valid: true, errors: [] as string[] };

    const errors: string[] = [];
    
    if (deckFormat === 'Internacional') {
      errors.push("Las cartas especiales FAN solo se pueden jugar en formato Fanático (los jugadores de campo en cancha deben compartir color).");
    } else {
      fanSpecialCardsInDeck.forEach(card => {
        const requiredColorsFromCard = (card.shirt_color || '')
          .split(',')
          .map(s => s.trim().toLowerCase())
          .filter(Boolean);
          
        const requiredColors = requiredColorsFromCard.length > 0
          ? requiredColorsFromCard
          : FAN_CARDS_COLORS[card.name];

        if (requiredColors && requiredColors.length > 0) {
          const hasMatch = requiredColors.some(color => canchaPlayersColors.commonColors.has(color.toLowerCase()));
          if (!hasMatch) {
            const formattedColors = requiredColors.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' o ');
            errors.push(`La carta "${card.name}" requiere que el equipo vista de color ${formattedColors}.`);
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }, [fanSpecialCardsInDeck, deckFormat, canchaPlayersColors]);

  // Auto-selección de formato
  useEffect(() => {
    if (!isFormatManuallySelected && canchaCards.length > 0) {
      const fieldPlayers = canchaCards.filter(p => (p.position || '').toUpperCase() !== 'PO');
      if (fieldPlayers.length > 0) {
        setDeckFormat(canchaPlayersColors.shareColor ? 'Fanático' : 'Internacional');
      }
    }
  }, [canchaCards, canchaPlayersColors.shareColor, isFormatManuallySelected]);

  // Base Energy Rayos Logic
  const baseEnergy = useMemo(() => {
    if (canchaCards.length === 0) return { captain: false, nationality: false, jersey: false };

    const hasCaptain = canchaCards.some(isCaptainCard);

    const nationalitiesSets = canchaCards.map(p => new Set((p.nationality || '').split(',').map(s => s.trim().toLowerCase())));
    const commonNationalities = nationalitiesSets.length > 0 
      ? nationalitiesSets.reduce((acc, current) => new Set([...acc].filter(x => current.has(x))))
      : new Set();

    return {
      captain: hasCaptain,
      nationality: commonNationalities.size > 0,
      jersey: canchaPlayersColors.shareColor
    };
  }, [canchaCards, canchaPlayersColors.shareColor]);

  const canchaPosCounts = useMemo(() => {
    const counts = { PO: 0, DF: 0, MC: 0, DL: 0 };
    canchaCards.forEach(p => {
      const pos = (p.position || '').toUpperCase();
      if (pos in counts) counts[pos as keyof typeof counts]++;
    });
    return counts;
  }, [canchaCards]);

  const bancaCards = useMemo(() => {
    return playersInDeck.filter(p => bancaPlayers.includes(String(p.id)));
  }, [playersInDeck, bancaPlayers]);

  const bancaPosCounts = useMemo(() => {
    const counts = { PO: 0, DF: 0, MC: 0, DL: 0 };
    bancaCards.forEach(p => {
      const pos = (p.position || '').toUpperCase();
      if (pos in counts) counts[pos as keyof typeof counts]++;
    });
    return counts;
  }, [bancaCards]);

  const unassignedPlayers = useMemo(() => {
    return playersInDeck.filter(p => !canchaPlayers.includes(String(p.id)) && !bancaPlayers.includes(String(p.id)));
  }, [playersInDeck, canchaPlayers, bancaPlayers]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    // 1. Total players count must be between 10 and 12
    if (totalPlayers < 10 || totalPlayers > 12) {
      errors.push("El mazo debe tener entre 10 y 12 jugadores seleccionados.");
    }

    // 2. Cancha rules:
    if (canchaPlayers.length !== 7) {
      errors.push("La cancha debe tener exactamente 7 jugadores.");
    }
    if (canchaPosCounts.PO !== 1) {
      errors.push("Debe haber exactamente 1 portero (PO) en la cancha.");
    }
    if (canchaPosCounts.DF < 1 || canchaPosCounts.DF > 3) {
      errors.push("Debe haber entre 1 y 3 defensas (DF) en la cancha.");
    }
    if (canchaPosCounts.MC < 1 || canchaPosCounts.MC > 3) {
      errors.push("Debe haber entre 1 y 3 mediocampistas (MC) en la cancha.");
    }
    if (canchaPosCounts.DL < 1 || canchaPosCounts.DL > 3) {
      errors.push("Debe haber entre 1 y 3 delanteros (DL) en la cancha.");
    }
    const captainsInCancha = canchaCards.filter(isCaptainCard).length;
    if (captainsInCancha > 1) {
      errors.push("Solo se permite un máximo de 1 capitán en la cancha.");
    }

    // 3. Banca rules:
    if (bancaPlayers.length !== 3) {
      errors.push("La banca debe tener exactamente 3 suplentes.");
    }
    if (bancaPosCounts.PO !== 1) {
      errors.push("Debe haber exactamente 1 portero suplente en la banca.");
    }

    // 4. Uniformity in fanatic mode:
    if (deckFormat === 'Fanático') {
      const fieldPlayers = canchaCards.filter(p => (p.position || '').toUpperCase() !== 'PO');
      if (fieldPlayers.length > 0 && !canchaPlayersColors.shareColor) {
        errors.push("En el formato Fanático, todos los jugadores en cancha (excluyendo porteros) deben compartir color de camiseta.");
      }
    }

    // 5. Special FAN cards validation:
    if (!fanCardsValidation.valid) {
      errors.push(...fanCardsValidation.errors);
    }

    return errors;
  }, [totalPlayers, canchaPlayers, canchaPosCounts, bancaPlayers, bancaPosCounts, deckFormat, canchaCards, canchaPlayersColors.shareColor, fanCardsValidation]);

  const isLayoutValid = useMemo(() => {
    return validationErrors.length === 0;
  }, [validationErrors]);

  // Support Type Counters
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

  // Sorting for Deck View: Type then Rarity
  const sortedDeckItems = useMemo(() => {
    const rarityOrder: Record<string, number> = {
      'LEYENDA': 0, 'CLASE MUNDIAL': 1, 'PROFESIONAL': 2, 'SEMIPROFESIONAL': 3, 'AMATEUR': 4
    };
    const getRarityValue = (r: string) => rarityOrder[r.toUpperCase()] ?? 5;

    return [...deckCardsDetailed].sort((a, b) => {
      const typeA = (a.card.category || a.card.type || '').toUpperCase();
      const typeB = (b.card.category || b.card.type || '').toUpperCase();
      if (typeA !== typeB) return typeA.localeCompare(typeB);
      return getRarityValue(a.card.rarity) - getRarityValue(b.card.rarity);
    });
  }, [deckCardsDetailed]);

  // --- Deck Actions ---
  const handleAddCard = (card: Card) => {
    const currentCount = deckCounts[card.id] || 0;
    const max = getMaxAllowed(card);

    if (currentCount >= max) {
      alert(`Máximo permitido: ${max}`);
      return;
    }

    if (isPlayerCard(card) && totalPlayers >= 12) {
      alert("Máximo 12 jugadores.");
      return;
    }

    if (!isPlayerCard(card) && totalSupport >= 45) {
      alert("Máximo 45 cartas de apoyo.");
      return;
    }

    setDeckCounts(prev => ({ ...prev, [card.id]: (prev[card.id] || 0) + 1 }));
  };

  const handleRemoveCard = (card: Card) => {
    const currentCount = deckCounts[card.id] || 0;
    if (currentCount <= 0) return;
    const newCounts = { ...deckCounts };
    if (currentCount === 1) {
      delete newCounts[card.id];
    } else {
      newCounts[card.id] = currentCount - 1;
    }
    setDeckCounts(newCounts);

    if (isPlayerCard(card)) {
      setCanchaPlayers(prev => prev.filter(id => String(id) !== String(card.id)));
      setBancaPlayers(prev => prev.filter(id => String(id) !== String(card.id)));
    }
  };

  // --- Drag & Drop / Click Actions for Players ---
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const moveToCancha = (cardId: string) => {
    const player = playersInDeck.find(p => String(p.id) === String(cardId));
    if (!player) return;

    if (canchaPlayers.includes(cardId)) return;

    const pPos = (player.position || '').toUpperCase();

    // rule: maximum 1 captain in Cancha
    if (isCaptainCard(player)) {
      const captainsInCancha = canchaCards.filter(isCaptainCard);
      if (captainsInCancha.length >= 1) {
        alert("La Cancha ya tiene un capitán. Solo se permite 1 capitán en cancha.");
        return;
      }
    }

    // rule: exactly 1 portero in Cancha
    if (pPos === 'PO') {
      const currentCanchaPosCount = canchaPlayers.filter(id => {
        const c = playersInDeck.find(x => String(x.id) === String(id));
        return c && (c.position || '').toUpperCase() === 'PO';
      }).length;
      if (currentCanchaPosCount >= 1) {
        alert("La Cancha ya tiene un portero. Solo se permite 1 portero en cancha.");
        return;
      }
    }

    if (canchaPlayers.length >= 7) {
      alert("La Cancha ya tiene el máximo de 7 jugadores.");
      return;
    }

    const currentCanchaPosCount = canchaPlayers.filter(id => {
      const c = playersInDeck.find(x => String(x.id) === String(id));
      return c && (c.position || '').toUpperCase() === pPos;
    }).length;

    if (currentCanchaPosCount >= 3) {
      alert(`La Cancha ya tiene el máximo de 3 jugadores para la posición ${pPos}.`);
      return;
    }

    setBancaPlayers(prev => prev.filter(id => String(id) !== String(cardId)));
    setCanchaPlayers(prev => [...prev.filter(id => String(id) !== String(cardId)), cardId]);
  };

  const moveToBanca = (cardId: string) => {
    const player = playersInDeck.find(p => String(p.id) === String(cardId));
    if (!player) return;

    if (bancaPlayers.includes(cardId)) return;

    const pPos = (player.position || '').toUpperCase();

    // rule: exactly 1 portero in Banca
    if (pPos === 'PO') {
      const currentBancaPosCount = bancaPlayers.filter(id => {
        const c = playersInDeck.find(x => String(x.id) === String(id));
        return c && (c.position || '').toUpperCase() === 'PO';
      }).length;
      if (currentBancaPosCount >= 1) {
        alert("La Banca ya tiene un portero. Solo se permite 1 portero en la banca.");
        return;
      }
    }

    if (bancaPlayers.length >= 3) {
      alert("La Banca ya tiene el máximo de 3 suplentes.");
      return;
    }

    setCanchaPlayers(prev => prev.filter(id => String(id) !== String(cardId)));
    setBancaPlayers(prev => [...prev.filter(id => String(id) !== String(cardId)), cardId]);
  };

  const moveToPool = (cardId: string) => {
    setCanchaPlayers(prev => prev.filter(id => String(id) !== String(cardId)));
    setBancaPlayers(prev => prev.filter(id => String(id) !== String(cardId)));
  };

  const handleDropToCancha = (e: React.DragEvent) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    moveToCancha(cardId);
  };

  const handleDropToBanca = (e: React.DragEvent) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    moveToBanca(cardId);
  };

  const handleDropToPool = (e: React.DragEvent) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;
    moveToPool(cardId);
  };

  const handleSaveDeck = async (name: string, status: 'DRAFT' | 'PRIVATE' | 'PUBLIC', format: string) => {
    if (!currentUser) return alert("Debes iniciar sesión.");
    if (isLocked) return alert("Este mazo está bloqueado y no puede editarse porque pertenece a un torneo finalizado.");

    let finalName = name;
    if (userTeam?.short_name) {
      const prefix = `(${userTeam.short_name})`;
      if (!name.includes(prefix)) finalName = `${prefix} ${name}`;
    }

    const allCardsData: any[] = [];
    Object.entries(deckCounts).forEach(([id, q]) => {
      const qty = Number(q);
      const card = allCards.find(c => String(c.id) === String(id));
      if (!card) return;
      const slotType = isPlayerCard(card) ? 'PLAYER' : 'SUPPORT';
      let zone = null;
      if (isPlayerCard(card)) {
        if (canchaPlayers.includes(String(id))) {
          zone = 'cancha';
        } else if (bancaPlayers.includes(String(id))) {
          zone = 'banca';
        }
      }
      // Repeat current card qty times for the array
      for (let i = 0; i < qty; i++) {
        allCardsData.push({ 
          card_id: id, 
          slot_type: slotType,
          zone: zone
        });
      }
    });

    try {
      setLoading(true);
      const result = await apiService.saveDeck({
        id: deckId,
        name: finalName,
        user_id: currentUser.id,
        team_id: userTeam?.id || null,
        status: status,
        format: format,
        is_active: (status === 'PUBLIC') ? 1 : 0,
        cards: allCardsData,
        last_updated_at: cloudUpdatedAt
      });
      
      const isNew = !deckId;
      setDeckId(result.id);
      setDeckName(finalName);
      setDeckStatus(status);
      setDeckFormat(format);
      setIsFormatManuallySelected(true);
      if (result.updated_at) {
        setCloudUpdatedAt(result.updated_at);
      }
      
      // Limpiamos el borrador local al guardar manualmente de forma exitosa
      localStorage.removeItem('pancorazo_deck_draft');
      setAutosaveStatus('synced');

      // Si es un mazo nuevo, actualizamos la URL con el ID asignado por el servidor
      if (isNew && result.id) {
        setDistributedForDeckId(result.id);
        const newUrl = `${window.location.pathname}?id=${result.id}`;
        window.history.replaceState(null, '', newUrl);
      }

      alert(`Mazo guardado.`);
      setIsSaveModalOpen(false);
    } catch (error: any) {
      if (error.status === 409 || error.data?.error === 'CONFLICT') {
        setConflictData({ cloudUpdatedAt: error.data?.cloud_updated_at || 'Desconocida' });
      } else {
        alert(error.message || "Error al guardar");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceSave = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      const allCardsData: any[] = [];
      Object.entries(deckCounts).forEach(([id, q]) => {
        const qty = Number(q);
        const card = allCards.find(c => String(c.id) === String(id));
        if (!card) return;
        const slotType = isPlayerCard(card) ? 'PLAYER' : 'SUPPORT';
        let zone = null;
        if (isPlayerCard(card)) {
          if (canchaPlayers.includes(String(id))) {
            zone = 'cancha';
          } else if (bancaPlayers.includes(String(id))) {
            zone = 'banca';
          }
        }
        for (let i = 0; i < qty; i++) {
          allCardsData.push({ 
            card_id: id, 
            slot_type: slotType,
            zone: zone
          });
        }
      });

      const nameForSave = deckName.trim() || 'Mazo Guardado';
      let finalName = nameForSave;
      if (userTeam?.short_name) {
        const prefix = `(${userTeam.short_name})`;
        if (!nameForSave.includes(prefix)) {
          finalName = `${prefix} ${nameForSave}`;
        }
      }

      const result = await apiService.saveDeck({
        id: deckId,
        name: finalName,
        user_id: currentUser.id,
        team_id: userTeam?.id || null,
        status: deckStatus,
        format: deckFormat,
        is_active: deckStatus === 'PUBLIC' ? 1 : 0,
        cards: allCardsData,
        force: true
      });

      if (result.updated_at) {
        setCloudUpdatedAt(result.updated_at);
      }
      setConflictData(null);
      setAutosaveStatus('synced');
      localStorage.removeItem('pancorazo_deck_draft');
      setIsSaveModalOpen(false);
      alert("Mazo guardado y sobrescrito con éxito.");
    } catch (error: any) {
      alert(error.message || "Error al forzar guardado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-[#0a0f1a] text-white font-display overflow-hidden">
      
      {/* Banner de Mazo Bloqueado */}
      {isLocked && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center justify-between text-red-400 gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg animate-pulse shrink-0">lock</span>
            <span className="text-[10px] font-black uppercase tracking-wider">
              Mazo Cerrado / Bloqueado: Este mazo ha sido utilizado en un torneo finalizado y no puede ser modificado para preservar el historial competitivo.
            </span>
          </div>
        </div>
      )}
      
      {/* --- HEADER PRINCIPAL --- */}
      <header className="py-2.5 px-4 border-b border-white/5 bg-[#101622]/85 backdrop-blur-xl z-30 space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black uppercase tracking-tighter italic whitespace-nowrap">
                DECK <span className="text-[#ffd900]">BUILDER</span> 2.0
              </h1>
              <span className="text-[8px] font-black bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full text-white/20">V2.5</span>
            </div>
            
            {/* Vistas Switch */}
            <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setMainView('deck_players')}
                className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 whitespace-nowrap ${mainView === 'deck_players' ? 'bg-[#ffd900] text-black shadow-lg shadow-[#ffd900]/20' : 'text-white/40 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">groups</span> JUGADORES ({totalPlayers})
              </button>
              <button 
                onClick={() => setMainView('deck_support')}
                className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 whitespace-nowrap ${mainView === 'deck_support' ? 'bg-[#ffd900] text-black shadow-lg shadow-[#ffd900]/20' : 'text-white/40 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">style</span> APOYO ({totalSupport})
              </button>
              <button 
                onClick={() => setMainView('catalog')}
                className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 whitespace-nowrap ${mainView === 'catalog' ? 'bg-[#ffd900] text-black shadow-lg shadow-[#ffd900]/20' : 'text-white/40 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-xs">search</span> CATÁLOGO
              </button>
            </div>

            {/* Formatos de Mazo (Selector interactivo) */}
            <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0 overflow-x-auto no-scrollbar items-center">
              <span className="text-[7.5px] font-black text-white/30 uppercase px-2 select-none tracking-wider font-display">Formato:</span>
              <button 
                onClick={() => {
                  setDeckFormat('Fanático');
                  setIsFormatManuallySelected(true);
                }}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-1 ${deckFormat === 'Fanático' ? 'bg-red-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[10px]">campaign</span> Fanático
              </button>
              <button 
                onClick={() => {
                  setDeckFormat('Internacional');
                  setIsFormatManuallySelected(true);
                }}
                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-1 ${deckFormat === 'Internacional' ? 'bg-[#5ce1e6] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-[10px]">public</span> Internacional
              </button>
            </div>
          </div>

          {/* Tactical Rayos and Toggles - REDISEÑO BIGGER */}
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            {/* Rayos con etiquetas */}
            <div className="flex items-center gap-4 border-r border-white/10 pr-4">
              {[
                { active: baseEnergy.captain, label: 'Capitán' },
                { active: baseEnergy.nationality, label: 'Nacionalidad' },
                { active: baseEnergy.jersey, label: 'Camiseta' }
              ].map(bolt => (
                <div key={bolt.label} className="flex flex-col items-center gap-0.5 group">
                  <span className={`material-symbols-outlined text-2xl transition-all duration-300 ${bolt.active ? 'text-[#ffd900] fill-1' : 'text-white/5 scale-100'}`}>bolt</span>
                  <p className={`text-[7px] font-black uppercase tracking-widest transition-all ${bolt.active ? 'text-[#ffd900]' : 'text-white/10'}`}>{bolt.label}</p>
                </div>
              ))}
            </div>

            {/* Support Counters - REDISEÑO BIGGER PILLS */}
            <div className="flex items-center gap-1.5">
              {[
                { label: 'Jugada', val: typeStats.jugada, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { label: 'Foul', val: typeStats.foul, color: 'bg-black/40 text-gray-300 border-white/10' },
                { label: 'Estr.', val: typeStats.estrategia, color: 'bg-gray-400/20 text-gray-300 border-gray-400/30' },
                { label: 'Hinc.', val: typeStats.hinchada, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                { label: 'Ener.', val: typeStats.energia, color: 'bg-[#ffd900]/20 text-[#ffd900] border-[#ffd900]/30' },
              ].map(stat => (
                <div key={stat.label} className={`px-2.5 py-1 rounded-lg border ${stat.color} flex flex-col items-center min-w-[45px] shadow-lg`}>
                  <p className="text-[6.5px] font-black uppercase leading-none mb-1 opacity-60">{stat.label}</p>
                  <p className={`text-xs font-black leading-none`}>{stat.val}</p>
                </div>
              ))}
            </div>

            {/* Indicador de Autoguardado */}
            {autosaveStatus && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs shrink-0 select-none animate-fade-in">
                {autosaveStatus === 'saving' && (
                  <>
                    <span className="size-2 rounded-full bg-[#ffd900] animate-ping shrink-0"></span>
                    <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider font-display">Guardando...</span>
                  </>
                )}
                {autosaveStatus === 'saved' && (
                  <>
                    <span className="material-symbols-outlined text-xs text-[#5ce1e6]">offline_pin</span>
                    <span className="text-[9px] text-[#5ce1e6] font-bold uppercase tracking-wider font-display">Borrador local</span>
                  </>
                )}
                {autosaveStatus === 'synced' && (
                  <>
                    <span className="material-symbols-outlined text-xs text-green-400">cloud_done</span>
                    <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider font-display">En Nube</span>
                  </>
                )}
                {autosaveStatus === 'error' && (
                  <>
                    <span className="material-symbols-outlined text-xs text-red-400">error</span>
                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider font-display">Error de red</span>
                  </>
                )}
              </div>
            )}

            {/* Botón Guardar */}
            <button 
              onClick={() => {
                if (isLocked) {
                  alert("Este mazo está bloqueado y no puede editarse porque pertenece a un torneo finalizado.");
                  return;
                }
                setIsSaveModalOpen(true);
              }}
              disabled={isLocked}
              className={`font-black px-5 py-2 rounded-lg text-[10px] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isLocked 
                  ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5' 
                  : 'bg-[#ffd900] hover:bg-[#ffed4d] text-black shadow-xl shadow-[#ffd900]/10 hover:scale-105 active:scale-95'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{isLocked ? 'lock' : 'save'}</span> 
              {isLocked ? 'MAZO BLOQUEADO' : 'GUARDAR MAZO'}
            </button>
          </div>
        </div>

        {/* --- SUB-NAVBAR: FILTROS (Only in Catalog View) --- */}
        <div className={`transition-all duration-300 overflow-hidden ${mainView === 'catalog' ? 'max-h-20 opacity-100 flex pb-0.5' : 'max-h-0 opacity-0'} flex-wrap gap-2.5 items-center`}>
           <div className="relative min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">search</span>
              <input 
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filtrar catálogo..." 
                className="w-full bg-[#1a2332] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:border-[#ffd900] transition-colors"
              />
           </div>

           <div className="flex gap-2 flex-wrap">
              <select value={activePosition} onChange={e => setActivePosition(e.target.value)} className="bg-[#1a2332] border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black text-white/80 outline-none focus:border-[#ffd900] uppercase cursor-pointer hover:border-[#ffd900]/30 transition-all">
                 <option value="Limpiar" className="bg-[#101622] text-white font-sans text-xs">Posición</option>
                 {['PO', 'DF', 'MC', 'DL'].map(p => <option key={p} value={p} className="bg-[#101622] text-white font-sans text-xs">{p}</option>)}
              </select>
              {/* Rareza Multi-Select Toggle Buttons */}
               <div className="flex items-center gap-0.5 bg-[#1a2332] border border-white/10 rounded-lg p-0.5">
                 <span className="text-[8px] font-black text-white/30 uppercase px-1.5 select-none">Rareza</span>
                 {['Amateur', 'Semiprofesional', 'Profesional', 'Clase Mundial', 'Leyenda'].map(r => (
                   <button 
                     key={r}
                     onClick={() => setActiveRarities(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                     className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all whitespace-nowrap ${
                       activeRarities.includes(r) 
                         ? 'bg-[#ffd900] text-black shadow-sm' 
                         : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                     }`}
                   >
                     {r === 'Clase Mundial' ? 'MUNDIAL' : r === 'Semiprofesional' ? 'SEMI' : r.toUpperCase()}
                   </button>
                 ))}
               </div>
               {/* Categoría Multi-Select Toggle Buttons */}
               <div className="flex items-center gap-0.5 bg-[#1a2332] border border-white/10 rounded-lg p-0.5">
                 <span className="text-[8px] font-black text-white/30 uppercase px-1.5 select-none">Tipo</span>
                 {['Jugador', 'Jugada', 'Foul', 'Estrategia', 'Hinchada', 'Energía'].map(c => (
                   <button 
                     key={c}
                     onClick={() => setActiveTypes(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                     className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all whitespace-nowrap ${
                       activeTypes.includes(c) 
                         ? 'bg-[#5ce1e6] text-black shadow-sm' 
                         : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                     }`}
                   >
                     {c.toUpperCase()}
                   </button>
                 ))}
               </div>
              <select value={activeCost} onChange={e => setActiveCost(e.target.value === 'Limpiar' ? 'Limpiar' : Number(e.target.value))} className="bg-[#1a2332] border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black text-white/80 outline-none focus:border-[#ffd900] uppercase cursor-pointer hover:border-[#ffd900]/30 transition-all">
                 <option value="Limpiar" className="bg-[#101622] text-white font-sans text-xs">Coste</option>
                 {Array.from({length: 11}).map((_, i) => <option key={i} value={i} className="bg-[#101622] text-white font-sans text-xs">{i}</option>)}
              </select>
              <select value={activeShirtColor} onChange={e => setActiveShirtColor(e.target.value)} className="bg-[#1a2332] border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black text-white/80 outline-none focus:border-[#ffd900] uppercase cursor-pointer hover:border-[#ffd900]/30 transition-all">
                 <option value="Limpiar" className="bg-[#101622] text-white font-sans text-xs">Color</option>
                 {shirtColors.map(c => <option key={c.name} value={c.name} className="bg-[#101622] text-white font-sans text-xs">{c.name.toUpperCase()}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-[#1a2332] border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black text-white/80 outline-none focus:border-[#ffd900] uppercase cursor-pointer hover:border-[#ffd900]/30 transition-all">
                 <option value="DEFAULT" className="bg-[#101622] text-white font-sans text-xs">Ordenar por</option>
                 <option value="NAME_ASC" className="bg-[#101622] text-white font-sans text-xs">ALFABÉTICO (A-Z)</option>
                 <option value="NAME_DESC" className="bg-[#101622] text-white font-sans text-xs">ALFABÉTICO (Z-A)</option>
                 <option value="RARITY_DESC" className="bg-[#101622] text-white font-sans text-xs">RAREZA (MAYOR)</option>
                 <option value="RARITY_ASC" className="bg-[#101622] text-white font-sans text-xs">RAREZA (MENOR)</option>
              </select>
              <button 
                onClick={() => { setSearch(''); setActivePosition('Limpiar'); setActiveRarities([]); setActiveTypes([]); setActiveCost('Limpiar'); setActiveShirtColor('Limpiar'); setSortBy('DEFAULT'); }}
                className="px-3 py-1.5 text-[8.5px] font-black uppercase text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-red-400/20"
              >
                Limpiar Filtros
              </button>
           </div>
        </div>
      </header>

      {/* Banner de Advertencia de Uniformidad de Colores en Fanático */}
      {deckFormat === 'Fanático' && canchaCards.filter(p => (p.position || '').toUpperCase() !== 'PO').length > 0 && !canchaPlayersColors.shareColor && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center justify-between text-red-400 gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm animate-pulse shrink-0">warning</span>
            <span className="text-[10px] font-black uppercase tracking-wider">
              Advertencia: El formato Fanático no permite colores de camiseta distintos en la cancha (excluyendo porteros). Revisa los jugadores titulares.
            </span>
          </div>
        </div>
      )}

      {/* Banner de Advertencia de Cartas Especiales FAN */}
      {deckFormat === 'Fanático' && !fanCardsValidation.valid && fanCardsValidation.errors.length > 0 && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center justify-between text-red-400 gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm animate-pulse shrink-0">warning</span>
            <span className="text-[10px] font-black uppercase tracking-wider">
              Advertencia: {fanCardsValidation.errors[0]}
            </span>
          </div>
        </div>
      )}

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
           {mainView === 'catalog' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-9 gap-6">
                 {loading ? (
                    <div className="col-span-full flex items-center justify-center h-64">
                       <div className="size-12 border-4 border-[#ffd900]/20 border-t-[#ffd900] rounded-full animate-spin"></div>
                    </div>
                 ) : sortedCatalogCards.map(card => (
                    <BuilderCard 
                      key={card.id} card={card} count={deckCounts[card.id] || 0}
                      onAdd={() => handleAddCard(card)} onRemove={() => handleRemoveCard(card)}
                      onShowDetails={() => { setSelectedCard(card); setIsDetailModalOpen(true); }}
                      maxAllowed={getMaxAllowed(card)}
                    />
                 ))}
              </div>
           )}

           {mainView === 'deck_players' && (
               <div className="max-w-6xl mx-auto space-y-8 pb-20">
                  {/* Pool Superior: Jugadores Seleccionados */}
                  <section className="space-y-4">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-[#ffd900] pl-6">
                        <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
                          Pool de Jugadores Seleccionados <span className="text-[#ffd900]/40 ml-2">[{totalPlayers}/10-12]</span>
                        </h2>
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                          {totalPlayers < 10 ? `Faltan ${10 - totalPlayers} jugadores para el mínimo` : totalPlayers === 12 ? 'Límite máximo alcanzado' : 'Listo o agrega opcional hasta 12'}
                        </span>
                     </div>
                     
                     <div 
                        onDragOver={handleDragOver}
                        onDrop={handleDropToPool}
                        className="bg-white/5 p-4 rounded-2xl border border-white/10 min-h-[160px] flex flex-col justify-center"
                     >
                        {unassignedPlayers.length > 0 ? (
                           <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                              {unassignedPlayers.map(player => (
                                 <div 
                                    key={`pool-player-${player.id}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, player.id)}
                                    className="relative group cursor-grab active:cursor-grabbing transition-transform hover:scale-105"
                                 >
                                    <BuilderCard 
                                       card={player} 
                                       count={1}
                                       onAdd={() => {}} 
                                       onRemove={() => handleRemoveCard(player)} // Removes card entirely from deck
                                       onShowDetails={() => { setSelectedCard(player); setIsDetailModalOpen(true); }}
                                       maxAllowed={1}
                                    />
                                    {/* Quick action buttons for mobile */}
                                    <div className="absolute top-1 right-1 z-20 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button 
                                          onClick={() => moveToCancha(player.id)}
                                          className="bg-[#ffd900] text-black w-5 h-5 rounded-full flex items-center justify-center shadow hover:scale-110"
                                          title="Mover a Cancha"
                                       >
                                          <span className="material-symbols-outlined text-[10px] font-black">sports_soccer</span>
                                       </button>
                                       <button 
                                          onClick={() => moveToBanca(player.id)}
                                          className="bg-[#5ce1e6] text-black w-5 h-5 rounded-full flex items-center justify-center shadow hover:scale-110"
                                          title="Mover a Banca"
                                       >
                                          <span className="material-symbols-outlined text-[10px] font-black">chair</span>
                                       </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="text-center py-6 text-white/20 select-none">
                              <span className="material-symbols-outlined text-3xl mb-1.5 opacity-30">drag_pan</span>
                              <p className="text-[10px] font-black uppercase tracking-widest leading-none">Todos los jugadores posicionados</p>
                              <p className="text-[9px] opacity-40 mt-1">Arrastra un jugador de Cancha o Banca aquí para desasignarlo.</p>
                           </div>
                        )}

                        {/* SLOTS VACÍOS HASTA EL MÍNIMO DE 10 */}
                        {10 - totalPlayers > 0 && (
                           <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-[#ffd900]/40">Espacios vacíos para llegar al mínimo ({10 - totalPlayers})</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
                                 {Array.from({ length: 10 - totalPlayers }).map((_, i) => (
                                    <div key={`empty-pool-slot-${i}`} className="aspect-[3/4.2] border border-dashed border-[#ffd900]/20 rounded-xl bg-[#ffd900]/2 flex flex-col items-center justify-center text-[#ffd900]/20">
                                       <span className="material-symbols-outlined text-xl mb-1">person_add</span>
                                       <span className="text-[7px] font-black uppercase tracking-wider">Añadir</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  </section>

                  {/* Área táctica: Banca (3) y Cancha (6) */}
                  <div className="grid grid-cols-1 lg:grid-cols-9 gap-6 items-stretch">
                     
                     {/* BANCA (Suplentes) - Izquierda, ancho 3 */}
                     <div 
                        onDragOver={handleDragOver}
                        onDrop={handleDropToBanca}
                        className="lg:col-span-3 bg-[#101622]/60 border border-white/10 rounded-2xl p-5 flex flex-col space-y-4 relative min-h-[480px]"
                     >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                           <h3 className="text-xs font-black uppercase tracking-widest text-[#5ce1e6] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">chair</span> BANCA SUPLENTE ({bancaPlayers.length})
                           </h3>
                           <span className="text-[9px] font-black text-white/30 tracking-wider">Máx. 3 • 1 PO obligatorio</span>
                        </div>

                        {/* Validaciones Rápidas Banca */}
                        <div className="flex gap-2">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black ${bancaPlayers.length === 3 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                              EXACTO 3 suplentes ({bancaPlayers.length}/3)
                           </span>
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black ${bancaPosCounts.PO === 1 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                              EXACTO 1 PO suplente ({bancaPosCounts.PO}/1)
                           </span>
                        </div>

                        {/* Suplentes Rotados 270 grados en una lista vertical con scroll o flex wrap */}
                        <div className="flex-1 flex flex-wrap lg:flex-col justify-center lg:justify-start items-center gap-y-12 gap-x-8 pt-4 overflow-y-auto custom-scrollbar">
                           {bancaCards.map(player => (
                              <TacticalCard 
                                 key={`banca-card-${player.id}`}
                                 card={player}
                                 location="banca"
                                 onMoveToCancha={() => moveToCancha(player.id)}
                                 onMoveToPool={() => moveToPool(player.id)}
                                 onShowDetails={() => { setSelectedCard(player); setIsDetailModalOpen(true); }}
                              />
                           ))}
                           
                           {bancaPlayers.length === 0 && (
                              <div className="w-full flex-1 border border-dashed border-white/10 rounded-xl bg-white/2 flex flex-col items-center justify-center text-white/10 p-6 text-center select-none min-h-[150px]">
                                 <span className="material-symbols-outlined text-2xl mb-1 opacity-20">chair</span>
                                 <span className="text-[8px] font-black uppercase tracking-widest">Arrastra suplentes aquí</span>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* CANCHA (Campo de Juego) - Derecha, ancho 6 */}
                     <div 
                        onDragOver={handleDragOver}
                        onDrop={handleDropToCancha}
                        className="lg:col-span-6 bg-[#101622]/60 border border-white/10 rounded-2xl p-5 flex flex-col space-y-4 relative min-h-[480px]"
                     >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                           <h3 className="text-xs font-black uppercase tracking-widest text-[#ffd900] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">sports_soccer</span> CANCHA PRINCIPAL ({canchaPlayers.length}/7)
                           </h3>
                           <span className="text-[9px] font-black text-white/30 tracking-wider">Máx. 7 • 1 PO obligatorio • 1-3 por posición</span>
                        </div>

                        {deckFormat === 'Fanático' && canchaCards.filter(p => (p.position || '').toUpperCase() !== 'PO').length > 0 && !canchaPlayersColors.shareColor && (
                           <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 flex items-start gap-2.5 text-red-400 text-[10px] font-black uppercase tracking-wider animate-fade-in shadow-md">
                              <span className="material-symbols-outlined text-sm shrink-0 mt-0.5 animate-pulse">warning</span>
                              <span>Advertencia: El formato Fanático no permite colores de camiseta distintos en la cancha (excluyendo porteros).</span>
                           </div>
                        )}

                        {/* Football Field Visual */}
                        <div className="relative flex-1 rounded-2xl bg-gradient-to-b from-[#1b3d22] to-[#122b17] border border-white/10 p-3 flex flex-col gap-2.5 overflow-hidden min-h-[360px]">
                           {/* Soccer field lines markup */}
                           <div className="absolute inset-0 pointer-events-none opacity-20">
                              {/* Center line */}
                              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white"></div>
                              {/* Center circle */}
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-white rounded-full"></div>
                              {/* Penalty area top */}
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-20 border-b border-x border-white"></div>
                              {/* Penalty area bottom */}
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-20 border-t border-x border-white"></div>
                           </div>

                           {/* Positional Rows inside the Pitch */}
                           {[
                              { id: 'DL', title: 'Línea de Ataque (DL)', icon: 'keyboard_double_arrow_up', color: 'text-red-400 border-red-500/20 bg-red-950/20' },
                              { id: 'MC', title: 'Línea de Mediocampo (MC)', icon: 'swap_vertical_circle', color: 'text-green-400 border-green-500/20 bg-green-950/20' },
                              { id: 'DEFENSA', title: 'Línea de Defensa (DF/PO)', icon: 'shield', color: 'text-blue-400 border-blue-500/20 bg-blue-950/20' }
                           ].map(zone => {
                              const zonePlayers = canchaCards.filter(p => {
                                 const pos = (p.position || '').toUpperCase();
                                 if (zone.id === 'DEFENSA') {
                                    return pos === 'DF' || pos === 'PO';
                                 }
                                 return pos === zone.id;
                              });
                              const maxZonePlayers = zone.id === 'DEFENSA' ? 4 : 3;
                              
                              return (
                                 <div 
                                    key={zone.id}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => {
                                       e.preventDefault();
                                       // Dropping directly on a zone behaves exactly like dropping on cancha
                                       const cardId = e.dataTransfer.getData('text/plain');
                                       if (cardId) moveToCancha(cardId);
                                    }}
                                    className={`relative z-10 flex-1 flex flex-col justify-center border border-dashed rounded-xl p-2 transition-all ${zone.color}`}
                                 >
                                    {/* Zone Title */}
                                    <div className="absolute top-1 left-2 text-[8px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1">
                                       <span className="material-symbols-outlined text-[10px]">{zone.icon}</span>
                                       {zone.title} <span className="opacity-40 font-bold">({zonePlayers.length}/{maxZonePlayers})</span>
                                    </div>

                                    {/* Zone Cards */}
                                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                                       {zonePlayers.map(player => (
                                          <TacticalCard 
                                             key={`cancha-card-${player.id}`}
                                             card={player}
                                             location="cancha"
                                             onMoveToBanca={() => moveToBanca(player.id)}
                                             onMoveToPool={() => moveToPool(player.id)}
                                             onShowDetails={() => { setSelectedCard(player); setIsDetailModalOpen(true); }}
                                          />
                                       ))}

                                       {/* Optional Slot helper */}
                                       {zonePlayers.length < maxZonePlayers && canchaPlayers.length < 7 && (
                                          <div className="w-16 sm:w-[76px] aspect-[3/4.2] border border-dashed border-white/10 rounded-xl bg-white/2 flex flex-col items-center justify-center text-white/20 text-center p-1 select-none">
                                             <span className="material-symbols-outlined text-xs">add</span>
                                             <span className="text-[6px] font-black uppercase tracking-wider">Añadir {zone.id === 'DEFENSA' ? 'DF/PO' : zone.id}</span>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  </div>
               </div>
           )}

           {mainView === 'deck_support' && (
              <div className="max-w-6xl mx-auto space-y-12 pb-20">
                 {/* Sección Apoyo (UNFILTERED) */}
                 <section className="space-y-6">
                    <div className="flex items-center gap-4 border-l-4 border-[#5ce1e6] pl-6">
                       <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">MAZO DE APOYO <span className="text-[#5ce1e6]/40 ml-2">[{totalSupport}/45]</span></h2>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-y-8 gap-x-6 pt-6 pl-6">
                       {sortedDeckItems.filter(i => !isPlayerCard(i.card)).map(({card, q}) => (
                          <div key={`deck-support-${card.id}`} className="relative group aspect-[3/4.2] transition-transform duration-300 hover:-translate-y-2 hover:scale-105">
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
                                   />
                                );
                             })}
                             
                             {/* Etiqueta de Cantidad */}
                             <div className="absolute -top-2 -right-2 bg-[#ffd900] text-black size-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-lg z-20">
                                {q}
                             </div>

                             <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between gap-1 z-20 rounded-b-lg">
                                <button onClick={() => handleRemoveCard(card)} className="flex-1 bg-black/80 rounded p-1 hover:bg-black text-white"><span className="material-symbols-outlined text-sm">remove</span></button>
                                <button onClick={() => handleAddCard(card)} className="flex-1 bg-[#ffd900] text-black rounded p-1 hover:bg-[#ffed4d]"><span className="material-symbols-outlined text-sm">add</span></button>
                             </div>
                          </div>
                       ))}
                       {totalSupport < 45 && Array.from({length: Math.max(0, 9 - (totalSupport % 9))}).map((_, i) => (
                           <div key={`empty-support-slot-${i}`} className="aspect-[3/4.2] border border-dashed border-white/5 rounded-lg bg-white/20 flex items-center justify-center text-white/5 opacity-40 mt-0 ml-0">
                              <span className="material-symbols-outlined text-xl">add</span>
                           </div>
                        ))}
                     </div>
                  </section>
               </div>
            )}
        </main>

        {/* --- PANEL LATERAL: ANALÍTICAS --- */}
        <aside className="w-80 lg:w-[400px] bg-[#101622]/60 backdrop-blur-3xl border-l border-white/5 flex flex-col hidden xl:flex">
           <div className="flex border-b border-white/5">
              <button onClick={() => setActiveTab('cards')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] relative ${activeTab === 'cards' ? 'text-[#ffd900]' : 'text-white/40 hover:text-white'}`}>
                LISTADO
                {activeTab === 'cards' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffd900]"></div>}
              </button>
              <button onClick={() => setActiveTab('stats')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] relative ${activeTab === 'stats' ? 'text-[#ffd900]' : 'text-white/40 hover:text-white'}`}>
                ANÁLISIS
                {activeTab === 'stats' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffd900]"></div>}
              </button>
              <button onClick={() => setActiveTab('validation')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] relative ${activeTab === 'validation' ? 'text-[#ffd900]' : 'text-white/40 hover:text-white'}`}>
                RESTRICCIONES
                {activeTab === 'validation' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ffd900]"></div>}
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'cards' && (
                 <div className="p-6 space-y-2">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Cartas del Mazo</p>
                    {sortedDeckItems.map(({card, q}) => (
                       <div key={`sidebar-card-${card.id}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-[#ffd900]/30 transition-all">
                          <div className="flex-1 min-w-0">
                             <p className="text-[11px] font-black text-white uppercase truncate">{card.name}</p>
                             <p className="text-[9px] text-white/30 uppercase font-bold tracking-tighter">{card.rarity} • {card.category || card.type}</p>
                          </div>
                          <p className="text-sm font-black text-white">x{q}</p>
                       </div>
                    ))}
                 </div>
              )}
              {activeTab === 'stats' && (
                 <DeckStats deckItems={deckCardsDetailed} canchaCards={canchaCards} />
              )}
              {activeTab === 'validation' && (
                 <div className="p-6 space-y-5">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">RESTRICCIONES TÁCTICAS</p>
                    
                    <div className="space-y-3">
                       {[
                          { 
                             label: 'Total de Jugadores', 
                             desc: 'Debe ser entre 10 y 12 jugadores seleccionados.',
                             val: `${totalPlayers} / 10-12`, 
                             ok: totalPlayers >= 10 && totalPlayers <= 12 
                          },
                          { 
                             label: 'Jugadores en Cancha', 
                             desc: 'La cancha debe tener exactamente 7 jugadores.',
                             val: `${canchaPlayers.length} / 7`, 
                             ok: canchaPlayers.length === 7 
                          },
                          { 
                             label: 'Portero en Cancha', 
                             desc: 'Debe haber exactamente 1 portero (PO) en la cancha.',
                             val: canchaPosCounts.PO === 1 ? '1 PO' : `${canchaPosCounts.PO} PO`, 
                             ok: canchaPosCounts.PO === 1 
                          },
                          { 
                             label: 'Defensas en Cancha', 
                             desc: 'Debe haber entre 1 y 3 defensas (DF) en cancha.',
                             val: `${canchaPosCounts.DF} / 1-3`, 
                             ok: canchaPosCounts.DF >= 1 && canchaPosCounts.DF <= 3 
                          },
                          { 
                             label: 'Mediocampistas en Cancha', 
                             desc: 'Debe haber entre 1 y 3 mediocampistas (MC) en cancha.',
                             val: `${canchaPosCounts.MC} / 1-3`, 
                             ok: canchaPosCounts.MC >= 1 && canchaPosCounts.MC <= 3 
                          },
                          { 
                             label: 'Delanteros en Cancha', 
                             desc: 'Debe haber entre 1 y 3 delanteros (DL) en cancha.',
                             val: `${canchaPosCounts.DL} / 1-3`, 
                             ok: canchaPosCounts.DL >= 1 && canchaPosCounts.DL <= 3 
                          },
                          { 
                             label: 'Capitán en Cancha', 
                             desc: 'Debe haber como máximo 1 jugador con habilidad de capitán en la cancha.',
                             val: `${canchaCards.filter(isCaptainCard).length} / 1`, 
                             ok: canchaCards.filter(isCaptainCard).length <= 1
                          },
                              { 
                             label: 'Jugadores en Banca', 
                             desc: 'La banca debe tener exactamente 3 suplentes.',
                             val: `${bancaPlayers.length} / 3`, 
                             ok: bancaPlayers.length === 3 
                          },
                          { 
                             label: 'Portero en Banca', 
                             desc: 'Debe haber exactamente 1 portero suplente en la banca.',
                             val: bancaPosCounts.PO === 1 ? '1 PO' : `${bancaPosCounts.PO} PO`, 
                             ok: bancaPosCounts.PO === 1 
                          },
                          ...(deckFormat === 'Fanático' ? [{
                             label: 'Camisetas en Cancha (Fanático)',
                             desc: 'Todos los jugadores en cancha (excluyendo porteros) deben compartir color de camiseta.',
                             val: canchaPlayersColors.shareColor 
                                ? Array.from(canchaPlayersColors.commonColors).map((c: any) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')
                                : 'Ninguno',
                             ok: canchaCards.filter(p => (p.position || '').toUpperCase() !== 'PO').length === 0 || canchaPlayersColors.shareColor
                          }] : []),
                          ...(fanSpecialCardsInDeck.length > 0 ? [{
                             label: 'Cartas Especiales FAN',
                             desc: fanCardsValidation.valid 
                                ? 'Todas las cartas especiales FAN coinciden con el formato y color.'
                                : fanCardsValidation.errors[0],
                             val: fanCardsValidation.valid ? 'Válido' : 'Error',
                             ok: fanCardsValidation.valid
                          }] : [])
                       ].map((rule, idx) => (
                          <div 
                             key={idx} 
                             className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                                rule.ok 
                                ? 'bg-green-500/5 border-green-500/10 text-white' 
                                : 'bg-red-500/5 border-red-500/10 text-white'
                             }`}
                          >
                             <span className={`material-symbols-outlined text-base ${rule.ok ? 'text-green-400' : 'text-red-400'}`}>
                                {rule.ok ? 'check_circle' : 'warning'}
                             </span>
                             <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-1">
                                   <p className="text-[11px] font-black uppercase tracking-tight truncate">{rule.label}</p>
                                   <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${rule.ok ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                                      {rule.val}
                                   </span>
                                </div>
                                <p className="text-[9px] text-white/40 mt-0.5 leading-tight">{rule.desc}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              )}
           </div>

           {/* Progress Bars */}
           <div className="p-8 bg-black/40 border-t border-white/5 space-y-6">
              <div className="space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Jugadores</span>
                    <span className={`text-xs font-black ${totalPlayers >= 10 && totalPlayers <= 12 ? 'text-green-400' : 'text-white'}`}>{totalPlayers}/10-12</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${totalPlayers >= 10 && totalPlayers <= 12 ? 'bg-green-500' : 'bg-[#ffd900]'}`} style={{ width: `${Math.min(100, (totalPlayers/12)*100)}%` }}></div>
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Apoyo</span>
                    <span className={`text-xs font-black ${totalSupport === 45 ? 'text-[#5ce1e6]' : 'text-white'}`}>{totalSupport}/45</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 bg-[#5ce1e6]`} style={{ width: `${(totalSupport/45)*100}%` }}></div>
                 </div>
              </div>
           </div>
        </aside>
      </div>

      {/* --- Modales --- */}
      <SaveDeckModal 
        isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveDeck}
        playerDeck={playersInDeck}
        supportDeck={supportInDeckItems.flatMap(i => Array(i.q).fill(i.card)).concat(Array(45).fill(null)).slice(0, 45)}
        existingName={deckName} isEdit={!!deckId}
        teamShortName={userTeam?.short_name} initialStatus={deckStatus}
        initialFormat={deckFormat}
        isLayoutValid={isLayoutValid}
        validationErrors={validationErrors}
      />
      <CardDetailModal card={selectedCard} isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} />

      {/* --- Banner de Restauración de Borrador --- */}
      {showRestorePrompt && pendingDraft && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-[#101622]/95 backdrop-blur-xl border border-[#ffd900]/30 shadow-[0_10px_35px_rgba(0,0,0,0.8)] p-4 rounded-2xl flex items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[#ffd900]/10 flex items-center justify-center text-[#ffd900] shrink-0">
              <span className="material-symbols-outlined text-lg">history</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-[#ffd900] tracking-wider font-display">Borrador detectado</p>
              <p className="text-[9px] text-white/60 leading-tight">¿Deseas recuperar los cambios no guardados en este navegador?</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleDiscardDraft}
              className="px-2.5 py-1.5 text-[8.5px] font-black uppercase text-white/35 hover:text-white transition-colors"
            >
              Ignorar
            </button>
            <button 
              onClick={handleRestoreDraft}
              className="bg-[#ffd900] hover:bg-[#ffed4d] text-black font-black px-3.5 py-1.5 rounded-lg text-[8.5px] uppercase transition-all shadow-md shadow-[#ffd900]/10 hover:scale-105 active:scale-95"
            >
              Restaurar
            </button>
          </div>
        </div>
      )}

      {/* --- Modal de Conflicto de Versión --- */}
      {conflictData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#101622] border border-red-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.25)]">
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-red-950/40 to-[#101622]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                </div>
                <div>
                  <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">
                    Conflicto de <span className="text-red-500">Versión</span>
                  </h2>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-display">Cambios Concurrentes Detectados</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-xs text-white/70 leading-relaxed">
                La versión de este mazo almacenada en la nube es más reciente que el borrador que tienes abierto. Esto ocurre si has guardado cambios desde otro dispositivo o pestaña.
              </p>
              
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-1">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Última actualización en la nube</p>
                <p className="text-xs font-mono font-bold text-[#5ce1e6]">{conflictData.cloudUpdatedAt}</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleForceSave}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/10 hover:shadow-red-600/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  Sobrescribir versión de la nube
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  disabled={loading}
                  className="w-full bg-[#ffd900] hover:bg-[#ffed4d] text-black font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#ffd900]/10 hover:scale-102 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">cloud_download</span>
                  Cargar versión de la nube (Recomendado)
                </button>

                <button
                  onClick={() => setConflictData(null)}
                  disabled={loading}
                  className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">drafts</span>
                  Mantener como borrador local
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckBuilder2;
