
export const BASE_URL = 'https://cesun.vkinf-software.com:7800';
export const SERIAL_NUMBER = '24010120';

export const PHOTOS_ENDPOINT = `${BASE_URL}/api/photos/${SERIAL_NUMBER}/`;

// Ajusta los datos de cada fotografía para mostrarlos en la aplicación.
export function normalizePhoto(item, index) {
  const rawUri = item.image || item.url || item.foto || '';

  const fullUri = rawUri.startsWith('http')
    ? rawUri
    : `${BASE_URL}${rawUri.startsWith('/') ? '' : '/'}${rawUri}`;

  const rawDate = item.created_at || item.fecha || item.uploaded_at || null;

  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Fecha no disponible';

  return {
    id: item.id ?? index,
    uri: fullUri,
    date: formattedDate,
  };
}
