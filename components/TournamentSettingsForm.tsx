import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Tournament, HighlightRule } from '../types';
import { getContrastColor } from '../utils/formatters';

interface TournamentSettingsFormProps {
    tournament: Tournament;
    onTournamentUpdated: () => void;
}

const TournamentSettingsForm: React.FC<TournamentSettingsFormProps> = ({ tournament, onTournamentUpdated }) => {
    const [name, setName] = useState(tournament.name);
    const [organizerId, setOrganizerId] = useState(tournament.organizer_id || '');
    const [isJo, setIsJo] = useState(tournament.is_jo === 1);
    const [participantType, setParticipantType] = useState(tournament.participant_type);
    const [structure, setStructure] = useState(tournament.structure);
    const [status, setStatus] = useState(tournament.status);
    const [inviteCode, setInviteCode] = useState(tournament.invite_code || '');
    const [matchFormat, setMatchFormat] = useState(tournament.match_format || 'single');
    const [registrationStart, setRegistrationStart] = useState(tournament.registration_start ? tournament.registration_start.substring(0, 10) : '');
    const [registrationEnd, setRegistrationEnd] = useState(tournament.registration_end ? tournament.registration_end.substring(0, 10) : '');
    const [estimatedStart, setEstimatedStart] = useState(tournament.estimated_start ? tournament.estimated_start.substring(0, 10) : '');
    const [prizes, setPrizes] = useState(tournament.prizes || '');
    const [minTeams, setMinTeams] = useState(tournament.min_teams || 2);
    const [maxTeams, setMaxTeams] = useState(tournament.max_teams || 32);
    const [noLimit, setNoLimit] = useState(Number(tournament.max_teams) === 99);
    const [hasThirdPlace, setHasThirdPlace] = useState(Number((tournament as any).has_third_place) === 1);
    const [loading, setLoading] = useState(false);

    const savedUser = localStorage.getItem('user');
    const currentUser = savedUser ? JSON.parse(savedUser) : null;
    const isAdminOrEditor = currentUser?.global_role === 'SUPER_ADMIN' || currentUser?.global_role === 'ADMIN' || currentUser?.global_role === 'EDITOR';

    const [allowedRegions, setAllowedRegions] = useState<number[]>(tournament.allowed_regions || []);
    const [isInvitational, setIsInvitational] = useState(tournament.is_invitational === 1);
    const [tournamentType, setTournamentType] = useState<'pichanga' | 'barrio' | 'ascenso' | 'oro'>((tournament as any).tournament_type || 'barrio');
    const [competitivenessLevel, setCompetitivenessLevel] = useState<'semiprofesional' | 'profesional'>((tournament as any).competitiveness_level || 'semiprofesional');
    const [regions, setRegions] = useState<any[]>([]);

    const [highlightSettings, setHighlightSettings] = useState<HighlightRule[]>(tournament.highlight_settings || []);

    useEffect(() => {
        setName(tournament.name);
        setOrganizerId(tournament.organizer_id || '');
        setIsJo(Number(tournament.is_jo) === 1);
        setParticipantType(tournament.participant_type?.toLowerCase() as any);
        setStructure(tournament.structure?.toLowerCase() as any);
        setStatus(tournament.status?.toLowerCase() as any);
        setInviteCode(tournament.invite_code || '');
        setMatchFormat(tournament.match_format || 'single');
        setRegistrationStart(tournament.registration_start ? tournament.registration_start.substring(0, 10) : '');
        setRegistrationEnd(tournament.registration_end ? tournament.registration_end.substring(0, 10) : '');
        setEstimatedStart(tournament.start_date ? tournament.start_date.substring(0, 10) : (tournament.estimated_start ? tournament.estimated_start.substring(0, 10) : ''));
        setPrizes(tournament.prizes || '');
        setMinTeams(tournament.min_teams || 2);
        setMaxTeams(tournament.max_teams || 32);
        setNoLimit(Number(tournament.max_teams) === 99);
        setHasThirdPlace(Number((tournament as any).has_third_place) === 1);
        setHighlightSettings(tournament.highlight_settings || []);
        setAllowedRegions(tournament.allowed_regions || []);
        setIsInvitational(Number(tournament.is_invitational) === 1);
        setTournamentType((tournament as any).tournament_type || 'barrio');
        setCompetitivenessLevel((tournament as any).competitiveness_level || 'semiprofesional');
    }, [tournament]);

    useEffect(() => {
        apiService.getRegions().then(setRegions).catch(console.error);
    }, []);

    const handleAddHighlightRule = () => {
        setHighlightSettings([...highlightSettings, { start: 1, end: 1, color: '#ffd900', legend: '' }]);
    };

    const handleRemoveHighlightRule = (index: number) => {
        setHighlightSettings(highlightSettings.filter((_, i) => i !== index));
    };

    const handleUpdateHighlightRule = (index: number, field: keyof HighlightRule, value: any) => {
        const newSettings = [...highlightSettings];
        newSettings[index] = { ...newSettings[index], [field]: value };
        setHighlightSettings(newSettings);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiService.updateTournament(tournament.id, {
                name,
                organizer_id: organizerId,
                is_jo: isJo ? 1 : 0,
                participant_type: participantType,
                structure,
                status,
                invite_code: inviteCode || null,
                match_format: matchFormat,
                registration_start: registrationStart || null,
                registration_end: registrationEnd || null,
                start_date: estimatedStart || null,
                prizes,
                min_teams: minTeams,
                max_teams: noLimit ? 99 : maxTeams,
                has_third_place: hasThirdPlace ? 1 : 0,
                banner_url: tournament.banner_url || null,
                rules_url: tournament.rules_url || null,
                highlight_settings: highlightSettings,
                region_id: allowedRegions.length === 1 ? allowedRegions[0] : null,
                allowed_regions: allowedRegions,
                is_invitational: isInvitational ? 1 : 0,
                tournament_type: tournamentType,
                competitiveness_level: competitivenessLevel
            });
            onTournamentUpdated();
            alert('¡Torneo actualizado con éxito!');
        } catch (error) {
            console.error('Error al actualizar torneo:', error);
            alert('Error al actualizar el torneo. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // Lógica de Bloqueos por Estado
    const isLive = status !== 'draft'; // Ya hay inscripciones o está en curso
    const isStarted = status === 'in_progress' || status === 'finished' || status === 'closed'; // El torneo ya comenzó
    const isLockedByLive = isLive;
    const isLockedByStart = isStarted;

    const disabledClasses = "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-white/10";

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sección Básica */}
                <div className="space-y-6 bg-white/5 border border-white/5 p-8 rounded-sm">
                    <div className="flex items-center gap-2 text-[#ffd900] mb-4">
                        <span className="h-[1px] w-6 bg-[#ffd900]"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Información Principal</span>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Nombre del Torneo</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Organizador</label>
                            <select
                                required
                                value={organizerId}
                                disabled={!isAdminOrEditor}
                                onChange={(e) => setOrganizerId(e.target.value)}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none ${disabledClasses}`}
                            >
                                <option value="Kick On Oficial" className="bg-[#0d121f]">Kick On Oficial</option>
                                <option value="Kick On IV Región" className="bg-[#0d121f]">Kick On IV Región</option>
                                <option value="Kick On V Región" className="bg-[#0d121f]">Kick On V Región</option>
                                <option value="Kick On Metropolitana" className="bg-[#0d121f]">Kick On Metropolitana</option>
                                <option value="Novatos" className="bg-[#0d121f]">Novatos</option>
                                <option value="Otros" className="bg-[#0d121f]">Otros</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Estado</label>
                            <select
                                value={status}
                                disabled={!isAdminOrEditor}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-[#ffd900] text-sm font-bold focus:outline-none focus:border-[#ffd900] transition-all appearance-none ${disabledClasses}`}
                            >
                                <option value="draft" className="bg-[#0d121f]">Borrador (Oculto)</option>
                                <option value="open" className="bg-[#0d121f]">Abierto (Inscripciones)</option>
                                <option value="registration_closed" className="bg-[#0d121f]">Inscripciones Cerradas</option>
                                <option value="in_progress" className="bg-[#0d121f]">En Progreso</option>
                                <option value="closed" className="bg-[#0d121f]">Cerrado / Finalizado</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Estructura</label>
                                {isLockedByStart && <span className="text-[8px] font-black text-[#ffd900] uppercase tracking-tighter bg-[#ffd900]/10 px-1 rounded-sm">Bloqueado (En curso)</span>}
                            </div>
                            <select
                                value={structure}
                                disabled={isLockedByStart}
                                onChange={(e) => setStructure(e.target.value as any)}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none ${disabledClasses}`}
                            >
                                <option value="liga" className="bg-[#0d121f]">Liga</option>
                                <option value="copa" className="bg-[#0d121f]">Copa</option>
                                <option value="híbrido" className="bg-[#0d121f]">Híbrido (Grupos + Playoffs)</option>
                                <option value="suizo" className="bg-[#0d121f]">Suizo</option>
                                {isAdminOrEditor && <option value="legacy" className="bg-[#0d121f]">Legacy</option>}
                            </select>
                        </div>
                        {isAdminOrEditor && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Regiones Permitidas (Vacío = Global)</label>
                                <div className="w-full max-h-36 overflow-y-auto bg-black/40 border border-white/10 p-3 rounded-sm space-y-2 custom-scrollbar">
                                    {regions.map((r) => {
                                        const isChecked = allowedRegions.includes(r.id_region);
                                        return (
                                            <div key={r.id_region} className="flex items-center gap-3 py-1 group cursor-pointer" onClick={() => {
                                                if (isChecked) {
                                                    setAllowedRegions(allowedRegions.filter(id => id !== r.id_region));
                                                } else {
                                                    setAllowedRegions([...allowedRegions, r.id_region]);
                                                }
                                            }}>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        readOnly
                                                        className="appearance-none size-4 border border-white/20 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer"
                                                    />
                                                    {isChecked && (
                                                        <span className="material-symbols-outlined absolute pointer-events-none text-black text-[10px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold">check</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-white/70 group-hover:text-white uppercase tracking-wider select-none">{r.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Tipo de Torneo</label>
                            <select
                                value={tournamentType}
                                disabled={!isAdminOrEditor || isLockedByStart}
                                onChange={(e) => setTournamentType(e.target.value as any)}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none ${disabledClasses}`}
                            >
                                <option value="pichanga" className="bg-[#0d121f]">Pichanga (Amistoso)</option>
                                <option value="barrio" className="bg-[#0d121f]">Torneo de Barrio</option>
                                <option value="ascenso" className="bg-[#0d121f]">Copa de Ascenso</option>
                                <option value="oro" className="bg-[#0d121f]">Copa de Oro</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Nivel de Competitividad</label>
                            <select
                                value={competitivenessLevel}
                                onChange={(e) => setCompetitivenessLevel(e.target.value as any)}
                                className="w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none"
                            >
                                <option value="semiprofesional" className="bg-[#0d121f]">Semiprofesional</option>
                                <option value="profesional" className="bg-[#0d121f]">Profesional</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sección Formato y Participación */}
                <div className="space-y-6 bg-white/5 border border-white/5 p-8 rounded-sm">
                    <div className="flex items-center gap-2 text-[#ffd900] mb-4">
                        <span className="h-[1px] w-6 bg-[#ffd900]"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Formato y Reglas</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Tipo Participantes</label>
                                {isLockedByLive && <span className="text-[8px] font-black text-[#ffd900] uppercase tracking-tighter bg-[#ffd900]/10 px-1 rounded-sm">Bloqueado</span>}
                            </div>
                            <select
                                value={participantType}
                                disabled={isLockedByLive}
                                onChange={(e) => setParticipantType(e.target.value as any)}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none ${disabledClasses}`}
                            >
                                <option value="individual">Individual</option>
                                <option value="squad">Squad / Clan</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Formato Partido</label>
                                {isLockedByLive && <span className="text-[8px] font-black text-[#ffd900] uppercase tracking-tighter bg-[#ffd900]/10 px-1 rounded-sm">Bloqueado</span>}
                            </div>
                            <select
                                value={matchFormat}
                                disabled={isLockedByLive}
                                onChange={(e) => setMatchFormat(e.target.value as any)}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all appearance-none ${disabledClasses}`}
                            >
                                <option value="single">Partido Único</option>
                                <option value="home_away">Ida y Vuelta</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Min Equipos</label>
                            <input
                                type="number"
                                min="2"
                                disabled={isLockedByStart}
                                value={minTeams}
                                onChange={(e) => setMinTeams(parseInt(e.target.value))}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all ${disabledClasses}`}
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Max Equipos</label>
                                {!isLockedByStart && (
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={noLimit}
                                            onChange={(e) => setNoLimit(e.target.checked)}
                                            className="size-3 accent-[#ffd900]"
                                        />
                                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Sin máximo</span>
                                    </label>
                                )}
                                {isLockedByStart && <span className="text-[8px] font-black text-[#ffd900] uppercase tracking-tighter bg-[#ffd900]/10 px-1 rounded-sm">Bloqueado</span>}
                            </div>
                            <input
                                type="number"
                                disabled={noLimit || isLockedByStart}
                                min="2"
                                value={noLimit ? '' : maxTeams}
                                onChange={(e) => setMaxTeams(parseInt(e.target.value))}
                                placeholder={noLimit ? '∞' : ''}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all ${(noLimit || isLockedByStart) ? 'opacity-30 cursor-not-allowed' : ''}`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`flex items-center gap-4 p-4 bg-black/40 border border-white/5 group transition-all hover:border-[#ffd900]/30 rounded-sm ${(!isAdminOrEditor || isLockedByLive) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_jo_edit_form"
                                    checked={isJo}
                                    disabled={!isAdminOrEditor || isLockedByLive}
                                    onChange={(e) => setIsJo(e.target.checked)}
                                    className={`peer appearance-none size-6 border-2 border-white/10 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer ${disabledClasses}`}
                                />
                                <span className="material-symbols-outlined absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-black text-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
                            </div>
                            <label htmlFor="is_jo_edit_form" className={`flex-1 ${(!isAdminOrEditor || isLockedByLive) ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <div className="text-[11px] font-black text-white uppercase tracking-tighter leading-none">Juego Organizado (JO)</div>
                                {!isAdminOrEditor ? (
                                    <div className="text-[7px] text-[#ffd900] uppercase font-bold mt-1">Solo Administradores</div>
                                ) : isLockedByLive ? (
                                    <div className="text-[7px] text-[#ffd900] uppercase font-bold mt-1">No editable post-borrador</div>
                                ) : null}
                            </label>
                        </div>

                        <div className={`flex items-center gap-4 p-4 bg-black/40 border border-white/5 group transition-all hover:border-[#ffd900]/30 rounded-sm ${(!isAdminOrEditor || isLockedByLive) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    id="is_invitational_edit_form"
                                    checked={isInvitational}
                                    disabled={!isAdminOrEditor || isLockedByLive}
                                    onChange={(e) => setIsInvitational(e.target.checked)}
                                    className={`peer appearance-none size-6 border-2 border-white/10 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer ${disabledClasses}`}
                                />
                                <span className="material-symbols-outlined absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-black text-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
                            </div>
                            <label htmlFor="is_invitational_edit_form" className={`flex-1 ${(!isAdminOrEditor || isLockedByLive) ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <div className="text-[11px] font-black text-white uppercase tracking-tighter leading-none">Invitacional</div>
                                <div className="text-[9px] text-white/40 uppercase mt-1">No rompe racha a no participantes.</div>
                            </label>
                        </div>

                        {(structure === 'copa' || structure === 'híbrido' || structure === 'hibrido') && (
                            <div className={`flex items-center gap-4 p-4 bg-black/40 border border-white/5 group transition-all hover:border-[#ffd900]/30 rounded-sm ${isLockedByLive ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        id="has_third_place_edit_form"
                                        checked={hasThirdPlace}
                                        disabled={isLockedByLive}
                                        onChange={(e) => setHasThirdPlace(e.target.checked)}
                                        className=" peer appearance-none size-6 border-2 border-white/10 rounded-sm bg-transparent checked:bg-[#ffd900] checked:border-[#ffd900] transition-all cursor-pointer"
                                    />
                                    <span className="material-symbols-outlined absolute pointer-events-none opacity-0 peer-checked:opacity-100 text-black text-sm left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold transition-opacity">check</span>
                                </div>
                                <label htmlFor="has_third_place_edit_form" className={`flex-1 ${isLockedByLive ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <div className="text-[11px] font-black text-white uppercase tracking-tighter leading-none">3er Puesto</div>
                                    {isLockedByLive && <div className="text-[7px] text-[#ffd900] uppercase font-bold mt-1">Afecta fixture de llaves</div>}
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Premios</label>
                        <input
                            type="text"
                            value={prizes}
                            onChange={(e) => setPrizes(e.target.value)}
                            placeholder="Ej: gloria eterna, 1000 Oro..."
                            className="w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all"
                        />
                    </div>
                </div>

                {/* Sección Tiempos y Acceso */}
                <div className="space-y-6 bg-white/5 border border-white/5 p-8 rounded-sm">
                    <div className="flex items-center gap-2 text-[#ffd900] mb-4">
                        <span className="h-[1px] w-6 bg-[#ffd900]"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Cronograma y Acceso</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Inicio Inscripción</label>
                            <input
                                type="date"
                                value={registrationStart}
                                disabled={isLockedByStart}
                                onChange={(e) => setRegistrationStart(e.target.value)}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all [color-scheme:dark] ${disabledClasses}`}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Fin Inscripción</label>
                            <input
                                type="date"
                                value={registrationEnd}
                                disabled={isLockedByStart}
                                onChange={(e) => setRegistrationEnd(e.target.value)}
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all [color-scheme:dark] ${disabledClasses}`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Inicio Torneo</label>
                            <input
                                type="date"
                                value={estimatedStart}
                                onChange={(e) => setEstimatedStart(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all [color-scheme:dark]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Código Invitación</label>
                            <input
                                type="text"
                                value={inviteCode}
                                disabled={isLockedByStart}
                                onChange={(e) => setInviteCode(e.target.value)}
                                placeholder="Opcional"
                                className={`w-full bg-black/40 border border-white/10 p-4 text-white text-sm focus:outline-none focus:border-[#ffd900] transition-all ${disabledClasses}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Sección Resaltado */}
                <div className="space-y-6 bg-white/5 border border-white/5 p-8 rounded-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-[#ffd900]">
                            <span className="h-[1px] w-6 bg-[#ffd900]"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Resaltado de Posiciones</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddHighlightRule}
                            className="text-[9px] font-black text-white/60 hover:text-[#ffd900] uppercase tracking-widest flex items-center gap-1 transition-all hover:scale-105"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Agregar Regla
                        </button>
                    </div>

                    {highlightSettings.length === 0 && (
                        <div className="py-10 text-center bg-black/20 border border-dashed border-white/10 rounded-sm w-full">
                            <span className="material-symbols-outlined text-white/10 text-4xl mb-2">format_paint</span>
                            <p className="text-[9px] text-white/20 italic uppercase tracking-widest">Sin reglas configuradas</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {highlightSettings.map((rule, idx) => (
                            <div key={idx} className="bg-black/40 p-5 border border-white/10 space-y-4 relative group/rule rounded-sm hover:border-[#ffd900]/20 transition-all">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveHighlightRule(idx)}
                                    className="absolute top-2 right-2 size-6 flex items-center justify-center text-white/20 hover:text-red-500 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                                
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Leyenda (Ej: Clasifica a Libertadores)</label>
                                    <input
                                        type="text"
                                        value={rule.legend || ''}
                                        onChange={(e) => handleUpdateHighlightRule(idx, 'legend', e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 p-2 text-white text-xs focus:outline-none focus:border-[#ffd900] rounded-sm uppercase font-bold"
                                        placeholder="EXPLICACIÓN DEL COLOR..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Desde</label>
                                        <input
                                            type="number"
                                            value={rule.start}
                                            onChange={(e) => handleUpdateHighlightRule(idx, 'start', parseInt(e.target.value))}
                                            className="w-full bg-black/60 border border-white/10 p-2 text-white text-xs focus:outline-none focus:border-[#ffd900] rounded-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest ml-1">Hasta</label>
                                        <input
                                            type="number"
                                            value={rule.end}
                                            onChange={(e) => handleUpdateHighlightRule(idx, 'end', parseInt(e.target.value))}
                                            className="w-full bg-black/60 border border-white/10 p-2 text-white text-xs focus:outline-none focus:border-[#ffd900] rounded-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[8px] font-black text-white/40 uppercase tracking-widest">Color de Fondo</label>
                                        <div className="size-3 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: rule.color }}></div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {[
                                            '#ffd900', // Amarillo
                                            '#00ff88', // Verde
                                            '#0088ff', // Azul
                                            '#ff4444', // Rojo
                                            '#ff8800', // Naranja
                                            '#aa00ff', // Púrpura
                                            '#00ffff', // Cyan
                                            '#ff00ff', // Magenta
                                            '#ffffff'  // Blanco
                                        ].map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => handleUpdateHighlightRule(idx, 'color', c)}
                                                className={`size-6 rounded border ${rule.color === c ? 'border-white scale-110 shadow-lg' : 'border-white/10 opacity-60 hover:opacity-100 hover:scale-105'} transition-all`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>

                                    <div className="relative group/picker">
                                        <input
                                            type="color"
                                            value={rule.color}
                                            onChange={(e) => handleUpdateHighlightRule(idx, 'color', e.target.value)}
                                            className="w-full h-10 bg-black/40 border border-white/10 cursor-pointer rounded-sm hover:border-[#ffd900]/50 transition-colors"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5 group-hover/picker:bg-[#ffd900]/30 transition-colors"></div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <p className="text-[7px] font-black text-white/20 uppercase tracking-tighter mb-1.5 italic text-center">Previsualización (Texto Automático)</p>
                                    <div 
                                        className="w-full py-3 px-4 text-[10px] font-black uppercase italic flex items-center justify-center border border-white/10 rounded-sm shadow-xl transition-all"
                                        style={{ backgroundColor: rule.color, color: getContrastColor(rule.color) }}
                                    >
                                        {rule.legend || `EJEMPLO POS ${rule.start} - ${rule.end}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={loading || !name}
                    className={`px-12 py-5 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 rounded-sm ${loading || !name
                        ? 'bg-white/5 text-white/10 cursor-not-allowed'
                        : 'bg-[#ffd900] text-black hover:scale-105 shadow-[0_0_40px_rgba(255,217,0,0.2)]'
                        }`}
                >
                    {loading ? (
                        <div className="size-4 border-2 border-black/20 border-t-black animate-spin rounded-full"></div>
                    ) : (
                        <span className="material-symbols-outlined text-lg">save</span>
                    )}
                    GUARDAR TODA LA CONFIGURACIÓN
                </button>
            </div>
        </form>
    );
};

export default TournamentSettingsForm;
