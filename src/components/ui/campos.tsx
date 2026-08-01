"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Piezas de formulario compartidas por toda la administración.
 * Objetivos táctiles de 48 px o más: esto se usa de pie, con prisa y a
 * veces con la prenda en la otra mano.
 */

const CLASE_CONTROL =
  "h-12 w-full border border-humo bg-carbon px-3 text-base text-blanco " +
  "placeholder:text-gris focus:border-gris focus:outline-none";

export function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs tracking-[0.16em] text-gris uppercase">{children}</span>
  );
}

export function Campo({
  etiqueta,
  ayuda,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  ayuda?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <Etiqueta>{etiqueta}</Etiqueta>
      <input {...props} className={CLASE_CONTROL} />
      {ayuda ? <span className="text-xs text-gris">{ayuda}</span> : null}
    </label>
  );
}

export function AreaTexto({
  etiqueta,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-2">
      <Etiqueta>{etiqueta}</Etiqueta>
      <textarea
        {...props}
        className="min-h-28 w-full border border-humo bg-carbon p-3 text-base text-blanco placeholder:text-gris focus:border-gris focus:outline-none"
      />
    </label>
  );
}

/**
 * Desplegable que se controla a sí mismo.
 *
 * No es capricho: React 19 reinicia el formulario cuando la acción
 * termina, y `form.reset()` devuelve un `<select>` a la opción que tenga
 * el atributo `selected` — que React nunca escribe. Un `defaultValue`
 * aquí se pierde y el desplegable salta a su primera opción, aunque el
 * resto de campos sí conserven lo escrito. Controlado, no se pierde.
 */
export function Seleccion({
  etiqueta,
  defaultValue,
  onChange,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  const inicial = String(defaultValue ?? "");
  const [valor, setValor] = useState(inicial);
  const [anterior, setAnterior] = useState(inicial);
  const ref = useRef<HTMLSelectElement>(null);

  // Si la acción devuelve otro valor, se adopta. Comparar contra el
  // anterior evita pisar lo que la persona acaba de elegir.
  if (inicial !== anterior) {
    setAnterior(inicial);
    setValor(inicial);
  }

  // React reinicia el formulario DESPUÉS de renderizar y no vuelve a
  // aplicar el valor del select al DOM, así que el elemento queda
  // mostrando una opción distinta de la que React cree que tiene. Este
  // efecto corre después de cada render y los vuelve a igualar.
  useEffect(() => {
    if (ref.current && ref.current.value !== valor) ref.current.value = valor;
  });

  return (
    <label className="flex flex-col gap-2">
      <Etiqueta>{etiqueta}</Etiqueta>
      <select
        {...props}
        ref={ref}
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          onChange?.(e);
        }}
        className={CLASE_CONTROL}
      >
        {children}
      </select>
    </label>
  );
}

export function Casilla({
  etiqueta,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-2">
      <input
        type="checkbox"
        {...props}
        className="h-5 w-5 accent-rojo"
      />
      <span className="text-sm text-blanco">{etiqueta}</span>
    </label>
  );
}

export function Aviso({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm text-blanco"
    >
      {children}
    </p>
  );
}

export function BotonEnviar({
  children,
  variante = "principal",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario";
}) {
  const { pending } = useFormStatus();

  const estilo =
    variante === "principal"
      ? "bg-rojo text-blanco hover:opacity-90"
      : "border border-humo text-gris hover:border-gris hover:text-blanco";

  // `disabled` va DESPUÉS del spread a propósito: si va antes, un
  // `props.disabled` sin definir lo anula y el botón nunca se bloquea
  // mientras se envía, con lo que un doble clic crea la cosa dos veces.
  return (
    <button
      type="submit"
      {...props}
      disabled={pending || props.disabled}
      className={`bisel-sm h-12 px-6 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-50 ${estilo}`}
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}
