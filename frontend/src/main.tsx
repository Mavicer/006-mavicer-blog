import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";
import { ThemeProvider } from "./hooks/useTheme";
import { AppearanceProvider } from "./hooks/useAppearance";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
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
