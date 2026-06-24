import React from 'react';
import { Tournament } from '../types';
import TournamentSettingsForm from './TournamentSettingsForm';

interface EditTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament;
    onTournamentUpdated: () => void;
}

const EditTournamentModal: React.FC<EditTournamentModalProps> = ({ isOpen, onClose, tournament, onTournamentUpdated }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-[#0d121f] border border-white/10 w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col rounded-sm">
                {/* Header */}
                <div className="p-8 border-b border-white/5 relative shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffd900] to-transparent"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-2 text-[#ffd900] mb-2">
                                <span className="h-[1px] w-8 bg-[#ffd900]"></span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Administración</span>
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Editar Torneo</h2>
                        </div>
                        <button onClick={onClose} className="size-12 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white transition-all hover:rotate-90">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Form Wrapper with scroll */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <TournamentSettingsForm 
                        tournament={tournament} 
                        onTournamentUpdated={() => {
                            onTournamentUpdated();
                            onClose();
                        }} 
                    />
                </div>
            </div>
        </div>
    );
};

export default EditTournamentModal;
