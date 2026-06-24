
import { Card, CardRarity, PlayerPosition, CardCategory, CardElement, Team, MatchResult, Tournament, HallOfFameEntry, CommunityDeck, LiveCardStat } from '../types';

export const MOCK_CARDS: Card[] = [
  {
    id: '1',
    name: 'ERLING HAALAND',
    rarity: CardRarity.LEYENDA,
    category: CardCategory.PLAYER,
    position: PlayerPosition.DL,
    team: 'MANCHESTER',
    rating: 98,
    type: 'Jugador',
    stats_attack: 98,
    stats_defense: 42,
    cost: 8,
    element: CardElement.FIRE,
    edition: '2024 Series',
    image_url: 'https://images.unsplash.com/photo-1614632537190-23e414d4494a?auto=format&fit=crop&q=80',
    shirt_color: 'Azul',
    nationality: 'Noruega',
    gender: 'Masculino'
  },
  {
    id: '2',
    name: 'JUDE BELLINGHAM',
    rarity: CardRarity.CLASE_MUNDIAL,
    category: CardCategory.PLAYER,
    position: PlayerPosition.MC,
    team: 'MADRID',
    rating: 88,
    type: 'Jugador',
    stats_attack: 88,
    stats_defense: 74,
    cost: 6,
    element: CardElement.WATER,
    edition: '2024 Series',
    image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80',
    shirt_color: 'Blanco',
    nationality: 'Inglaterra',
    gender: 'Masculino'
  },
  {
    id: '3',
    name: 'DECLAN RICE',
    rarity: CardRarity.PROFESIONAL,
    category: CardCategory.PLAYER,
    position: PlayerPosition.DF,
    team: 'LONDRES',
    rating: 65,
    type: 'Jugador',
    stats_attack: 65,
    stats_defense: 92,
    cost: 4,
    element: CardElement.NATURE,
    edition: '2024 Series',
    image_url: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80',
    shirt_color: 'Rojo',
    nationality: 'Inglaterra',
    gender: 'Masculino'
  },
  {
    id: '4',
    name: 'MIKE MAIGNAN',
    rarity: CardRarity.SEMIPROFESIONAL,
    category: CardCategory.PLAYER,
    position: PlayerPosition.PO,
    team: 'MILÁN',
    rating: 12,
    type: 'Jugador',
    stats_attack: 12,
    stats_defense: 94,
    cost: 3,
    element: CardElement.LIGHTNING,
    edition: '2024 Series',
    image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80',
    shirt_color: 'Negro',
    nationality: 'Francia',
    gender: 'Masculino'
  },
  {
    id: '5',
    name: 'KYLIAN MBAPPÉ',
    rarity: CardRarity.LEYENDA,
    category: CardCategory.PLAYER,
    position: PlayerPosition.DL,
    team: 'MANCHESTER',
    rating: 99,
    type: 'Jugador',
    stats_attack: 99,
    stats_defense: 38,
    cost: 9,
    element: CardElement.DARK,
    edition: '2024 Series',
    image_url: 'https://images.unsplash.com/photo-1579952318543-7daaf807ecbe?auto=format&fit=crop&q=80',
    shirt_color: 'Blanco',
    nationality: 'Francia',
    gender: 'Masculino'
  }
];

export const MOCK_COMMUNITY_DECKS: CommunityDeck[] = [
  {
    id: 'cd1',
    name: 'Dominio de Cataluña',
    tag: 'ÉLITE TIKI-TAKA',
    winRate: '68.4%',
    avgCost: '3.8 ENERGÍA',
    likes: '2.4k',
    author: 'PEPMASTER',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pep',
    formation: '4-3-3 Ataque',
    distribution: [40, 60, 100, 80, 50, 30]
  },
  {
    id: 'cd2',
    name: 'London Blitz',
    tag: 'CONTRAATAQUE',
    winRate: '62.1%',
    avgCost: '3.8 ENERGÍA',
    likes: '1.8k',
    author: 'MOUSPECIAL',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mou',
    formation: '4-3-3 Ataque',
    distribution: [100, 80, 50, 30, 20, 10]
  }
];

export const MOCK_LIVE_CARD_STATS: LiveCardStat[] = [
  {
    id: 'ls1',
    name: 'K. MBAPPÉ',
    rating: 94,
    usageRate: '92% de Uso',
    trend: '+4.2%',
    isUp: true,
    imageUrl: 'https://images.unsplash.com/photo-1579952318543-7daaf807ecbe?auto=format&fit=crop&q=80'
  },
  {
    id: 'ls2',
    name: 'E. HAALAND',
    rating: 91,
    usageRate: '92% de Uso',
    trend: '0.0%',
    isUp: true,
    imageUrl: 'https://images.unsplash.com/photo-1614632537190-23e414d4494a?auto=format&fit=crop&q=80'
  },
  {
    id: 'ls3',
    name: 'K. DE BRUYNE',
    rating: 89,
    usageRate: '92% de Uso',
    trend: '-1.5%',
    isUp: false,
    imageUrl: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&q=80'
  },
  {
    id: 'ls4',
    name: 'V. JUNIOR',
    rating: 87,
    usageRate: '92% de Uso',
    trend: '+12.8%',
    isUp: true,
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80'
  }
];

export const MOCK_RANKINGS: any[] = [
  {
    id: 't1',
    name: 'Titans FC',
    captain: '@Striker99',
    elo: 2945,
    winRate: 74.2,
    rank: 1,
    crestUrl: 'https://picsum.photos/seed/crest1/100/100',
    matches: 178,
    wins: 142,
    draws: 12,
    losses: 24
  },
  {
    id: 't2',
    name: 'Striker Elite',
    captain: '@J_Dinho',
    elo: 2812,
    winRate: 68.4,
    rank: 2,
    crestUrl: 'https://picsum.photos/seed/crest2/100/100',
    matches: 150,
    wins: 102,
    draws: 20,
    losses: 28
  },
  {
    id: 't3',
    name: 'Goal Masters',
    captain: '@Striker99',
    elo: 2788,
    winRate: 62.1,
    rank: 3,
    crestUrl: 'https://picsum.photos/seed/crest3/100/100',
    matches: 120,
    wins: 80,
    draws: 15,
    losses: 25
  }
];

export const MOCK_MATCHES: MatchResult[] = [
  {
    id: 'm1',
    tournament: 'Champions League',
    date: 'Today, 2:45 PM',
    homeTeam: 'Galactic Strikers',
    homeScore: 3,
    awayTeam: 'Shadow United',
    awayScore: 1,
    result: 'VICTORY',
    eloChange: 15,
    type: 'Ranked Match'
  },
  {
    id: 'm2',
    tournament: 'Friendly Cup',
    date: 'Yesterday, 10:15 PM',
    homeTeam: 'Galactic Strikers',
    homeScore: 0,
    awayTeam: 'Neon Titans',
    awayScore: 2,
    result: 'DEFEAT',
    eloChange: -12,
    type: 'Exhibition'
  }
];

export const MOCK_TOURNAMENTS: any[] = [
  {
    id: 'tr1',
    name: 'Champions Invitational',
    prize: '5,000 GOLD',
    status: 'LIVE',
    participants: 124,
    maxParticipants: 128,
    endDate: 'TERMINA EN 4H 20M',
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2'
  },
  {
    id: 'tr2',
    name: 'Continental Clash',
    prize: '2,500 GOLD',
    status: 'LIVE',
    participants: 64,
    maxParticipants: 64,
    endDate: 'CUARTOS DE FINAL',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6eda1eedbc'
  },
  {
    id: 'tr3',
    name: 'Global Kickoff Cup',
    prize: '10,000 GOLD',
    status: 'OPEN',
    participants: 45,
    maxParticipants: 512,
    startDate: 'Oct 24, 18:00 UTC',
    image: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781'
  },
  {
    id: 'tr4',
    name: 'Weekend Warrior League',
    prize: '1,500 GOLD',
    status: 'OPEN',
    participants: 188,
    maxParticipants: 256,
    startDate: 'Oct 26, 12:00 UTC',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20'
  },
  {
    id: 'tr5',
    name: 'Under-21 Scouting Cup',
    prize: 'Packs x 5',
    status: 'OPEN',
    participants: 12,
    maxParticipants: 64,
    startDate: 'Oct 28, 20:00 UTC',
    image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377'
  },
  {
    id: 'tr6',
    name: 'Midnight Blitz #42',
    prize: '500 GOLD',
    status: 'PAST',
    participants: 32,
    maxParticipants: 32,
    startDate: 'Oct 20, 2023',
    winner: 'Striker_Pro99'
  },
  {
    id: 'tr7',
    name: 'Alpha Season Grand Finals',
    prize: '50,000 GOLD',
    status: 'PAST',
    participants: 1024,
    maxParticipants: 1024,
    startDate: 'Oct 18, 2023',
    winner: 'LegendaryCardMaster'
  },
  {
    id: 'tr8',
    name: 'Beginner\'s Kickoff #12',
    prize: '100 GOLD',
    status: 'PAST',
    participants: 16,
    maxParticipants: 16,
    startDate: 'Oct 15, 2023',
    winner: 'NewbieSlayer'
  }
];

export const MOCK_HALL_OF_FAME: any[] = [
  {
    rank: 1,
    teamName: 'Titan FC',
    division: 'PRO LEAGUE DIVISION',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=titan',
    isVerified: true,
    trophies: {
      ko: 14,
      kov: 22,
      koiv: 45,
      kom: 12,
      novatos: 5,
      otros: 3,
      total: 101
    },
    lastTrophy: 'Hace 2 horas'
  },
  {
    rank: 2,
    teamName: 'Neo Tokyo United',
    division: 'ASIA ELITE LEAGUE',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neo',
    trophies: {
      ko: 8,
      kov: 19,
      koiv: 52,
      kom: 8,
      novatos: 12,
      otros: 5,
      total: 104
    },
    lastTrophy: 'Hace 1 día'
  },
  {
    rank: 3,
    teamName: 'Emerald Knights',
    division: 'GLOBAL CHAMPIONSHIP',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emerald',
    trophies: {
      ko: 11,
      kov: 15,
      koiv: 38,
      kom: 10,
      novatos: 8,
      otros: 2,
      total: 84
    },
    lastTrophy: 'Hace 3 días'
  },
  {
    rank: 4,
    teamName: 'Void Walkers',
    division: 'UNDERGROUND LEAGUE',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=void',
    trophies: {
      ko: 2,
      kov: 12,
      koiv: 0,
      kom: 5,
      novatos: 20,
      otros: 1,
      total: 40
    },
    lastTrophy: 'Hace 1 semana'
  },
  {
    rank: 5,
    teamName: 'Golden Dynasty',
    division: 'PREMIER DIVISION',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=golden',
    trophies: {
      ko: 0,
      kov: 5,
      koiv: 8,
      kom: 3,
      novatos: 15,
      otros: 0,
      total: 31
    },
    lastTrophy: 'Hace 2 semanas'
  }
];
