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
  /**
   * Lo que el usuario alcanzó a escribir.
   *
   * React 19 reinicia el formulario en cuanto la acción termina, aunque
   * haya fallado. Sin esto, un error de validación borra todo lo que la
   * persona escribió y le pide corregir algo que ya no está en pantalla.
   * Devolver los valores y usarlos como `defaultValue` los repone.
   */
  valores?: Record<string, string>;
};

export const ESTADO_INICIAL: EstadoFormulario = { error: null };
