import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App, { prepareInitialRoute } from "./App";
import "./styles/index.css";
import { ThemeProvider } from "./hooks/useTheme";
import { AppearanceProvider } from "./hooks/useAppearance";
import { ErrorBoundary } from "./components/ErrorBoundary";

const container = document.getElementById("root")!;
const app = (
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AppearanceProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AppearanceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
if (container.dataset.prerendered === window.location.pathname) {
  void prepareInitialRoute(window.location.pathname).then(() => {
    ReactDOM.hydrateRoot(container, app);
  });
} else {
  // Private routes and legacy online-only articles still use the SPA entry.
  ReactDOM.createRoot(container).render(app);
}
