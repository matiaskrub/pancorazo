/**
 * Mapeo de estados de partidos y equipos de inglés a español.
 */
export const formatStatus = (status: string | undefined | null): string => {
    if (!status) return 'N/D';

    const statusMap: Record<string, string> = {
        'PENDING': 'Pendiente',
        'SCHEDULED': 'Calendarizado',
        'PLAYED': 'Jugado',
        'COMPLETED': 'Jugado',
        'SUSPENDED': 'Suspendido',
        'WALKOVER': 'Admin',
        'HISTORICAL': 'Histórico',
        'ACTIVE': 'Activo',
        'INACTIVE': 'Inactivo',
        'OPEN': 'Abierto',
        'DRAFT': 'Borrador',
        'REGISTRATION_CLOSED': 'Inscripciones Cerradas',
        'IN_PROGRESS': 'Cursando',
        'CLOSED': 'Terminado'
    };

    const normalizedStatus = status.toUpperCase();
    return statusMap[normalizedStatus] || status;
};

/**
 * Calcula el mejor color de contraste (negro o blanco) para un fondo dado.
 */
export const getContrastColor = (hexColor: string): string => {
    if (!hexColor) return '#000000';
    
    // Eliminar # si existe
    const hex = hexColor.replace('#', '');
    
    // Convertir a RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calcular luminancia relativa
    // Fórmula estándar: (R*0.299 + G*0.587 + B*0.114)
    // Se usa el umbral 128 para decidir entre negro y blanco (estándar YIQ)
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
    
    return luminance > 128 ? '#000000' : '#ffffff';
};

/**
 * Convierte un string de fecha (ej. "YYYY-MM-DD" o "YYYY-MM-DD HH:mm:ss") 
 * a un objeto Date en la zona horaria local de forma segura para todos los navegadores.
 */
export const parseLocalDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    
    // Si ya es un objeto Date
    if ((dateStr as any) instanceof Date) return dateStr as any;

    // Limpiar espacios en los extremos
    const str = String(dateStr).trim();

    // Intentar emparejar YYYY-MM-DD y opcionalmente HH:mm:ss o HH:mm
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // Mes es base 0
        const day = parseInt(match[3], 10);
        const hours = match[4] ? parseInt(match[4], 10) : 0;
        const minutes = match[5] ? parseInt(match[5], 10) : 0;
        const seconds = match[6] ? parseInt(match[6], 10) : 0;
        return new Date(year, month, day, hours, minutes, seconds);
    }

    // Si tiene formato ISO con timezone (ej. con 'Z' o +HH:mm)
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Formatea una fecha local a string en español de Chile (es-CL).
 */
export const formatLocalDate = (
    dateStr: string | null | undefined, 
    options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string => {
    const date = parseLocalDate(dateStr);
    if (!date) return 'Sin fecha';
    return date.toLocaleDateString('es-CL', options);
};

/**
 * Formatea una fecha y hora local a string en español de Chile (es-CL).
 */
export const formatLocalDateTime = (
    dateStr: string | null | undefined,
    options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }
): string => {
    const date = parseLocalDate(dateStr);
    if (!date) return 'Sin fecha';
    return date.toLocaleString('es-CL', options) + ' hrs';
};

