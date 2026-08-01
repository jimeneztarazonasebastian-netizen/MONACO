/**
 * Utilidades de texto para la administración.
 */

/**
 * Las marcas de tilde que NFD deja sueltas viven en el rango
 * U+0300–U+036F. Se escribe con escapes y no con los caracteres
 * literales, que son invisibles en el editor y se pierden con cualquier
 * copiar y pegar descuidado.
 */
const TILDES_SUELTAS = new RegExp("[\\u0300-\\u036f]", "g");

/** Huella corta y estable de un texto, para desempatar slugs vacíos. */
function huella(texto: string): string {
  let h = 0;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

/** "Camiseta Térmica Negra" → "camiseta-termica-negra" */
export function aSlug(texto: string): string {
  const limpio = texto
    .normalize("NFD")
    .replace(TILDES_SUELTAS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  // Un nombre de puros símbolos ("###") dejaría el slug en blanco, y como
  // la columna es única, el segundo producto así chocaría con el primero
  // con un error que no le dice nada a nadie. Se cae a una huella del
  // texto original: distinta para textos distintos, igual para el mismo.
  return limpio || `prenda-${huella(texto)}`;
}

/**
 * Parte "S, M, L , XL" en ["S","M","L","XL"], sin vacíos ni repetidos y
 * respetando el orden en que se escribieron.
 */
export function listaSeparadaPorComas(valor: string): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];

  for (const parte of valor.split(",")) {
    const limpio = parte.trim();
    if (!limpio) continue;
    const clave = limpio.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(limpio);
  }

  return salida;
}

/**
 * Los precios se escriben como "89.900" o "89900". Se queda solo con los
 * dígitos: en pesos colombianos no hay centavos, así que el punto
 * siempre es separador de miles y nunca decimal.
 */
export function aPesos(valor: FormDataEntryValue | null | undefined): number {
  const texto = String(valor ?? "").replace(/[^\d]/g, "");
  if (!texto) return 0;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : 0;
}

/** Entero simple para cantidades. Admite negativos (ajustes de merma). */
export function aEntero(valor: FormDataEntryValue | null | undefined): number {
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;
  const numero = Number.parseInt(texto, 10);
  return Number.isFinite(numero) ? numero : 0;
}

export function aTexto(valor: FormDataEntryValue | null | undefined): string {
  return String(valor ?? "").trim();
}

/** plural(1, "variante", "variantes") → "1 variante" */
export function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}
