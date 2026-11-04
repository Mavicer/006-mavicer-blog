import { renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import { StaticRouter } from "react-router-dom/server";
import { ThemeProvider } from "./hooks/useTheme";
import { AppearanceProvider } from "./hooks/useAppearance";
import App, { prepareInitialRoute } from "./App";
import { usePosts } from "./hooks/usePosts";
import { publicPaths, seoFor, seoMarkup } from "../shared/seo";

export function routes() { return publicPaths(usePosts().posts); }
export async function render(path: string) {
  await prepareInitialRoute(path);
  const body = await new Promise<string>((resolve, reject) => {
    const output = new PassThrough();
    let html = "";
    output.on("data", chunk => { html += chunk; });
    output.on("end", () => resolve(html));
    output.on("error", reject);
    const stream = renderToPipeableStream(<ThemeProvider><AppearanceProvider><StaticRouter location={path}><App /></StaticRouter></AppearanceProvider></ThemeProvider>, {
      onAllReady() { stream.pipe(output); }, onError: reject,
    });
  });
  return {
    body,
    head: seoMarkup(seoFor(path, usePosts().posts)),
  };
}
