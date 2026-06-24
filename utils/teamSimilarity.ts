import { slugify } from './slugify';
import { Team } from '../types';

// Algoritmo de distancia de Levenshtein simple
const getLevenshteinDistance = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // sustitución
                    matrix[i][j - 1] + 1,     // inserción
                    matrix[i - 1][j] + 1      // eliminación
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

// Limpia el nombre del equipo para quedarse solo con palabras clave y sin sufijos comunes
const cleanTeamName = (name: string): string => {
    let clean = name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // eliminar acentos
        .replace(/\b(fc|f\.c\.|club|deportes|deportivo|cd|c\.d\.|asociacion|futbol|soccer|futebol)\b/g, '') // remover sufijos
        .replace(/[^a-z0-9]/g, '') // remover espacios y caracteres especiales
        .trim();
    return clean || slugify(name).replace(/-/g, '');
};

export interface SimilarityResult {
    isSimilar: boolean;
    reason: 'exact' | 'similar_clean' | 'levenshtein' | null;
    matchedTeam: Team | null;
}

/**
 * Compara el nuevo nombre de equipo contra el listado de equipos existentes.
 * Retorna si hay similitud y el equipo coincidente.
 */
export const checkTeamNameSimilarity = (newName: string, existingTeams: Team[]): SimilarityResult => {
    if (!newName.trim() || !existingTeams || existingTeams.length === 0) {
        return { isSimilar: false, reason: null, matchedTeam: null };
    }

    const newSlug = slugify(newName);
    const newClean = cleanTeamName(newName);

    for (const team of existingTeams) {
        const teamName = team.name || '';
        const teamSlug = slugify(teamName);
        const teamClean = cleanTeamName(teamName);

        // 1. Coincidencia exacta (ignorando mayúsculas/minúsculas y acentos a través de slugs)
        if (newSlug === teamSlug || teamName.trim().toLowerCase() === newName.trim().toLowerCase()) {
            return { isSimilar: true, reason: 'exact', matchedTeam: team };
        }

        // 2. Coincidencia exacta tras limpiar palabras comunes (ej: "Galácticos FC" y "Los Galacticos")
        if (newClean === teamClean && newClean.length > 2) {
            return { isSimilar: true, reason: 'similar_clean', matchedTeam: team };
        }

        // 3. Subcadenas o distancia de Levenshtein pequeña en nombres limpios
        if (newClean.length > 3 && teamClean.length > 3) {
            if (newClean.includes(teamClean) || teamClean.includes(newClean)) {
                return { isSimilar: true, reason: 'similar_clean', matchedTeam: team };
            }

            const dist = getLevenshteinDistance(newClean, teamClean);
            const maxLength = Math.max(newClean.length, teamClean.length);
            
            // Umbral de tolerancia de edición según el tamaño del nombre
            if (dist <= 2 && maxLength <= 8 || dist <= 3 && maxLength > 8) {
                return { isSimilar: true, reason: 'levenshtein', matchedTeam: team };
            }
        }
    }

    return { isSimilar: false, reason: null, matchedTeam: null };
};
