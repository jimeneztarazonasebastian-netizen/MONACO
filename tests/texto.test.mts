import assert from "node:assert/strict";
import { test } from "node:test";

import {
  aEntero,
  aPesos,
  aSlug,
  aTexto,
  listaSeparadaPorComas,
  plural,
} from "../src/lib/texto.ts";

test("aSlug quita tildes, mayúsculas y símbolos", () => {
  assert.equal(aSlug("Camiseta Térmica Negra"), "camiseta-termica-negra");
  assert.equal(aSlug("Buzo Ñandú"), "buzo-nandu");
  assert.equal(aSlug("  Pantaloneta   Deportiva  "), "pantaloneta-deportiva");
  assert.equal(aSlug("Camiseta #1 (edición 2026)"), "camiseta-1-edicion-2026");
});

test("aSlug nunca devuelve vacío", () => {
  // Un nombre de puros símbolos dejaría el slug en blanco, y como la
  // columna es única, el segundo producto así chocaría con el primero.
  assert.notEqual(aSlug("###"), "");
  assert.notEqual(aSlug("   "), "");
  assert.notEqual(aSlug("!!!"), aSlug("???"));
});

test("aPesos entiende cómo se escriben los precios en Colombia", () => {
  assert.equal(aPesos("89900"), 89900);
  assert.equal(aPesos("89.900"), 89900);
  assert.equal(aPesos("$ 89.900"), 89900);
  assert.equal(aPesos(""), 0);
  assert.equal(aPesos(null), 0);
  assert.equal(aPesos("abc"), 0);
});

test("aEntero admite negativos, que son las salidas de inventario", () => {
  assert.equal(aEntero("12"), 12);
  assert.equal(aEntero("-3"), -3);
  assert.equal(aEntero(""), 0);
  assert.equal(aEntero("no soy número"), 0);
});

test("listaSeparadaPorComas limpia, respeta el orden y no repite", () => {
  assert.deepEqual(listaSeparadaPorComas("S, M, L , XL"), ["S", "M", "L", "XL"]);
  assert.deepEqual(listaSeparadaPorComas("Negro, negro, NEGRO"), ["Negro"]);
  assert.deepEqual(listaSeparadaPorComas(" , , "), []);
  assert.deepEqual(listaSeparadaPorComas("Azul,,Rojo"), ["Azul", "Rojo"]);
});

test("plural concuerda en singular", () => {
  assert.equal(plural(1, "variante", "variantes"), "1 variante");
  assert.equal(plural(0, "variante", "variantes"), "0 variantes");
  assert.equal(plural(20, "unidad", "unidades"), "20 unidades");
});

test("aTexto recorta y tolera nulos", () => {
  assert.equal(aTexto("  hola  "), "hola");
  assert.equal(aTexto(null), "");
  assert.equal(aTexto(undefined), "");
});
