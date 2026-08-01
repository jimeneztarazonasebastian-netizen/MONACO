"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { iniciarSesion, type EstadoLogin } from "@/lib/actions/auth";

const ESTADO_INICIAL: EstadoLogin = { error: null };

function BotonEntrar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bisel-sm mt-2 h-14 w-full bg-rojo px-6 text-sm font-semibold tracking-[0.2em] text-blanco uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function FormularioLogin({ redirigir }: { redirigir: string }) {
  const [estado, accion] = useActionState(iniciarSesion, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-5">
      <input type="hidden" name="redirigir" value={redirigir} />

      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.18em] text-gris uppercase">
          Correo
        </span>
        <input
          type="email"
          name="correo"
          autoComplete="username"
          required
          autoFocus
          className="h-14 border border-humo bg-carbon px-4 text-base text-blanco placeholder:text-gris focus:border-gris focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs tracking-[0.18em] text-gris uppercase">
          Contraseña
        </span>
        <input
          type="password"
          name="clave"
          autoComplete="current-password"
          required
          className="h-14 border border-humo bg-carbon px-4 text-base text-blanco placeholder:text-gris focus:border-gris focus:outline-none"
        />
      </label>

      {estado.error ? (
        <p
          role="alert"
          className="border-l-2 border-rojo bg-rojo/10 px-4 py-3 text-sm text-blanco"
        >
          {estado.error}
        </p>
      ) : null}

      <BotonEntrar />
    </form>
  );
}
