"use client";

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

export function Seleccion({
  etiqueta,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-2">
      <Etiqueta>{etiqueta}</Etiqueta>
      <select {...props} className={CLASE_CONTROL}>
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

  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      {...props}
      className={`bisel-sm h-12 px-6 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-50 ${estilo}`}
    >
      {pending ? "Guardando…" : children}
    </button>
  );
}
