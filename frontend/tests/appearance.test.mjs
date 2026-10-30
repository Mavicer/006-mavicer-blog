import assert from "node:assert/strict";
import { build } from "esbuild";
import test from "node:test";

const { outputFiles } = await build({
  entryPoints: [new URL("../src/services/appearanceService.ts", import.meta.url).pathname],
  bundle: true, platform: "browser", format: "esm", write: false,
});
const service = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`);

test("invalid saved preferences recover defaults and clamp readability controls", () => {
  for (const value of [null, [], 42, "broken", {}]) assert.deepEqual(service.normalizeAppearance(value), service.defaults);
  assert.deepEqual(service.normalizeAppearance({ background: "javascript:alert(1)", brightness: NaN, blur: Infinity, cardOpacity: -10, fontSize: 100, scrollBlur: "false" }), {
    ...service.defaults, cardOpacity: 40, fontSize: 22,
  });
  assert.equal(service.normalizeAppearance({ background: "custom", scrollBlur: false }).background, "default");
  assert.equal(service.normalizeAppearance({ scrollBlur: false }).scrollBlur, false);
});

test("blocked browser storage falls back to usable default appearance", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Storage blocked"); } });
  try { assert.deepEqual(service.readAppearance(), service.defaults); }
  finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});
