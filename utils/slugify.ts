/**
 * Convierte una cadena de texto en un slug amigable para URL.
 * Ejemplo: "Rayo Matariano FC" -> "rayo-matariano-fc"
 */
export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // Normaliza para separar acentos
        .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
        .trim()
        .replace(/\s+/g, '-') // Reemplaza espacios por guiones
        .replace(/[^\w-]+/g, '') // Elimina caracteres no alfanuméricos (excepto guiones)
        .replace(/--+/g, '-'); // Elimina guiones dobles
};
