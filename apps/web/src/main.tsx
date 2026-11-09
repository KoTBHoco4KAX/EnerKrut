import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { queryClient } from "./lib/queryClient";
import { getTelegramInitData, initTelegram } from "./lib/telegram";
import { useAuthStore } from "./stores/auth";
import "./index.css";

initTelegram();

const store = useAuthStore.getState();
store.setInitData(getTelegramInitData());

// В WebView Telegram SDK иногда инициализируется на пару тиков позже.
// Пробуем в течение ~3 секунд подхватить initData без перезагрузки.
if (store.initData.length === 0) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const initData = getTelegramInitData();
    if (initData.length > 0) {
      useAuthStore.getState().setInitData(initData);
      window.clearInterval(timer);
      return;
    }
    if (attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 150);
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
