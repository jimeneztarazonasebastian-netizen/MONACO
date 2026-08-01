import assert from "node:assert/strict";
import { test } from "node:test";

import {
  enlaceWhatsapp,
  esNumeroValido,
  mensajePedido,
  normalizarNumero,
} from "../src/lib/whatsapp.ts";

test("normaliza el celular colombiano al formato que exige wa.me", () => {
  // wa.me solo acepta dígitos con indicativo de país.
  assert.equal(normalizarNumero("3001234567"), "573001234567");
  assert.equal(normalizarNumero("300 123 4567"), "573001234567");
  assert.equal(normalizarNumero("+57 300 1234567"), "573001234567");
  assert.equal(normalizarNumero("(300) 123-4567"), "573001234567");
  assert.equal(normalizarNumero("573001234567"), "573001234567");
});

test("no inventa indicativo cuando el número no es colombiano", () => {
  assert.equal(normalizarNumero("14155552671"), "14155552671");
});

test("un número vacío o basura no es válido", () => {
  assert.equal(normalizarNumero(""), null);
  assert.equal(normalizarNumero(null), null);
  assert.equal(normalizarNumero("abc"), null);
  assert.equal(esNumeroValido(""), false);
  assert.equal(esNumeroValido("123"), false);
  assert.equal(esNumeroValido("3001234567"), true);
});

test("el mensaje del pedido lleva número, prendas y total", () => {
  const lineas = [
    {
      variantId: "1",
      slug: "camiseta",
      productName: "Camiseta Entreno",
      size: "M",
      color: "Negro",
      precio: 89900,
      cantidad: 2,
      imagen: null,
      stock: 5,
    },
  ];

  const mensaje = mensajePedido("MN-000042", lineas, 179800, {
    nombre: "Ana Pérez",
    direccion: "Calle 1",
  });

  assert.ok(mensaje.includes("MN-000042"));
  assert.ok(mensaje.includes("2 x Camiseta Entreno (M/Negro)"));
  assert.ok(mensaje.includes("$179.800"));
  assert.ok(mensaje.includes("Ana Pérez"));
  assert.ok(mensaje.includes("Calle 1"));
});

test("sin dirección no queda un renglón vacío en el mensaje", () => {
  const mensaje = mensajePedido("MN-000001", [], 0, { nombre: "Ana" });
  assert.ok(!mensaje.includes("Dirección:"));
  assert.ok(!mensaje.includes("\n\n\n"));
});

test("el enlace escapa el mensaje", () => {
  const enlace = enlaceWhatsapp("3001234567", "hola mundo & cía");
  assert.ok(enlace.startsWith("https://wa.me/573001234567?text="));
  assert.ok(!enlace.includes(" "));
  assert.ok(enlace.includes("%26"));
});
