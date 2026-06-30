import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import App from "./App";
import ErrorPage from "./components/ErrorPage";
import "./index.css";
import "./styles/theme.css";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || (typeof process !== "undefined" ? process.env.VITE_SENTRY_DSN : undefined),
  environment: import.meta.env.MODE || (typeof process !== "undefined" ? process.env.NODE_ENV : undefined),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <Sentry.ErrorBoundary fallback={<ErrorPage />}>
        <App />
      </Sentry.ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);