// Vite uses this adapter only for the temporary Node build. The browser uses
// DOMPurify's native DOM as before; no jsdom code is shipped to visitors.
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
const createDOMPurify = createRequire(import.meta.url)("dompurify");
export default createDOMPurify(new JSDOM("").window);
