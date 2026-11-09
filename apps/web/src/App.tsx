import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RefreshCw, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { useAuthStore } from "./stores/auth";
import { isTelegramEnvironment } from "./lib/telegram";
import { ActionButton } from "./components/ActionButton";
import { BottomNav } from "./components/BottomNav";
import { ToastHost } from "./components/ToastHost";
import { EmptyState } from "./components/EmptyState";
import { CasesShowcaseScreen } from "./screens/CasesShowcaseScreen";
import { InventoryScreen } from "./screens/InventoryScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { OpenCaseScreen } from "./screens/OpenCaseScreen";

// В dev-режиме Vite кнопка входа доступна всегда.
// В production-сборке — только если при сборке передан VITE_ALLOW_DEV_AUTH=true.
const ALLOW_DEV_AUTH =
  import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEV_AUTH === "true";

function TelegramGate(): ReactNode {
  const setInitData = useAuthStore((state) => state.setInitData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const insideTelegram = isTelegramEnvironment();

  const bypass = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const { createDevInitData } = await import("./lib/devAuth");
      const initData = await createDevInitData();
      setInitData(initData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="safe-top safe-bottom flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card text-accent-neon">
        <Smartphone className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-text-primary">
        {insideTelegram ? "Нет доступа к сессии Telegram" : "Открой через Telegram"}
      </h1>
      <p className="max-w-xs text-sm leading-relaxed text-text-muted">
        {insideTelegram
          ? "Не удалось получить initData. Закрой Mini App и открой его заново из бота."
          : "Мини-приложение работает внутри Telegram. Запусти его через бота, чтобы получить доступ к инвентарю и кейсам."}
      </p>
      {insideTelegram ? (
        <ActionButton
          variant="primary"
          icon={<RefreshCw className="h-4 w-4" />}
          onClick={() => window.location.reload()}
        >
          Перезагрузить
        </ActionButton>
      ) : null}
      {ALLOW_DEV_AUTH ? (
        <ActionButton
          variant={insideTelegram ? "danger" : "primary"}
          loading={loading}
          onClick={() => {
            void bypass();
          }}
        >
          {insideTelegram ? "Войти с dev-initData" : "Попробовать в браузере с фейк-initData"}
        </ActionButton>
      ) : null}
      {error ? (
        <p className="text-xs text-accent-warn">Не удалось создать dev-сессию</p>
      ) : null}
    </div>
  );
}

function AuthExpiredScreen(): ReactNode {
  return (
    <div className="safe-top safe-bottom flex h-full items-center justify-center px-6">
      <EmptyState
        icon={<Smartphone className="h-6 w-6" />}
        title="Переоткрой мини-апп"
        description="Сессия Telegram истекла. Закрой Mini App и запусти его заново из бота."
      />
    </div>
  );
}

export function App(): ReactNode {
  const initData = useAuthStore((state) => state.initData);
  const authExpired = useAuthStore((state) => state.authExpired);

  if (authExpired) {
    return (
      <>
        <AuthExpiredScreen />
        <ToastHost />
      </>
    );
  }

  if (initData.length === 0) {
    return (
      <>
        <TelegramGate />
        <ToastHost />
      </>
    );
  }

  return (
    <div className="h-full">
      <div className="h-full pb-[calc(64px+env(safe-area-inset-bottom))]">
        <Routes>
          <Route path="/" element={<CasesShowcaseScreen />} />
          <Route path="/inventory" element={<InventoryScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/open/:caseId" element={<OpenCaseScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
      <ToastHost />
    </div>
  );
}
