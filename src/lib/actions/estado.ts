/**
 * Estado compartido por los formularios de la administración.
 *
 * Vive aparte de las acciones porque un archivo `"use server"` solo
 * puede exportar funciones asíncronas: cualquier constante o clase que
 * se exporte de ahí revienta la compilación.
 */
export type EstadoFormulario = {
  error: string | null;
  ok?: boolean;
  /** id de lo recién creado, para que el formulario sepa a dónde ir */
  id?: string;
};

export const ESTADO_INICIAL: EstadoFormulario = { error: null };
