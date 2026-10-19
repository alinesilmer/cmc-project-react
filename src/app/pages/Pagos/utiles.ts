// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.

export const ESTADO_URL = (id: number) => `/api/lotes/snaps/${id}/estado`;

export const DELETE_LOTE_URL = (id: number) => `/api/lotes/snaps/${id}`;

export const PERIODOS_DISP_URL = (id: number) =>
  `/api/periodos/disponibles?obra_social_id=${id}`;
