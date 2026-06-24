import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Team } from '../types';

interface EditTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team | null;
    onTeamUpdated: () => void;
    currentUser: any;
}

const EditTeamModal: React.FC<EditTeamModalProps> = ({ isOpen, onClose, team, onTeamUpdated, currentUser }) => {
    const [teamName, setTeamName] = useState('');
    const [shortName, setShortName] = useState('');
    const [foundedYear, setFoundedYear] = useState('');
    const [noDate, setNoDate] = useState(false);
    const [status, setStatus] = useState<'ACTIVE' | 'HISTORICAL' | 'INACTIVE'>('ACTIVE');
    const [currentElo, setCurrentElo] = useState(1000);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && team) {
            setTeamName(team.name || '');
            setShortName(team.short_name || '');
            const year = team.founded_year;
            setFoundedYear(year ? year.toString() : '');
            setNoDate(!year);
            setStatus((team.status?.toUpperCase() as any) || 'ACTIVE');
            setCurrentElo(team.current_elo || 1000);
            setLogoFile(null);
            setError('');
        }
    }, [isOpen, team]);

    if (!isOpen || !team) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            let logoUrl = team.logo_url;
            if (logoFile) {
                const uploadResult = await apiService.uploadImage(logoFile, 'logos');
                logoUrl = apiService.resolveImageUrl(uploadResult.url);
            }

            await apiService.updateTeam(team.id, {
                name: teamName,
                short_name: shortName,
                logo_url: logoUrl,
                founded_year: noDate ? null : parseInt(foundedYear),
                status: status,
                current_elo: currentElo
            });

            onTeamUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el equipo');
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
                className="bg-[#1a2332] border border-white/10 rounded-sm w-full max-w-md overflow-hidden shadow-2xl"
            >
                <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h2 className="text-sm font-black uppercase tracking-widest text-[#ffd900]">Edición Completa de Equipo</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mx-6 mt-4">
                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Nombre del Equipo</label>
                            <input
                                required
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
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
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">Año Fundación</label>
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
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Estado</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors appearance-none"
                            >
                                <option value="ACTIVE" className="bg-[#1a2332]">Activo</option>
                                <option value="HISTORICAL" className="bg-[#1a2332]">Histórico</option>
                                <option value="INACTIVE" className="bg-[#1a2332]">Inactivo</option>
                            </select>
                        </div>
                        {currentUser?.global_role === 'SUPER_ADMIN' && (
                            <div>
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">ELO Actual</label>
                                <input
                                    required
                                    type="number"
                                    value={currentElo}
                                    onChange={(e) => setCurrentElo(parseInt(e.target.value))}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd900] transition-colors"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">Logo del Equipo</label>
                        <div className="flex items-center gap-4">
                            <div className="size-16 bg-[#0d121f] border border-white/10 flex items-center justify-center overflow-hidden">
                                {logoFile ? (
                                    <img src={URL.createObjectURL(logoFile)} alt="Preview" className="w-full h-full object-contain p-2" />
                                ) : team.logo_url ? (
                                    <img src={apiService.resolveImageUrl(team.logo_url)} alt="Current" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <span className="material-symbols-outlined text-white/10">shield</span>
                                )}
                            </div>
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-sm px-4 py-2 text-[10px] text-white/40 flex items-center justify-between">
                                <span className="truncate max-w-[120px]">{logoFile ? logoFile.name : 'Cambiar logo...'}</span>
                                <label className="cursor-pointer text-[#ffd900] hover:text-white transition-colors underline p-1">
                                    Subir
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

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-[#ffd900] hover:bg-[#ffed4d] disabled:opacity-50 disabled:cursor-not-allowed text-[#101622] text-[11px] font-black uppercase tracking-widest transition-all mt-4 shadow-[0_0_20px_rgba(255,217,0,0.2)]"
                    >
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditTeamModal;
