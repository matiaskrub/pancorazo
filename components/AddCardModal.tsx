import React, { useState } from 'react';
import { apiService } from '../services/api';

interface AddCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCardAdded: () => void;
    initialData?: any;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ isOpen, onClose, onCardAdded, initialData }) => {
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const NATIONALITIES = ['Chile', 'Argentina', 'Brasil', 'Bolivia', 'Uruguay', 'Perú', 'Colombia', 'Palestina', 'Italia', 'Japón'];
    const SHIRT_COLORS = ['Negro', 'Blanco', 'Verde', 'Azul', 'Amarillo', 'Rojo', 'Sin color', 'De Selección'];

    const [formData, setFormData] = useState({
        name: '',
        type: 'Jugador',
        rarity: 'Amateur',
        position: 'DL',
        stats_attack: 0,
        stats_defense: 0,
        ability_text: '',
        has_errata: 0,
        errata_text: '',
        gender: 'Masculino',
        cost: 0,
        category: 'adulto',
        ability: 'Sin habilidad',
        edition: 'El Debut',
        has_x_cost: 0,
        is_unlimited: 0,
        is_hero: 0,
        is_fan: 0
    });

    const [selectedNationalities, setSelectedNationalities] = useState<string[]>(['Chile']);
    const [selectedShirtColors, setSelectedShirtColors] = useState<string[]>(['Sin color']);
    const [isSeleccion, setIsSeleccion] = useState(false);

    React.useEffect(() => {
        if (initialData && isOpen) {
            setFormData({
                name: initialData.name || '',
                type: initialData.type || 'Jugador',
                rarity: initialData.rarity || 'Amateur',
                position: initialData.position || 'DL',
                stats_attack: initialData.stats_attack || 0,
                stats_defense: initialData.stats_defense || 0,
                ability_text: initialData.ability_text || '',
                has_errata: initialData.has_errata || 0,
                errata_text: initialData.errata_text || '',
                gender: initialData.gender || 'Masculino',
                cost: initialData.cost || 0,
                category: initialData.category || 'adulto',
                ability: initialData.ability || 'Sin habilidad',
                edition: initialData.edition || 'El Debut',
                has_x_cost: Number(initialData.has_x_cost) || 0,
                is_unlimited: Number(initialData.is_unlimited) || 0,
                is_hero: Number(initialData.is_hero) || 0,
                is_fan: Number(initialData.is_fan) || 0
            });
            if (initialData.nationality) {
                setSelectedNationalities(initialData.nationality.split(',').map((n: string) => n.trim()));
            } else {
                setSelectedNationalities(['Chile']);
            }
            if (initialData.shirt_color === 'Selección') {
                setIsSeleccion(true);
                setSelectedShirtColors([]);
            } else if (initialData.shirt_color) {
                setIsSeleccion(false);
                setSelectedShirtColors(initialData.shirt_color.split(',').map((c: string) => c.trim()));
            } else {
                setIsSeleccion(false);
                setSelectedShirtColors(['Sin color']);
            }
            if (initialData.image_url) {
                setPreviewUrl(apiService.resolveImageUrl(initialData.image_url));
            } else {
                setPreviewUrl(null);
            }
        } else if (isOpen) {
            // Reset to defaults when opening for ADD
            setFormData({
                name: '',
                type: 'Jugador',
                rarity: 'Amateur',
                position: 'DL',
                stats_attack: 0,
                stats_defense: 0,
                ability_text: '',
                has_errata: 0,
                errata_text: '',
                gender: 'Masculino',
                cost: 0,
                category: 'adulto',
                ability: 'Sin habilidad',
                edition: 'El Debut',
                has_x_cost: 0,
                is_unlimited: 0,
                is_hero: 0,
                is_fan: 0
            });
            setSelectedNationalities(['Chile']);
            setSelectedShirtColors(['Sin color']);
            setIsSeleccion(false);
            setPreviewUrl(null);
            setImageFile(null);
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let imageUrl = '';
            if (imageFile) {
                const uploadRes = await apiService.uploadImage(imageFile);
                if (uploadRes.status === 'success') {
                    imageUrl = uploadRes.url;
                } else {
                    throw new Error(uploadRes.message || 'Error al subir la imagen');
                }
            }

            const isPlayer = formData.type === 'Jugador';

            const cardData = {
                ...formData,
                image_url: imageUrl || (initialData?.image_url ? initialData.image_url : ''),
                // Campos condicionales: si no es jugador, se envían vacíos/nulos
                nationality: isPlayer ? selectedNationalities.join(', ') : '',
                shirt_color: (isPlayer || formData.is_fan === 1) ? (isSeleccion ? 'Selección' : selectedShirtColors.join(', ')) : '',
                position: isPlayer ? formData.position : '',
                stats_attack: isPlayer ? formData.stats_attack : null,
                stats_defense: isPlayer ? formData.stats_defense : null,
                gender: isPlayer ? formData.gender : '',
                category: isPlayer ? formData.category : '',
                ability: isPlayer ? formData.ability : '',
                has_x_cost: formData.has_x_cost === 1 ? 1 : 0,
                is_unlimited: formData.is_unlimited === 1 ? 1 : 0,
                is_hero: formData.is_hero === 1 ? 1 : 0,
                is_fan: formData.is_fan === 1 ? 1 : 0
            };

            if (initialData?.id) {
                await apiService.updateCard(initialData.id, cardData);
            } else {
                await apiService.addCard(cardData);
            }

            onCardAdded();
            onClose();
            // Reset form
            setFormData({
                name: '',
                type: 'Jugador',
                rarity: 'Amateur',
                position: 'DL',
                stats_attack: 0,
                stats_defense: 0,
                ability_text: '',
                has_errata: 0,
                errata_text: '',
                gender: 'Masculino',
                cost: 0,
                category: 'adulto',
                ability: 'Sin habilidad',
                edition: 'El Debut',
                has_x_cost: 0,
                is_unlimited: 0,
                is_hero: 0,
                is_fan: 0
            });
            setSelectedNationalities(['Chile']);
            setSelectedShirtColors(['Sin color']);
            setIsSeleccion(false);
            setImageFile(null);
            setPreviewUrl(null);
        } catch (error) {
            console.error('Error al guardar carta:', error);
            alert(`No se pudo guardar la carta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#1a2235] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Left Side: Preview */}
                <div className="md:w-1/3 bg-[#111827] p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
                    <h3 className="text-[#ffd900] font-black text-xs uppercase tracking-[0.2em] mb-8">VISTA PREVIA</h3>
                    <div className="w-full aspect-[2.5/3.5] bg-[#0a0f1a] rounded-xl border-2 border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center text-white/20">
                                <span className="material-symbols-outlined text-5xl mb-2">image</span>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Sin Imagen</span>
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-4">
                            <div className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-1">{formData.rarity}</div>
                            <div className="text-sm font-bold text-white uppercase truncate">{formData.name || 'NOMBRE DE LA CARTA'}</div>
                        </div>
                    </div>
                    {formData.type === 'Jugador' && (
                        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col items-center">
                                <span className="text-[10px] text-white/40 font-bold uppercase mb-1">ATK</span>
                                <span className="text-xl font-black text-white">{formData.stats_attack}</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex flex-col items-center">
                                <span className="text-[10px] text-white/40 font-bold uppercase mb-1">DEF</span>
                                <span className="text-xl font-black text-white">{formData.stats_defense}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Form */}
                <div className="md:w-2/3 p-8 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                            {initialData ? 'EDITAR CARTA' : 'AGREGAR NUEVA CARTA'}
                        </h2>
                        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nombre de la Carta</label>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#ffd900]/50 outline-none transition-all font-medium"
                                    placeholder="Ej: Lionel Messi"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Imagen de la Carta</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="w-full bg-white/5 border border-dashed border-white/20 rounded-lg px-4 py-3 text-white/40 flex items-center gap-2 group-hover:border-[#ffd900]/30 transition-all">
                                        <span className="material-symbols-outlined text-lg">upload</span>
                                        <span className="text-xs font-bold uppercase truncate">{imageFile ? imageFile.name : 'Seleccionar Archivo'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Tipo de Carta</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#ffd900]/50 outline-none transition-all font-medium appearance-none"
                                >
                                    <option value="Jugador">Jugador</option>
                                    <option value="Jugada">Jugada</option>
                                    <option value="Foul">Foul</option>
                                    <option value="Estrategia">Estrategia</option>
                                    <option value="Hinchada">Hinchada</option>
                                    <option value="Estadio">Estadio</option>
                                    <option value="Energía">Energía</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Rareza</label>
                                <select
                                    name="rarity"
                                    value={formData.rarity}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#ffd900]/50 outline-none transition-all font-medium appearance-none"
                                >
                                    <option value="Amateur">Amateur</option>
                                    <option value="Semiprofesional">Semiprofesional</option>
                                    <option value="Profesional">Profesional</option>
                                    <option value="Clase Mundial">Clase Mundial</option>
                                    <option value="Leyenda">Leyenda</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Costo (Energía)</label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            name="has_x_cost"
                                            checked={formData.has_x_cost === 1}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                has_x_cost: e.target.checked ? 1 : 0,
                                                cost: e.target.checked ? 0 : prev.cost
                                            }))}
                                            className="size-3 bg-white/5 border border-white/20 rounded-sm accent-[#ffd900]"
                                        />
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest group-hover:text-[#ffd900] transition-colors">Sin coste</span>
                                    </label>
                                </div>
                                <input
                                    type="number"
                                    name="cost"
                                    value={formData.cost}
                                    onChange={handleInputChange}
                                    disabled={formData.has_x_cost === 1}
                                    className={`w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none transition-all ${formData.has_x_cost === 1 ? 'opacity-30 grayscale cursor-not-allowed' : 'focus:border-[#ffd900]/50'}`}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Edición</label>
                                <select
                                    name="edition"
                                    value={formData.edition}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none outline-none"
                                >
                                    <option value="El Debut">El Debut</option>
                                    <option value="Clase Mundial">Clase Mundial</option>
                                    <option value="JO">JO</option>
                                    <option value="KOIV">KOIV</option>
                                    <option value="KOVR">KOVR</option>
                                </select>
                            </div>

                            <div className="space-y-4 col-span-full border-t border-white/5 pt-6 mt-2">
                                <label className="text-[10px] font-black text-[#ffd900] uppercase tracking-widest mb-4 block">Configuraciones Especiales</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_unlimited === 1}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_unlimited: e.target.checked ? 1 : 0 }))}
                                                className="size-5 bg-white/5 border border-white/20 rounded-sm accent-emerald-500 shadow-lg"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Sin límite de copias</span>
                                                <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider">Permite agregar cualquier cantidad al mazo</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="bg-[#ffd900]/5 p-4 rounded-xl border border-[#ffd900]/10">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_hero === 1}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_hero: e.target.checked ? 1 : 0 }))}
                                                className="size-5 bg-white/5 border border-white/20 rounded-sm accent-[#ffd900] shadow-lg"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white uppercase tracking-widest group-hover:text-[#ffd900] transition-colors">Destacar en Hero</span>
                                                <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider">Muestra esta carta en la rotación de la Home</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_fan === 1}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_fan: e.target.checked ? 1 : 0 }))}
                                                className="size-5 bg-white/5 border border-white/20 rounded-sm accent-red-500 shadow-lg"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white uppercase tracking-widest group-hover:text-red-400 transition-colors">Es Carta FAN</span>
                                                <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider">Restringe esta carta al formato Fanático y un color</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {formData.type === 'Jugador' && (
                                <>
                                    <div className="space-y-2 col-span-full">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nacionalidades (Selección Múltiple)</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-white/5 p-4 rounded-xl border border-white/10">
                                            {NATIONALITIES.map(nat => (
                                                <button
                                                    key={nat}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedNationalities(prev =>
                                                            prev.includes(nat)
                                                                ? prev.filter(n => n !== nat)
                                                                : [...prev, nat]
                                                        );
                                                    }}
                                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${selectedNationalities.includes(nat)
                                                        ? 'bg-[#ffd900] text-black border-[#ffd900]'
                                                        : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    {nat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Género</label>
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none outline-none"
                                        >
                                            <option value="Masculino">Masculino</option>
                                            <option value="Femenino">Femenino</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Categoría</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none outline-none"
                                        >
                                            <option value="adulto">Adulto</option>
                                            <option value="sub 23">Sub 23</option>
                                            <option value="sub 20">Sub 20</option>
                                            <option value="sub 18">Sub 18</option>
                                            <option value="sub 15">Sub 15</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Habilidad</label>
                                        <select
                                            name="ability"
                                            value={formData.ability}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none outline-none"
                                        >
                                            <option value="">Sin habilidad</option>
                                            <option value="Líder">Líder</option>
                                            <option value="Muralla">Muralla</option>
                                            <option value="Capitán">Capitán</option>
                                            <option value="Goleador">Goleador</option>
                                            <option value="Juego Sucio">Juego Sucio</option>
                                            <option value="Humildad">Humildad</option>
                                            <option value="Poder Femenino">Poder Femenino</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Posición</label>
                                        <select
                                            name="position"
                                            value={formData.position}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none outline-none"
                                        >
                                            <option value="PO">Arquero (POR)</option>
                                            <option value="DF">Defensa (DEF)</option>
                                            <option value="MC">Mediocampista (MED)</option>
                                            <option value="DL">Delantero (DEL)</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {(formData.type === 'Jugador' || formData.is_fan === 1) && (
                                <div className="space-y-2 col-span-full border-t border-white/5 pt-6 mt-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Colores de Camiseta (Máx 3)</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsSeleccion(!isSeleccion);
                                                if (!isSeleccion) setSelectedShirtColors([]);
                                            }}
                                            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${isSeleccion ? 'bg-[#ffd900] text-black' : 'bg-white/10 text-white/60'
                                                }`}
                                        >
                                            {isSeleccion ? '✓ SELECCIÓN' : 'ES SELECCIÓN?'}
                                        </button>
                                    </div>

                                    {!isSeleccion && (
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-white/5 p-4 rounded-xl border border-white/10">
                                            {SHIRT_COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedShirtColors(prev => {
                                                            if (color === 'Sin color' || color === 'De Selección') {
                                                                return prev.includes(color) ? [] : [color];
                                                            }
                                                            const filtered = prev.filter(c => c !== 'Sin color' && c !== 'De Selección');
                                                            if (prev.includes(color)) {
                                                                return filtered.filter(c => c !== color);
                                                            }
                                                            if (filtered.length >= 3) return filtered;
                                                            return [...filtered, color];
                                                        });
                                                    }}
                                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border flex items-center justify-center gap-2 ${selectedShirtColors.includes(color)
                                                        ? 'bg-white/10 text-white border-[#ffd900]'
                                                        : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    <span className={`w-3 h-3 rounded-full bg-${color.toLowerCase() === 'blanco' ? 'white border border-gray-400' :
                                                        color.toLowerCase() === 'rojo' ? 'red-600' :
                                                            color.toLowerCase() === 'azul' ? 'blue-600' :
                                                                color.toLowerCase() === 'amarillo' ? 'yellow-400' :
                                                                    color.toLowerCase() === 'negro' ? 'black' :
                                                                        color.toLowerCase() === 'verde' ? 'green-600' :
                                                                            color.toLowerCase() === 'naranjo' ? 'orange-500' :
                                                                                color.toLowerCase() === 'morado' ? 'purple-600' :
                                                                                    color.toLowerCase() === 'celeste' ? 'blue-300' : 'gray-500'}`}
                                                        style={{
                                                            backgroundColor: color.toLowerCase() === 'blanco' ? 'white' :
                                                                color.toLowerCase() === 'rojo' ? '#dc2626' :
                                                                    color.toLowerCase() === 'azul' ? '#2563eb' :
                                                                        color.toLowerCase() === 'amarillo' ? '#facc15' :
                                                                            color.toLowerCase() === 'negro' ? '#000000' :
                                                                                color.toLowerCase() === 'verde' ? '#16a34a' :
                                                                                    color.toLowerCase() === 'naranjo' ? '#f97316' :
                                                                                        color.toLowerCase() === 'morado' ? '#9333ea' :
                                                                                            color.toLowerCase() === 'celeste' ? '#7dd3fc' : '#6b7280'
                                                        }}
                                                    />
                                                    {color}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {isSeleccion && (
                                        <div className="bg-[#ffd900]/10 border border-[#ffd900]/30 p-4 rounded-xl flex items-center gap-3">
                                            <span className="material-symbols-outlined text-[#ffd900]">military_tech</span>
                                            <span className="text-xs font-bold text-[#ffd900] uppercase tracking-widest">Esta carta se mostrará como "Selección"</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.type === 'Jugador' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ataque</label>
                                        <input
                                            type="number"
                                            name="stats_attack"
                                            value={formData.stats_attack}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Defensa</label>
                                        <input
                                            type="number"
                                            name="stats_defense"
                                            value={formData.stats_defense}
                                            onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Texto de Habilidad</label>
                            <textarea
                                name="ability_text"
                                value={formData.ability_text}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none"
                                placeholder="Describe el efecto o habilidad de la carta..."
                            />
                        </div>

                        <div className="flex items-center gap-10">
                            <div className="bg-[#ffd900] text-black px-8 py-4 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-[#ffea00] transition-colors cursor-pointer flex items-center gap-2">
                                <button type="submit" disabled={loading} className="w-full h-full">
                                    {loading ? 'PROCESANDO...' : initialData ? 'ACTUALIZAR CARTA' : 'GUARDAR CARTA'}
                                </button>
                            </div>
                            <button type="button" onClick={onClose} className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors">
                                CANCELAR
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddCardModal;
