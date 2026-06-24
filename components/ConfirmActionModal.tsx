
import React, { useState } from 'react';

interface ConfirmActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    requiresInput?: string; // If provided, user must type this to confirm
    inputPlaceholder?: string;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDangerous = false,
    requiresInput,
    inputPlaceholder = 'Escribe para confirmar...'
}) => {
    const [inputValue, setInputValue] = useState('');

    if (!isOpen) return null;

    const isConfirmDisabled = requiresInput ? inputValue !== requiresInput : false;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="bg-[#121926] border border-white/10 w-full max-w-md relative z-10 overflow-hidden rounded-sm animate-in fade-in zoom-in duration-300">
                {/* Decorative bar */}
                <div className={`h-1 w-full ${isDangerous ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-[#ffd900] shadow-[0_0_15px_rgba(255,217,0,0.3)]'}`}></div>
                
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`size-12 rounded-full flex items-center justify-center ${isDangerous ? 'bg-red-500/10 text-red-500' : 'bg-[#ffd900]/10 text-[#ffd900]'}`}>
                            <span className="material-symbols-outlined text-2xl">
                                {isDangerous ? 'report' : 'help_center'}
                            </span>
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                            {title}
                        </h3>
                    </div>

                    <p className="text-sm text-white/60 leading-relaxed mb-8 font-medium">
                        {message}
                    </p>

                    {requiresInput && (
                        <div className="mb-8 space-y-3">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                Escribe <span className="text-white normal-case">"{requiresInput}"</span> para continuar:
                            </p>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={inputPlaceholder}
                                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-white text-sm outline-none focus:border-[#ffd900]/50 transition-colors"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-white/5 text-white/50 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all rounded-sm border border-white/5"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            disabled={isConfirmDisabled}
                            className={`flex-1 px-6 py-4 font-black text-[10px] uppercase tracking-widest transition-all rounded-sm shadow-xl ${
                                isDangerous 
                                    ? 'bg-red-600 text-white hover:bg-red-500 disabled:opacity-30 disabled:grayscale' 
                                    : 'bg-[#ffd900] text-black hover:bg-[#ffed4d] disabled:opacity-30 disabled:grayscale'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmActionModal;
