export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  custom_country?: string;
  region?: string;
  commune?: string;
  wsp?: string;
  team_id_linked?: string;
  social_google_id?: string;
  social_discord_id?: string;
  password_hash?: string;
  profile_image?: string;
  global_role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'PLAYER' | 'Visitante';
  created_at?: string;
  created_team_name?: string;
  created_team_id?: string;
  claimed_team_name?: string;
  claimed_team_id?: string;
  accept_newsletter?: number;
  organizer?: string;
}

export enum CardRarity {
  AMATEUR = 'AMATEUR',
  SEMIPROFESIONAL = 'SEMIPROFESIONAL',
  PROFESIONAL = 'PROFESIONAL',
  CLASE_MUNDIAL = 'Clase Mundial',
  LEYENDA = 'LEYENDA'
}

export enum CardCategory {
  PLAYER = 'JUGADOR',
  PLAY = 'JUGADA',
  FOUL = 'FOUL',
  STRATEGY = 'ESTRATEGIA',
  FANS = 'HINCHADA',
  ENERGY = 'ENERGÍA',
  STADIUM = 'ESTADIO'
}

export enum PlayerPosition {
  DL = 'DL',
  MC = 'MC',
  DF = 'DF',
  PO = 'PO'
}

export enum CardElement {
  FIRE = 'FIRE',
  WATER = 'WATER',
  NATURE = 'NATURE',
  LIGHTNING = 'LIGHTNING',
  DARK = 'DARK',
  LIGHT = 'LIGHT'
}

export interface Card {
  id: string;
  name: string;
  rarity: string;
  type: string;
  position?: string;
  shirt_color?: string; // Up to 3 colors comma-separated, or "Selección"
  stats_attack: number;
  stats_defense: number;
  image_url?: string;
  ability_text?: string;
  nationality?: string; // Comma-separated for multiple
  gender?: string;
  cost: number;
  category?: string;
  ability?: string;
  edition: string;
  element?: CardElement;
  has_x_cost?: number;
  team?: string;
  rating?: number;
  is_unlimited?: number;
  is_hero?: number;
  is_fan?: number;
  orientation?: 'portrait' | 'landscape';
}

export interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string;
  founded_year: number;
  owner_user_id: string | null;
  status: 'Activo' | 'Histórico' | 'Inactivo';
  current_elo: number;
  current_jo?: number;
  slug: string;
  owner_name?: string;
  official_ranking_points?: number;
  official_legacy_count?: number;
  wins_count?: number;
  draws_count?: number;
  losses_count?: number;
  total_matches?: number;
  goals_for?: number;
  goals_against?: number;
  official_wins_count?: number;
  official_draws_count?: number;
  official_losses_count?: number;
  official_total_matches?: number;
  official_goals_for?: number;
  official_goals_against?: number;
  official_titles_count?: number;
  official_titles_barrio?: number;
  official_titles_ascenso?: number;
  official_titles_oro?: number;
  official_podium_second_count?: number;
  official_podium_third_count?: number;
  official_podium_fourth_count?: number;
  official_won_tournament_names?: string;
  community_titles_count?: number;
  community_podium_second_count?: number;
  community_podium_third_count?: number;
  community_podium_fourth_count?: number;
  community_won_tournament_names?: string;
  elo_history?: string;
  decks_count?: number;
  banner_url?: string;
  created_by_user?: boolean;
  created_at?: string;
}

export interface MatchResult {
  id: string;
  tournament: string;
  date: string;
  homeTeam: string;
  homeScore: number;
  awayTeam: string;
  awayScore: number;
  result: 'VICTORY' | 'DEFEAT' | 'DRAW';
  eloChange: number;
  type: string;
}

export interface Match {
  id: string;
  tournament_id: string | null;
  tournament_name?: string;
  series_id: string | null;
  team_home_id: string;
  team_away_id: string;
  home_team_name?: string;
  away_team_name?: string;
  home_name?: string;
  away_name?: string;
  score_home: number;
  score_away: number;
  penalties_home: number | null;
  penalties_away: number | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELED' | 'SCHEDULED' | 'PLAYED' | 'WALKOVER';
  played_at: string;
  elo_type: string;
  is_wo: number;
  stage?: string | null;
  bracket_index?: number | null;
  admin_elo_home?: number | null;
  admin_elo_away?: number | null;
  admin_reason?: string | null;
  events?: any[];
}

export interface HighlightRule {
  start: number;
  end: number;
  color: string;
  textColor?: string;
  label?: string;
  legend?: string;
}

export interface Tournament {
  id: string;
  name: string;
  invite_code?: string;
  season?: string;
  organizer_id?: string;
  is_jo: number;
  participant_type: 'individual' | 'squad';
  structure: 'liga' | 'copa' | 'híbrido' | 'suizo' | 'legacy';
  status: 'draft' | 'open' | 'registration_closed' | 'in_progress' | 'finished' | 'closed';
  start_date?: string;
  end_date?: string;
  registration_start?: string;
  registration_end?: string;
  registration_closed_at?: string;
  estimated_start?: string;
  match_format?: 'single' | 'home_away';
  image?: string;
  prize?: string;
  min_teams?: number;
  max_teams?: number;
  rules_url?: string;
  banner_url?: string;
  has_third_place?: number;
  highlight_settings?: HighlightRule[];
  region_id?: number;
  is_invitational?: number;
  allowed_regions?: number[];
  tournament_level?: 'barrio' | 'ascenso' | 'oro';
  tournament_type?: 'pichanga' | 'barrio' | 'ascenso' | 'oro';
  competitiveness_level?: 'semiprofesional' | 'profesional';
  category_id?: number | string;
  division_level?: number;
  legacy?: number;
  creator_username?: string;
  created_by_user_id?: number;
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  team_id: string;
  squad_id?: string;
  display_label?: string;
  seed?: number;
  is_waiting?: boolean;
  group_name?: string;
  registration_date?: string;
}

export interface HallOfFameEntry {
  rank: number;
  teamName: string;
  teamSlug: string;
  division: string;
  avatarUrl: string;
  trophies: {
    official: number;
    ko_barrio: number;
    ko_ascenso: number;
    ko_oro: number;
    comunidad: number;
    total: number;
  };
  lastTrophy: string;
  isVerified?: boolean;
}

export interface HallOfFameStats {
  globalTournaments: number;
  globalTournamentsTrend: number;
  globalMatches: number;
  globalMatchesTrend: number;
  officialTournaments: number;
  officialTournamentsTrend: number;
}

export interface HallOfFameResponse {
  stats: HallOfFameStats;
  ranking: HallOfFameEntry[];
}

export interface CommunityDeck {
  id: string;
  name: string;
  tag: string;
  winRate: string;
  avgCost: string;
  likes: string;
  author: string;
  authorAvatar: string;
  formation: string;
  distribution: number[]; // Array of values representing the cost distribution bars
}

export interface LiveCardStat {
  id: string;
  name: string;
  rating: number;
  usageRate: string;
  trend: string;
  isUp: boolean;
  imageUrl: string;
}

export interface Noticia {
  id: string;
  titular: string;
  bajada: string;
  foto: string;
  texto: string;
  fecha: string;
  es_titular: number;
  categoria: string;
  status: 'Borrador' | 'Publicado';
}
