import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Team } from '../types';
import { checkTeamNameSimilarity } from '../utils/teamSimilarity';

interface CreateTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    editingTeam?: Team | null;
    isAdmin?: boolean;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, userId, editingTeam, isAdmin = false }) => {
    const [mode, setMode] = useState<'create' | 'claim' | 'edit'>('create');
    const [teamName, setTeamName] = useState('');
    const [shortName, setShortName] = useState('');
    const [foundedYear, setFoundedYear] = useState(new Date().getFullYear().toString());
    const [noDate, setNoDate] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');

    const [similarityMatch, setSimilarityMatch] = useState<Team | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSimilarityMatch(null);
            if (editingTeam) {
                setMode('edit');
                setTeamName(editingTeam.name || '');
                setShortName(editingTeam.short_name || '');
                setFoundedYear((editingTeam.founded_year || '').toString());
                setLogoFile(null);
                setError('');
            } else {
                setMode('create');
                setTeamName('');
                setShortName('');
                setFoundedYear(new Date().getFullYear().toString());
                setLogoFile(null);
                setError('');
            }
        }
    }, [isOpen, editingTeam]);

    useEffect(() => {
        if (isOpen && mode === 'claim') {
            loadUnclaimedTeams();
        }
    }, [isOpen, mode]);

    const loadUnclaimedTeams = async () => {
        try {
            const teams = await apiService.getTeams(true);
            setAvailableTeams(teams);
        } catch (err) {
            console.error('Error al cargar equipos:', err);
        }
    };

    if (!isOpen) return null;

    const handleClaimInstead = async () => {
        if (!similarityMatch) return;
        setIsLoading(true);
        setError('');
        try {
            await apiService.claimTeam(similarityMatch.id, userId);
            setSimilarityMatch(null);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al reclamar el equipo');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelSimilarity = () => {
        setSimilarityMatch(null);
        setIsLoading(false);
    };

    const handleSubmit = async (e?: React.FormEvent, force: boolean = false) => {
        e?.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (mode === 'create' || mode === 'edit') {
                let logoUrl = mode === 'edit' ? editingTeam?.logo_url || '' : '';
                if (logoFile) {
                    const uploadResult = await apiService.uploadImage(logoFile, 'logos');
                    logoUrl = apiService.resolveImageUrl(uploadResult.url);
                }

                if (mode === 'create') {
                    if (!force) {
                        // Cargar todos los equipos para validar similitud
                        const allTeams = await apiService.getTeams(false, true);
                        const check = checkTeamNameSimilarity(teamName, allTeams);
                        if (check.isSimilar && check.matchedTeam) {
                            setSimilarityMatch(check.matchedTeam);
                            setIsLoading(false);
                            return;
                        }
                    }

                    await apiService.createTeam({
                        name: teamName,
                        short_name: shortName,
                        logo_url: logoUrl,
                        founded_year: noDate ? null : foundedYear,
                        owner_user_id: isAdmin ? null : userId
                    });
                } else if (mode === 'edit' && editingTeam) {
                    await apiService.updateTeam(editingTeam.id, {
                        name: teamName,
                        short_name: shortName,
                        logo_url: logoUrl,
                        founded_year: parseInt(foundedYear)
                    });
                }
            } else {
                if (!selectedTeamId) throw new Error('Debes seleccionar un equipo');
                await apiService.claimTeam(selectedTeamId, userId);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al procesar el equipo');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#1a2332] border border-white/10 rounded-sm w-full max-w-md overflow-hidden shadow-2xl relative"
            >
                {similarityMatch && (() => {
                    const isAvailable = !similarityMatch.owner_user_id || similarityMatch.owner_user_id === '0' || similarityMatch.owner_user_id === '';
                    return (
                        <div className="absolute inset-0 z-50 flex flex-col justify-between bg-[#1a2332] p-6 animate-in fade-in duration-200">
                            <div className="space-y-4 my-auto">
                                <div className="size-12 rounded-full bg-[#ffd900]/10 flex items-center justify-center mx-auto text-[#ffd900] mb-2 animate-bounce">
                                    <span className="material-symbols-outlined text-2xl font-black">warning</span>
                                </div>
                                <h3 className="text-sm font-black text-center uppercase tracking-widest text-[#ffd900]">
                                    Equipo Similar Detectado
                                </h3>
                                <p className="text-xs text-white/70 text-center leading-relaxed">
                                    Ya existe un equipo con el nombre o similar: <span className="font-bold text-white">"{similarityMatch.name}"</span>. 
                                    ¿No estarás pensando en este equipo?
                                </p>
                                
                                {isAvailable ? (
                                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-center">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">¡Disponible para Reclamar!</span>
                                        <span className="text-[9px] text-white/50 block mt-0.5">Este equipo no tiene un propietario asignado actualmente.</span>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm text-center">
                                        <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block">No disponible para reclamar</span>
                                        <span className="text-[9px] text-white/50 block mt-0.5">
                                            Este equipo ya está registrado bajo el propietario: <span className="font-bold text-white">{similarityMatch.owner_name || 'Otro usuario'}</span>.
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-2.5 mt-4">
                                {isAvailable && (
                                    <button
                                        type="button"
                                        onClick={handleClaimInstead}
                                        disabled={isLoading}
                                        className="w-full py-3 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 text-[#101622] text-[10px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm font-black">assignment_ind</span>
                                        Reclamar "{similarityMatch.name}"
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(undefined, true)}
                                    disabled={isLoading}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 rounded-sm"
                                >
                                    Continuar y crear "{teamName}"
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancelSimilarity}
                                    disabled={isLoading}
                                    className="w-full py-2.5 text-white/40 hover:text-white disabled:opacity-50 text-[9px] font-black uppercase tracking-widest transition-all"
                                >
                                    Volver a Editar / Cancelar
                                </button>
                            </div>
                        </div>
                    );
                })()}

                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-sm font-black uppercase tracking-widest text-[#ffd900]">Gestionar Equipo</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mx-6 mt-4">
                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-2">
                    {!editingTeam ? (
                        <>
                            <button
                                onClick={() => setMode('create')}
                                className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${mode === 'create' ? 'border-[#ffd900] text-white bg-white/5' : 'border-transparent text-white/20 hover:text-white/40'
                                    }`}
                            >
                                Crear Equipo
                            </button>
                            <button
                                onClick={() => setMode('claim')}
                                className={`py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${mode === 'claim' ? 'border-[#ffd900] text-white bg-white/5' : 'border-transparent text-white/20 hover:text-white/40'
                                    }`}
                            >
                                Reclamar Equipo
                            </button>
                        </>
                    ) : (
                        <div className="col-span-2 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 border-[#ffd900] text-white bg-white/5 text-center">
                            Editando Equipo: {editingTeam.name}
                        </div>
                    )}
                </div>

                <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4">
                    {mode === 'create' ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Nombre del Equipo</label>
                                    <input
                                        required
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                        placeholder="Ej: Los Galácticos FC"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Abreviación</label>
                                    <input
                                        required
                                        maxLength={5}
                                        value={shortName}
                                        onChange={(e) => setShortName(e.target.value.toUpperCase())}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                        placeholder="Ej: GAL"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">Año de Fundación</label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={noDate}
                                            onChange={(e) => setNoDate(e.target.checked)}
                                            className="hidden"
                                        />
                                        <div className={`size-3 border flex items-center justify-center transition-all ${noDate ? 'bg-[#ffd900] border-[#ffd900]' : 'border-white/20 bg-white/5'}`}>
                                            {noDate && <span className="material-symbols-outlined text-[10px] text-black font-black">check</span>}
                                        </div>
                                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest group-hover:text-white/40">Sin fecha</span>
                                    </label>
                                </div>
                                <input
                                    required={!noDate}
                                    disabled={noDate}
                                    type="number"
                                    value={foundedYear}
                                    onChange={(e) => setFoundedYear(e.target.value)}
                                    className={`w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors ${noDate ? 'opacity-20' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Logo del Equipo</label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-[10px] text-white/40 flex items-center justify-between">
                                        <span>{logoFile ? logoFile.name : 'Ningún archivo seleccionado'}</span>
                                        <label className="cursor-pointer text-[#ffd900] hover:text-white transition-colors underline p-1">
                                            Subir Logo
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Seleccionar Equipo Disponible</label>
                            <select
                                required
                                value={selectedTeamId}
                                onChange={(e) => setSelectedTeamId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-[#1a2332]">-- Selecciona un equipo --</option>
                                {availableTeams.map(team => (
                                    <option key={team.id} value={team.id} className="bg-[#1a2332]">
                                        {team.name} ({team.founded_year})
                                    </option>
                                ))}
                            </select>
                            {availableTeams.length === 0 && (
                                <p className="text-[9px] text-white/20 mt-2 uppercase">No hay equipos disponibles para reclamar</p>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 disabled:cursor-not-allowed text-[#101622] text-[11px] font-black uppercase tracking-widest transition-all mt-4"
                    >
                        {isLoading ? 'Procesando...' : mode === 'edit' ? 'Guardar Cambios' : mode === 'create' ? 'Crear Equipo' : 'Reclamar Equipo'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateTeamModal;
