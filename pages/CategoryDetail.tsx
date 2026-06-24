import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { Tournament } from '../types';

const CategoryDetail: React.FC = () => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const [category, setCategory] = useState<any>(null);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!categoryId) return;
            try {
                // Primero obtenemos todas las categorías para encontrar ésta
                const categories = await apiService.getTournamentCategories();
                const currentCat = categories.find((c: any) => c.id.toString() === categoryId);
                setCategory(currentCat);

                // Luego obtenemos los torneos y filtramos por categoría
                const allTournaments = await apiService.getTournaments();
                const filtered = allTournaments.filter((t: Tournament) => t.category_id?.toString() === categoryId);
                setTournaments(filtered);
            } catch (error) {
                console.error('Error al cargar datos de categoría:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [categoryId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
                <div className="size-12 border-4 border-[#ffd900]/20 border-t-[#ffd900] animate-spin rounded-full"></div>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="min-h-screen bg-[#0a0f18] flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-black text-white uppercase italic mb-4">Categoría no encontrada</h1>
                <Link to="/tournaments" className="text-[#ffd900] uppercase text-sm font-black tracking-widest hover:underline">Volver a Torneos</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0f18] text-white">
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                {/* Header de Categoría */}
                <div className="mb-12 relative overflow-hidden bg-white/5 border border-white/10 p-8 sm:p-12">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffd900] to-transparent"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 text-[#ffd900] mb-4">
                            <span className="h-[1px] w-12 bg-[#ffd900]"></span>
                            <span className="text-xs font-black uppercase tracking-[0.4em]">Serie Oficial</span>
                        </div>
                        <div className="flex items-center gap-6 mb-4">
                            {category.logo_url && (
                                <img src={category.logo_url} alt={category.name} className="w-16 h-16 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_15px_rgba(255,217,0,0.5)]" />
                            )}
                            <h1 className="text-5xl sm:text-7xl font-black uppercase italic tracking-tighter">{category.name}</h1>
                        </div>
                        {category.description && (
                            <p className="max-w-2xl text-white/60 text-lg leading-relaxed">{category.description}</p>
                        )}
                    </div>
                    {/* Decoración fondo */}
                    <div className="absolute -bottom-10 -right-10 text-[120px] font-black italic text-white/[0.02] uppercase select-none pointer-events-none tracking-tighter leading-none">
                        SERIES
                    </div>
                </div>

                {/* Lista de Torneos de la Serie */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tournaments.length === 0 ? (
                        <div className="col-span-full py-20 text-center border border-dashed border-white/10">
                            <p className="text-white/20 uppercase font-black tracking-widest italic">No hay ediciones registradas para esta serie</p>
                        </div>
                    ) : (
                        tournaments.map((tournament) => (
                            <Link 
                                key={tournament.id}
                                to={`/tournament/${tournament.id}`}
                                className="group relative bg-white/5 border border-white/5 hover:border-[#ffd900]/30 transition-all duration-500 overflow-hidden"
                            >
                                <div className="aspect-[16/9] relative overflow-hidden">
                                    <img 
                                        src={tournament.banner_url || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop'} 
                                        alt={tournament.name}
                                        className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-transparent to-transparent"></div>
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <div className="bg-[#ffd900] text-black text-[9px] font-black px-2 py-1 uppercase italic shadow-lg">
                                            Edición {tournament.division_level === 0 ? 'Ppal' : `Div ${tournament.division_level}`}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-black uppercase italic group-hover:text-[#ffd900] transition-colors mb-2 line-clamp-1">{tournament.name}</h3>
                                    <div className="flex justify-between items-center text-[10px] text-white/40 font-black uppercase tracking-widest">
                                        <span>{tournament.structure}</span>
                                        <span className="text-[#ffd900]">{tournament.status}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryDetail;
