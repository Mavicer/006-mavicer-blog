import assert from "node:assert/strict";
import { build } from "esbuild";
import test from "node:test";

test("blocked localStorage cannot break cookie-session startup or visitor interactions", async () => {
  const { outputFiles } = await build({ entryPoints: [new URL("../src/lib/api.ts", import.meta.url).pathname], bundle: true, platform: "browser", format: "esm", write: false });
  const api = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString("base64")}`);
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Storage blocked"); } });
  try {
    assert.doesNotThrow(() => api.clearSession());
    const id = api.clientId();
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.equal(api.clientId(), id);
    assert.equal(api.currentUser(), null);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});
