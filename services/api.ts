import { Card, Noticia } from '../types';

const API_URL = '/api';

export const apiService = {
  async getTeams(onlyUnclaimed: boolean = false, showAll: boolean = false, search?: string, basic: boolean = false) {
    let url = `${API_URL}/teams.php`;
    const params = new URLSearchParams();
    if (onlyUnclaimed) params.append('unclaimed', 'true');
    if (showAll) params.append('all', 'true');
    if (search) params.append('search', search);
    if (basic) params.append('basic', 'true');
    params.append('_t', Date.now().toString());

    if (params.toString()) url += `?${params.toString()}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    if (Array.isArray(data)) {
      data.forEach((t: any) => {
        if (!t.logo_url) t.logo_url = '/imagenes/logos/Escudo.png';
      });
    }
    return data;
  },

  async getTeamMatches(teamId: string) {
    const response = await fetch(`${API_URL}/teams.php?action=history&team_id=${teamId}&_t=${Date.now()}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener el historial de partidos');
    return response.json();
  },

  async getTeamTournaments(teamId: string) {
    const response = await fetch(`${API_URL}/tournaments.php?action=team_tournaments&team_id=${teamId}&_t=${Date.now()}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener los torneos del equipo');
    return response.json();
  },

  async updateMatch(id: number | string, matchData: any) {
    const response = await fetch(`${API_URL}/matches.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...matchData, id, action: 'update' }),
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Error al actualizar el partido');
    return response.json();
  },

  async authorizeElo(id: number | string) {
    const response = await fetch(`${API_URL}/matches.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'authorize_elo' }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al autorizar ELO');
    return result;
  },

  async discardElo(id: number | string) {
    const response = await fetch(`${API_URL}/matches.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'discard_elo' }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al descartar ELO');
    return result;
  },

  async getUserTeam(userId: string) {
    const response = await fetch(`${API_URL}/teams.php?owner_id=${userId}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener el equipo del usuario');
    const result = await response.json();
    const team = result[0] || null;
    if (team && !team.logo_url) {
      team.logo_url = '/imagenes/logos/Escudo.png';
    }
    return team;
  },

  async getUserDecks(userId: string, requesterId?: string) {
    let url = `${API_URL}/decks.php?user_id=${userId}`;
    if (requesterId) url += `&requester_id=${requesterId}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return [];
    return await response.json();
  },

  async getPublicDecks(filter: string = 'TENDENCIAS', limit: number = 10, offset: number = 0, userId?: string | number) {
    let url = `${API_URL}/decks.php?action=public&filter=${encodeURIComponent(filter)}&limit=${limit}&offset=${offset}`;
    if (userId) url += `&user_id=${userId}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return [];
    return await response.json();
  },

  async getTopCards(type?: string) {
    let url = `${API_URL}/decks.php?action=top_cards`;
    if (type && type !== 'VER TODAS') url += `&type=${encodeURIComponent(type)}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return [];
    return await response.json();
  },

  async getDeck(deckId: string, userId?: string | number) {
    let url = `${API_URL}/decks.php?id=${deckId}`;
    if (userId) url += `&user_id=${userId}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener el mazo');
    return await response.json();
  },

  async saveDeck(deckData: any) {
    const response = await fetch(`${API_URL}/decks.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deckData),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) {
      const err = new Error(result.error || result.message || 'Error al guardar mazo') as any;
      err.status = response.status;
      err.data = result;
      throw err;
    }
    return result;
  },

  async deleteDeck(deckId: string | number) {
    const response = await fetch(`${API_URL}/decks.php?id=${deckId}`, { 
      method: 'DELETE',
      credentials: 'include' 
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al eliminar mazo');
    return result;
  },

  async likeDeck(deckId: string | number, userId: string | number) {
    const response = await fetch(`${API_URL}/decks.php?action=like&id=${deckId}&user_id=${userId}`, { 
      method: 'POST',
      credentials: 'include' 
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al registrar like');
    return result;
  },

  async createTeam(teamData: any) {
    const response = await fetch(`${API_URL}/teams.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...teamData }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al crear equipo');
    return result;
  },

  async updateTeam(teamId: string, teamData: any) {
    const response = await fetch(`${API_URL}/teams.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: teamId, ...teamData }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al actualizar equipo');
    return result;
  },

  async claimTeam(teamId: string, userId: string) {
    const response = await fetch(`${API_URL}/teams.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', teamId, userId }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al reclamar equipo');
    return result;
  },

  async getPendingTeamClaims() {
    const response = await fetch(`${API_URL}/teams.php?action=get_claims&_t=${Date.now()}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener solicitudes');
    return response.json();
  },

  async getUserPendingClaim(userId: string) {
    try {
      const response = await fetch(`${API_URL}/teams.php?action=get_user_claim&user_id=${userId}`, { credentials: 'include' });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  async resolveTeamClaim(claimId: number | string, resolveAction: 'approve' | 'reject') {
    const response = await fetch(`${API_URL}/teams.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve_claim', claimId, resolveAction }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al procesar solicitud');
    return result;
  },



  async getCountries() {
    const response = await fetch(`${API_URL}/locations.php?action=countries`, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async getRegions(countryId?: string | number) {
    let url = `${API_URL}/locations.php?action=regions`;
    if (countryId) url += `&id_country=${countryId}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async getCities(regionId?: string | number) {
    let url = `${API_URL}/locations.php?action=cities`;
    if (regionId) url += `&id_region=${regionId}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async getUsers() {
    const response = await fetch(`${API_URL}/users.php`, { credentials: 'include' });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },
  
  async getUser(id: string | number) {
    const response = await fetch(`${API_URL}/users.php?id=${id}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener usuario');
    return response.json();
  },

  async registerUser(userData: any) {
    const response = await fetch(`${API_URL}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', ...userData }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al registrar usuario');
    return result;
  },

  async loginUser(credentials: any) {
    const response = await fetch(`${API_URL}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', ...credentials }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al iniciar sesión');
    return result;
  },

  async logoutUser() {
    const response = await fetch(`${API_URL}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
      credentials: 'include'
    });
    return response.json();
  },

  async updateUser(userId: string, userData: any) {
    const response = await fetch(`${API_URL}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: userId, ...userData }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al actualizar usuario');
    return result;
  },


  async deleteTournament(id: string | number) {
    const response = await fetch(`${API_URL}/tournaments.php?id=${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al eliminar torneo');
    return result;
  },

  async getTournaments() {
    const response = await fetch(`${API_URL}/tournaments.php`, { credentials: 'include' });
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    if (Array.isArray(data)) {
      data.forEach((t: any) => {
        if (t.winner_logo === null || t.winner_logo === '' || !t.winner_logo) {
          t.winner_logo = '/imagenes/logos/Escudo.png';
        }
      });
    }
    return data;
  },

  async getTournamentDetail(id: string) {
    const response = await fetch(`${API_URL}/tournaments.php?id=${id}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener el detalle del torneo');
    const data = await response.json();
    if (data) {
      if (data.participants && Array.isArray(data.participants)) {
        data.participants.forEach((p: any) => {
          if (!p.team_logo) p.team_logo = '/imagenes/logos/Escudo.png';
        });
      }
      if (data.matches && Array.isArray(data.matches)) {
        data.matches.forEach((m: any) => {
          if (!m.home_logo) m.home_logo = '/imagenes/logos/Escudo.png';
          if (!m.away_logo) m.away_logo = '/imagenes/logos/Escudo.png';
        });
      }
      if (data.winner && !data.winner.logo_url) {
        data.winner.logo_url = '/imagenes/logos/Escudo.png';
      }
    }
    return data;
  },

  async getTournamentCategories() {
    const response = await fetch(`${API_URL}/tournaments.php?action=get_categories`, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async createTournamentCategory(data: any) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_category', ...data }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al crear la categoría');
    return result;
  },

  async updateTournamentCategory(id: string | number, data: any) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_category', id, ...data }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al actualizar la categoría');
    return result;
  },

  async deleteTournamentCategory(id: string | number) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_category', id }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al eliminar la categoría');
    return result;
  },

  async createTournament(tournamentData: any) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...tournamentData }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al crear torneo');
    return result;
  },

  async updateTournament(id: string | number, tournamentData: any) {
    const payload = tournamentData.action ? tournamentData : { ...tournamentData, action: 'update', id };
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al actualizar el torneo');
    return result;
  },

  async startTournament(id: string | number, seedingMethod: string, seedingParams: any = {}) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start_tournament', id, seeding_method: seedingMethod, seeding_params: seedingParams }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al iniciar torneo');
    return result;
  },

  async rollbackMatch(matchId: string | number) {
    const response = await fetch(`${API_URL}/matches.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rollback_elo', id: matchId }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error en rollback de partido');
    return result;
  },

  async generateSwissRound(tournamentId: string | number) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_swiss_round', id: tournamentId }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al generar la ronda');
    return result;
  },

  async enrollTournament(enrollData: any) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enroll', ...enrollData }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al inscribir equipo');
    return result;
  },

  async linkTournamentDeck(tournamentId: string | number, teamId: string | number, deckId: string | number | null) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'link_deck', tournament_id: tournamentId, team_id: teamId, deck_id: deckId }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al vincular mazo');
    return result;
  },

  async closeTournament(data: any) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', ...data }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al cerrar el torneo');
    return result;
  },

  async removeParticipant(tournamentId: string | number, teamId: string | number) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_participant', tournament_id: tournamentId, team_id: teamId }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al eliminar participante');
    return result;
  },

  async promoteParticipant(tournamentId: string | number, teamId: string | number, increaseMax: boolean = false) {
    const response = await fetch(`${API_URL}/tournaments.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'promote_participant', tournament_id: tournamentId, team_id: teamId, increase_max: increaseMax }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al promover participante');
    return result;
  },

  async getCards(filters?: Record<string, any>): Promise<Card[]> {
    try {
      let url = `${API_URL}/cards.php`;
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== 'Limpiar' && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;

      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching cards:', error);
      return [];
    }
  },

  async addCard(cardData: any) {
    const response = await fetch(`${API_URL}/cards.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardData),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al agregar carta');
    return result;
  },

  async updateCard(id: string, cardData: any) {
    const response = await fetch(`${API_URL}/cards.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...cardData }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al actualizar carta');
    return result;
  },

  async deleteCard(id: string) {
    const response = await fetch(`${API_URL}/cards.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'delete' }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al eliminar carta');
    return result;
  },

  async uploadImage(file: File, folder: string = 'cartas') {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    const response = await fetch(`${API_URL}/upload.php`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  },

  async registerMatch(data: any) {
    const response = await fetch(`${API_URL}/matches.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', ...data }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al registrar partido');
    return result;
  },

  async scheduleMatch(id: number | string, playedAt: string) {
    const response = await fetch(`${API_URL}/matches.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'schedule', id, played_at: playedAt }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al programar partido');
    return result;
  },

  async scheduleMatchesBulk(tournamentId: number | string, playedAt: string, round?: number | 'all') {
    const response = await fetch(`${API_URL}/matches.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'schedule_bulk', tournament_id: tournamentId, played_at: playedAt, round }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al programar partidos en bloque');
    return result;
  },

  async getMatches(): Promise<any[]> {
    const response = await fetch(`${API_URL}/matches.php?_t=${Date.now()}`, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async getHallOfFame(season?: string, mode?: string): Promise<import('../types').HallOfFameResponse> {
    let url = `${API_URL}/hall_of_fame.php`;
    const params = new URLSearchParams();
    if (season) params.append('season', season);
    if (mode) params.append('mode', mode);
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener el Salón de la Fama');
    const data = await response.json();
    if (data && Array.isArray(data.ranking)) {
      data.ranking.forEach((r: any) => {
        if (!r.avatarUrl) {
          r.avatarUrl = '/imagenes/logos/Escudo.png';
        }
      });
    }
    return data;
  },

  async getSeries(tournamentId?: string) {
    let url = `${API_URL}/series.php`; // Asumiendo que existirá o se usará tournaments con filtros
    if (tournamentId) url += `?tournament_id=${tournamentId}`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async getNoticias(limit: number = 12, offset: number = 0, esTitular?: boolean, isAdmin: boolean = false): Promise<Noticia[]> {
    let url = `${API_URL}/noticias.php?limit=${limit}&offset=${offset}`;
    if (esTitular !== undefined) url += `&es_titular=${esTitular ? 1 : 0}`;
    if (isAdmin) url += `&admin=true`;
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async getNoticiaById(id: string): Promise<Noticia> {
    const response = await fetch(`${API_URL}/noticias.php?id=${id}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener la noticia');
    return response.json();
  },

  async createNoticia(data: any) {
    const response = await fetch(`${API_URL}/noticias.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...data }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al crear la noticia');
    return result;
  },

  async updateNoticia(id: string, data: any) {
    const response = await fetch(`${API_URL}/noticias.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, ...data }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al actualizar la noticia');
    return result;
  },

  async deleteNoticia(id: string) {
    const response = await fetch(`${API_URL}/noticias.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al eliminar la noticia');
    return result;
  },

  resolveImageUrl(path: string | undefined): string {
    if (!path) return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018'; 
    
    let cleanPath = path;
    
    // Si la URL es absoluta y pertenece a nuestro servidor de imágenes, la convertimos a relativa
    const domains = [
      'https://cartas.pancorazo.cl',
      'https://pancorazo.cl',
      'https://www.pancorazo.cl',
      window.location.origin
    ];
    for (const domain of domains) {
      if (cleanPath.startsWith(domain)) {
        cleanPath = cleanPath.replace(domain, '');
        break;
      }
    }

    // Si sigue siendo una URL absoluta (de otro dominio), la dejamos tal cual
    if (cleanPath.startsWith('http')) return cleanPath;

    // Normalización de ruta relativa
    cleanPath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;

    // Asegurar el prefijo 'imagenes/' para rutas internas conocidas o genéricas
    const knownFolders = ['logos/', 'banners/', 'profiles/', 'cartas/', 'noticias/', 'documentos/', 'categories/'];
    if (!cleanPath.startsWith('imagenes/')) {
      if (knownFolders.some(f => cleanPath.startsWith(f)) || !cleanPath.includes('/')) {
        cleanPath = 'imagenes/' + cleanPath;
      }
    }

    // Codificación de segmentos para evitar problemas con espacios o caracteres especiales
    const segments = cleanPath.split('/');
    const encodedSegments = segments.map(segment => encodeURIComponent(segment));
    const encodedPath = encodedSegments.join('/');

    return `/${encodedPath}`;
  },

  async globalSearch(query: string) {
    const response = await fetch(`${API_URL}/search.php?q=${encodeURIComponent(query)}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error en la búsqueda');
    return await response.json();
  },

  async requestPasswordReset(email: string) {
    const response = await fetch(`${API_URL}/reset_password.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_reset', email }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al solicitar la recuperación');
    return result;
  },

  async verifyResetToken(token: string) {
    const response = await fetch(`${API_URL}/reset_password.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_token', token }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Token inválido o expirado');
    return result;
  },

  async resetPassword(token: string, password: string) {
    const response = await fetch(`${API_URL}/reset_password.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password', token, password }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Error al restablecer la contraseña');
    return result;
  },

  async getPendingUsers() {
    const response = await fetch(`${API_URL}/users.php?action=get_pending&_t=${Date.now()}`, { credentials: 'include' });
    if (!response.ok) throw new Error('Error al obtener usuarios pendientes');
    return response.json();
  },

  async resolveUserRegistration(userId: string | number, resolveAction: 'approve' | 'reject') {
    const response = await fetch(`${API_URL}/users.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve_registration', userId, resolveAction }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al resolver registro de usuario');
    return result;
  },

  async getSeasons(): Promise<any[]> {
    const response = await fetch(`${API_URL}/seasons.php?_t=${Date.now()}`, { credentials: 'include' });
    if (!response.ok) return [];
    return response.json();
  },

  async getActiveSeason(): Promise<any> {
    const response = await fetch(`${API_URL}/seasons.php?action=active&_t=${Date.now()}`, { credentials: 'include' });
    if (!response.ok) return null;
    return response.json();
  },

  async createSeason(name: string) {
    const response = await fetch(`${API_URL}/seasons.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', name }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al crear la temporada');
    return result;
  },

  async activateSeason(id: number | string) {
    const response = await fetch(`${API_URL}/seasons.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate', id }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al activar la temporada');
    return result;
  },

  async closeSeason(id: number | string) {
    const response = await fetch(`${API_URL}/seasons.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close', id }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al cerrar la temporada');
    return result;
  },

  async updateSeason(id: number | string, data: any) {
    const response = await fetch(`${API_URL}/seasons.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, ...data }),
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Error al actualizar la temporada');
    return result;
  }
};
