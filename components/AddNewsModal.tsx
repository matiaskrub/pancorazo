import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { Noticia } from '../types';

interface AddNewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Noticia | null;
}

const AddNewsModal: React.FC<AddNewsModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [savedRange, setSavedRange] = useState<Range | null>(null);

    const [formData, setFormData] = useState({
        titular: '',
        bajada: '',
        categoria: 'General',
        es_titular: 0,
        status: 'Borrador' as 'Borrador' | 'Publicado'
    });

    useEffect(() => {
        if (initialData && isOpen) {
            setFormData({
                titular: initialData.titular || '',
                bajada: initialData.bajada || '',
                categoria: initialData.categoria || 'General',
                es_titular: Number(initialData.es_titular) || 0,
                status: initialData.status || 'Borrador'
            });
            setPreviewUrl(apiService.resolveImageUrl(initialData.foto));
            if (editorRef.current) {
                editorRef.current.innerHTML = initialData.texto || '';
            }
        } else if (isOpen) {
            setFormData({
                titular: '',
                bajada: '',
                categoria: 'General',
                es_titular: 0,
                status: 'Borrador'
            });
            setPreviewUrl(null);
            setImageFile(null);
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
        }
    }, [initialData, isOpen]);

    // Update editor content when initialData changes but ref is already rendered
    useEffect(() => {
        if (initialData && editorRef.current) {
            editorRef.current.innerHTML = initialData.texto || '';
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? ((e.target as HTMLInputElement).checked ? 1 : 0) : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const execCommand = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            return sel.getRangeAt(0);
        }
        return null;
    };

    const restoreSelection = (range: Range | null) => {
        if (range) {
            const sel = window.getSelection();
            if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    };

    const handleInsertImageClick = () => {
        const range = saveSelection();
        setSavedRange(range);
        fileInputRef.current?.click();
    };

    const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLoading(true);
            try {
                const uploadRes = await apiService.uploadImage(file, 'noticias');
                if (uploadRes.status === 'success') {
                    const imageUrl = apiService.resolveImageUrl(uploadRes.url);
                    restoreSelection(savedRange);
                    if (editorRef.current) {
                        editorRef.current.focus();
                    }
                    execCommand('insertImage', imageUrl);
                } else {
                    alert('Error al subir la imagen: ' + uploadRes.message);
                }
            } catch (err: any) {
                alert('Error al subir la imagen: ' + err.message);
            } finally {
                setLoading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleSubmit = async (publishStatus?: 'Borrador' | 'Publicado') => {
        setLoading(true);
        try {
            let finalImageUrl = initialData?.foto || '';
            
            if (imageFile) {
                const uploadRes = await apiService.uploadImage(imageFile, 'noticias');
                if (uploadRes.status === 'success') {
                    finalImageUrl = uploadRes.url;
                } else {
                    throw new Error(uploadRes.message || 'Error al subir la imagen');
                }
            }

            const payload = {
                ...formData,
                foto: finalImageUrl,
                texto: editorRef.current?.innerHTML || '',
                status: publishStatus || formData.status
            };

            if (initialData?.id) {
                await apiService.updateNoticia(initialData.id, payload);
            } else {
                await apiService.createNoticia(payload);
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            alert('Error al guardar la noticia: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-[#101622] border border-white/10 rounded-sm w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-[#ffd900]">newspaper</span>
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
                            {initialData ? 'EDITAR NOTICIA' : 'NUEVA NOTICIA'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Columna Izquierda: Datos e Imagen */}
                        <div className="lg:col-span-1 space-y-8">
                            {/* Imagen de Portada */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Imagen de Portada</label>
                                <div className="relative aspect-video bg-black/40 border border-white/10 rounded-sm overflow-hidden group cursor-pointer">
                                    {previewUrl ? (
                                        <>
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setImageFile(null);
                                                    setPreviewUrl(null);
                                                    if (initialData) {
                                                        initialData.foto = '';
                                                    }
                                                }}
                                                className="absolute top-2 right-2 size-8 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all shadow-lg z-20 hover:scale-105 active:scale-95"
                                                title="Eliminar portada"
                                            >
                                                <span className="material-symbols-outlined text-sm font-bold">delete</span>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
                                            <span className="material-symbols-outlined text-4xl mb-2">add_a_photo</span>
                                            <span className="text-[9px] font-bold uppercase">Subir Foto</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <span className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest">Cambiar Imagen</span>
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                        onChange={handleImageChange}
                                    />
                                </div>
                            </div>

                            {/* Categoría y Titular */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Categoría</label>
                                    <select
                                        name="categoria"
                                        value={formData.categoria}
                                        onChange={handleInputChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white focus:border-[#ffd900] outline-none transition-all uppercase font-bold"
                                    >
                                        <option value="General">General</option>
                                        <option value="Torneos">Torneos</option>
                                        <option value="Cartas">Cartas</option>
                                        <option value="Comunidades">Comunidades</option>
                                        <option value="Anuncios">Anuncios</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer group p-4 bg-white/2 border border-white/5 rounded-sm hover:border-[#ffd900]/30 transition-all">
                                        <input
                                            type="checkbox"
                                            name="es_titular"
                                            checked={formData.es_titular === 1}
                                            onChange={handleInputChange}
                                            className="size-5 bg-white/5 border border-white/20 rounded-sm accent-[#ffd900]"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white uppercase tracking-widest group-hover:text-[#ffd900] transition-colors">Marcar como Titular</span>
                                            <span className="text-[9px] text-white/30 font-bold uppercase mt-1">Aparecerá en el slider principal</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Editorial */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Titular de la Noticia</label>
                                <textarea
                                    required
                                    name="titular"
                                    value={formData.titular}
                                    onChange={handleInputChange}
                                    rows={2}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-6 py-4 text-2xl font-black italic text-white placeholder:text-white/5 focus:border-[#ffd900] outline-none transition-all resize-none leading-tight tracking-tighter"
                                    placeholder="ESCRIBE EL TITULAR IMPACTANTE AQUÍ..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Bajada (Resumen corto)</label>
                                <textarea
                                    name="bajada"
                                    value={formData.bajada}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-sm px-6 py-4 text-base font-medium text-white/60 placeholder:text-white/5 focus:border-[#ffd900] outline-none transition-all resize-none leading-relaxed"
                                    placeholder="Escribe un breve resumen que enganche al lector..."
                                />
                            </div>

                            {/* Editor de Texto Enriquecido */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Cuerpo de la Noticia</label>
                                <div className="border border-white/10 rounded-sm overflow-hidden flex flex-col min-h-[400px]">
                                    {/* Toolbar */}
                                    <div className="bg-white/5 border-b border-white/5 p-2 flex flex-wrap gap-1">
                                        <ToolbarButton icon="format_bold" onClick={() => execCommand('bold')} title="Negrita" />
                                        <ToolbarButton icon="format_italic" onClick={() => execCommand('italic')} title="Cursiva" />
                                        <ToolbarButton icon="format_underlined" onClick={() => execCommand('underline')} title="Subrayado" />
                                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                                        <ToolbarButton icon="format_align_left" onClick={() => execCommand('justifyLeft')} title="Izquierda" />
                                        <ToolbarButton icon="format_align_center" onClick={() => execCommand('justifyCenter')} title="Centro" />
                                        <ToolbarButton icon="format_align_right" onClick={() => execCommand('justifyRight')} title="Derecha" />
                                        <ToolbarButton icon="format_align_justify" onClick={() => execCommand('justifyFull')} title="Justificado" />
                                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                                        <ToolbarButton icon="format_list_bulleted" onClick={() => execCommand('insertUnorderedList')} title="Lista" />
                                        <ToolbarButton icon="format_list_numbered" onClick={() => execCommand('insertOrderedList')} title="Lista Num" />
                                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                                        <ToolbarButton icon="link" onClick={() => {
                                            const url = prompt('Ingresa la URL:');
                                            if (url) execCommand('createLink', url);
                                        }} title="Enlace" />
                                        <ToolbarButton icon="image" onClick={handleInsertImageClick} title="Insertar Imagen" />
                                        <ToolbarButton icon="format_clear" onClick={() => execCommand('removeFormat')} title="Limpiar Formato" />
                                    </div>
                                    
                                    {/* ContentEditable Area */}
                                    <div 
                                        ref={editorRef}
                                        contentEditable
                                        className="flex-1 p-6 bg-white/2 min-h-[300px] text-white/80 prose prose-invert prose-yellow max-w-none focus:outline-none focus:bg-white/[0.03] transition-colors overflow-y-auto"
                                        placeholder="Escribe el desarrollo de la noticia aquí..."
                                    ></div>
                                    <input 
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleInlineImageUpload}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-white/5 bg-white/2 flex justify-between items-center">
                    <button 
                        onClick={onClose}
                        className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        CANCELAR
                    </button>
                    
                    <div className="flex gap-4">
                        <button
                            disabled={loading}
                            onClick={() => handleSubmit('Borrador')}
                            className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            {loading ? 'PROCESANDO...' : 'GUARDAR BORRADOR'}
                        </button>
                        <button
                            disabled={loading}
                            onClick={() => handleSubmit('Publicado')}
                            className="px-10 py-4 bg-[#ffd900] hover:bg-[#ffed4d] text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-[#ffd900]/10"
                        >
                            {loading ? 'PROCESANDO...' : initialData ? 'ACTUALIZAR Y PUBLICAR' : 'PUBLICAR AHORA'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToolbarButton: React.FC<{ icon: string; onClick: () => void; title: string }> = ({ icon, onClick, title }) => (
    <button
        type="button"
        onMouseDown={(e) => {
            e.preventDefault(); // Prevenir pérdida de foco
            onClick();
        }}
        title={title}
        className="p-2 hover:bg-white/10 text-white/60 hover:text-[#ffd900] rounded-sm transition-all"
    >
        <span className="material-symbols-outlined text-lg">{icon}</span>
    </button>
);

export default AddNewsModal;
