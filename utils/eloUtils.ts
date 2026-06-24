export type MatchContext = 'Normal' | 'Definición' | 'Final'; // Mantenido por compatibilidad de tipos

/**
 * Calcula el cambio de ELO para un partido
 * @param eloHome ELO del equipo local
 * @param eloAway ELO del equipo visitante
 * @param scoreHome Goles local
 * @param scoreAway Goles visitante
 * @param tournamentType Tipo o nivel de torneo (barrio, ascenso, oro, pichanga)
 * @returns Cambio de ELO para el local (el visitante pierde lo mismo)
 */
export const calculateEloChange = (
    eloHome: any,
    eloAway: any,
    scoreHome: number,
    scoreAway: number,
    tournamentType?: string
): number => {
    // Asegurar que los ELOs sean números válidos, por defecto 1000
    const currentEloHome = Number(eloHome) || 1000;
    const currentEloAway = Number(eloAway) || 1000;
    
    // Determinar K según tipo de torneo
    let K = 12;
    if (tournamentType) {
        const type = tournamentType.toLowerCase().trim();
        if (type === 'barrio') {
            K = 20;
        } else if (type === 'ascenso') {
            K = 30;
        } else if (type === 'oro') {
            K = 40;
        } else if (type === 'pichanga') {
            K = 12;
        }
    }
    
    // 1. Probabilidad esperada (We)
    const We = 1 / (Math.pow(10, -(currentEloHome - currentEloAway) / 400) + 1);
    
    // 2. Resultado Real (W)
    let W = 0.5; // Empate por defecto
    if (scoreHome > scoreAway) W = 1;
    if (scoreHome < scoreAway) W = 0;
    
    // 3. Margen de victoria (G = 1 fijo según especificación del backend)
    const G = 1;
    
    // 4. Cálculo final
    const eloChange = K * G * (W - We);
    
    return Math.round(eloChange);
};
