import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Coffee,
  PackageOpen,
  RotateCcw,
  Skull,
  Undo2,
} from "lucide-react";
import type { VendingHitResponse } from "@enerkrut/shared";
import { useAuthStore, keysSummary } from "../stores/auth";
import {
  useCases,
  useDrinkDrop,
  useMe,
  useOpenCase,
  useSellDrop,
  useVendingHit,
} from "../hooks/useGame";
import { formatRub, keyGradeLabel } from "../lib/format";
import { haptic, useTelegramBack } from "../lib/telegram";
import { ApiError } from "../lib/api";
import { showToast } from "../stores/toast";
import { ActionButton } from "../components/ActionButton";
import { BalanceBar } from "../components/BalanceBar";
import { BpmIndicator } from "../components/BpmIndicator";
import { DropResultCard } from "../components/DropResultCard";
import type { DropItemView } from "../components/DropResultCard";
import { EmptyState } from "../components/EmptyState";
import { TachycardiaBadge } from "../components/TachycardiaBadge";

type ScreenState =
  | "idle"
  | "rolling"
  | "result"
  | "vending_stuck"
  | "vending_fail"
  | "vending_ate";

interface ResultDrop {
  id: string;
  item: DropItemView;
  servedPriceRub: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function resultNotification(rarity: DropItemView["rarity"]): "success" | "warning" {
  return rarity === "common" || rarity === "uncommon" ? "warning" : "success";
}

export function OpenCaseScreen() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const meQuery = useMe();
  const casesQuery = useCases();
  const user = useAuthStore((state) => state.user);
  const storeBpm = useAuthStore((state) => state.bpm);
  const storeTachycardia = useAuthStore((state) => state.tachycardia);
  const openCase = useOpenCase();
  const sellDrop = useSellDrop();
  const drinkDrop = useDrinkDrop();
  const vendingHit = useVendingHit();
  const [screen, setScreen] = useState<ScreenState>("idle");
  const [drops, setDrops] = useState<ResultDrop[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [refundRub, setRefundRub] = useState(0);
  const [hitting, setHitting] = useState(false);
  const [busyDropId, setBusyDropId] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }, [navigate]);
  useTelegramBack(goBack);

  const seedCase = casesQuery.data?.cases.find((item) => item.id === caseId);
  const bpm = meQuery.data?.bpmCurrent ?? storeBpm;
  const tachycardia = meQuery.data?.tachycardia ?? storeTachycardia;
  const balanceRub = user?.balanceRub ?? 0;
  const keys = user === null ? 0 : keysSummary(user.keys);

  const reset = (): void => {
    setScreen("idle");
    setDrops([]);
    setEventId(null);
    setRefundRub(0);
  };

  const handleOpen = async (): Promise<void> => {
    if (seedCase === undefined) {
      return;
    }
    if (balanceRub < seedCase.priceRub) {
      showToast("Недостаточно ₽", "warning");
      return;
    }
    setScreen("rolling");
    haptic("impact", "medium");
    try {
      const response = await openCase.mutateAsync(seedCase.id);
      await delay(2200);
      if (!mounted.current) {
        return;
      }
      if (response.status === "pending_vending" && response.eventId !== undefined) {
        setEventId(response.eventId);
        setScreen("vending_stuck");
        haptic("impact", "heavy");
        return;
      }
      if (response.status === "machine_ate") {
        setScreen("vending_ate");
        return;
      }
      if (response.item !== undefined && response.dropId !== undefined) {
        setDrops([
          {
            id: response.dropId,
            item: response.item,
            servedPriceRub: response.servedPriceRub ?? 0,
          },
        ]);
        setScreen("result");
        haptic("notification", resultNotification(response.item.rarity));
      }
    } catch (error) {
      if (mounted.current) {
        setScreen("idle");
      }
      if (error instanceof ApiError && error.code === "insufficient_balance") {
        showToast("Недостаточно ₽", "warning");
      }
    }
  };

  const handleHit = async (): Promise<void> => {
    if (eventId === null) {
      return;
    }
    setHitting(true);
    haptic("impact", "heavy");
    try {
      const response: VendingHitResponse = await vendingHit.mutateAsync(eventId);
      if (!mounted.current) {
        return;
      }
      if (response.result === "fail") {
        setRefundRub(response.refundRub ?? 0);
        setScreen("vending_fail");
        return;
      }
      if (response.drops !== undefined) {
        setDrops(
          response.drops.map((drop) => ({
            id: drop.id,
            item: drop.item,
            servedPriceRub: drop.servedPriceRub,
          })),
        );
        setScreen("result");
        const first = response.drops[0];
        if (first !== undefined) {
          haptic("notification", resultNotification(first.item.rarity));
        }
      }
    } catch {
      showToast("Автомат не поддался", "error");
    } finally {
      if (mounted.current) {
        setHitting(false);
      }
    }
  };

  const handleSell = async (drop: ResultDrop): Promise<void> => {
    setBusyDropId(drop.id);
    try {
      const result = await sellDrop.mutateAsync(drop.id);
      haptic("notification", "success");
      showToast(`+${formatRub(result.priceRub)}`, "success");
      navigate("/inventory");
    } catch {
      showToast("Не удалось продать", "error");
    } finally {
      if (mounted.current) {
        setBusyDropId(null);
      }
    }
  };

  const handleDrink = async (drop: ResultDrop): Promise<void> => {
    setBusyDropId(drop.id);
    try {
      const result = await drinkDrop.mutateAsync(drop.id);
      haptic("impact", "medium");
      showToast(
        `+${result.keyCount} ${keyGradeLabel(result.keyGrade)} ключ`,
        "success",
      );
      navigate("/inventory");
    } catch {
      showToast("Не удалось выпить", "error");
    } finally {
      if (mounted.current) {
        setBusyDropId(null);
      }
    }
  };

  if (casesQuery.isLoading || meQuery.isLoading) {
    return <div className="p-6 text-sm text-text-muted">Загружаем кейс…</div>;
  }

  if (seedCase === undefined) {
    return (
      <div className="flex h-full flex-col">
        <EmptyState
          icon={<PackageOpen className="h-6 w-6" />}
          title="Кейс не найден"
          action={<ActionButton onClick={() => navigate("/")}>На витрину</ActionButton>}
        />
      </div>
    );
  }

  if (bpm < seedCase.minBpmRequired) {
    return (
      <div className="safe-top flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <Skull className="h-12 w-12 text-accent-warn" aria-hidden="true" />
        <h2 className="text-xl font-bold text-text-primary">
          Нужен пульс ≥ {seedCase.minBpmRequired}, у тебя {bpm}.
        </h2>
        <p className="text-sm text-text-muted">
          Открывай кейсы и пей банки — пульс поднимется.
        </p>
        <ActionButton variant="primary" onClick={() => navigate("/")}>
          Назад на витрину
        </ActionButton>
      </div>
    );
  }

  const renderActions = (drop: ResultDrop) => (
    <>
      <ActionButton
        variant="positive"
        loading={busyDropId === drop.id && sellDrop.isPending}
        onClick={() => {
          void handleSell(drop);
        }}
      >
        Продать за {formatRub(drop.servedPriceRub)}
      </ActionButton>
      <ActionButton
        variant="primary"
        loading={busyDropId === drop.id && drinkDrop.isPending}
        onClick={() => {
          void handleDrink(drop);
        }}
      >
        Открыть и выпить
      </ActionButton>
    </>
  );

  const canAfford = balanceRub >= seedCase.priceRub;

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top shrink-0 border-b border-border-base bg-bg-base/95 px-4 pb-3 pt-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Назад"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-card text-text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {seedCase.displayName}
            </p>
            <BalanceBar balanceRub={balanceRub} keys={keys} className="mt-1" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <BpmIndicator bpm={bpm} />
          <TachycardiaBadge
            active={tachycardia.active}
            until={tachycardia.until}
          />
        </div>
      </header>

      <div className="screen-scroll no-scrollbar flex flex-1 flex-col items-center justify-center px-4 py-6">
        {screen === "idle" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
            <div className="relative flex w-3/4 items-center justify-center rounded-2xl border border-border-base bg-bg-card">
              <PackageOpen className="h-24 w-24 text-text-muted" aria-hidden="true" />
              <img
                src={seedCase.coverUrl}
                alt={seedCase.displayName}
                className="absolute inset-0 m-auto max-h-full w-full rounded-2xl object-cover"
                onError={(event) => {
                  event.currentTarget.style.opacity = "0";
                }}
              />
            </div>
            <p className="font-mono text-2xl font-bold text-accent-neon">
              {formatRub(seedCase.priceRub)}
            </p>
            <ActionButton
              fullWidth
              variant="primary"
              loading={openCase.isPending}
              className={canAfford ? "" : "opacity-40"}
              aria-disabled={!canAfford}
              onClick={() => {
                void handleOpen();
              }}
            >
              Открыть за {formatRub(seedCase.priceRub)}
            </ActionButton>
            {seedCase.hasVendingMachine ? (
              <p className="text-xs text-text-muted">
                Это физический автомат, будь готов
              </p>
            ) : null}
          </div>
        ) : null}

        {screen === "rolling" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-6">
            <p className="text-sm font-medium text-text-muted">Крутим…</p>
            <div className="relative h-64 w-40 overflow-hidden rounded-2xl border border-border-base bg-bg-card">
              <motion.div
                className="flex flex-col gap-3 p-3"
                animate={{ y: ["0%", "-62%"] }}
                transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {Array.from({ length: 10 }, (_, index) => (
                  <div
                    key={index}
                    className="h-20 w-full shrink-0 rounded-lg bg-bg-elevated opacity-70 blur-sm"
                  />
                ))}
              </motion.div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg-card via-transparent to-bg-card" />
            </div>
          </div>
        ) : null}

        {screen === "result" ? (
          <div className="flex w-full flex-col items-center gap-4">
            {drops.length > 1 ? (
              <div className="no-scrollbar flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                {drops.map((drop) => (
                  <div key={drop.id} className="min-w-[86%] snap-center">
                    <DropResultCard
                      item={drop.item}
                      servedPriceRub={drop.servedPriceRub}
                      actions={renderActions(drop)}
                    />
                  </div>
                ))}
              </div>
            ) : drops[0] !== undefined ? (
              <DropResultCard
                item={drops[0].item}
                servedPriceRub={drops[0].servedPriceRub}
                actions={renderActions(drops[0])}
              />
            ) : null}
            {canAfford ? (
              <ActionButton
                variant="danger"
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={reset}
              >
                Ещё раз
              </ActionButton>
            ) : (
              <ActionButton variant="danger" onClick={() => navigate("/")}>
                На витрину
              </ActionButton>
            )}
          </div>
        ) : null}

        {screen === "vending_stuck" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
            <motion.div
              animate={{ rotate: [0, -4, 4, -3, 3, 0] }}
              transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1.2 }}
              className="flex h-44 w-44 items-center justify-center rounded-3xl border border-border-base bg-bg-card"
            >
              <Coffee className="h-20 w-20 text-accent-warn" aria-hidden="true" />
            </motion.div>
            <h2 className="text-xl font-bold text-text-primary">
              Банка застряла на пружине
            </h2>
            <p className="text-sm text-text-muted">
              Автомат уже списал {formatRub(seedCase.priceRub)}. Осталось выбить.
            </p>
            <ActionButton
              variant="warn"
              fullWidth
              loading={hitting}
              className="animate-pulse-glow"
              onClick={() => {
                void handleHit();
              }}
            >
              Ебнуть по корпусу
            </ActionButton>
          </div>
        ) : null}

        {screen === "vending_fail" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
            <Undo2 className="h-16 w-16 text-accent-warn" aria-hidden="true" />
            <h2 className="text-xl font-bold text-text-primary">Не выбил</h2>
            <p className="text-sm text-text-muted">
              Вернули 50% — {formatRub(refundRub)}
            </p>
            <ActionButton fullWidth onClick={reset}>
              Ладно
            </ActionButton>
          </div>
        ) : null}

        {screen === "vending_ate" ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-3xl border border-accent-warn/30 bg-bg-card">
              <Coffee className="h-20 w-20 text-text-muted" aria-hidden="true" />
              <span className="absolute h-24 w-1 rotate-45 rounded-full bg-accent-warn" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              Аппарат сожрал сотку
            </h2>
            <p className="text-sm text-text-muted">Бывает. Спиши на издержки.</p>
            <ActionButton fullWidth onClick={() => navigate("/")}>
              Вернуться
            </ActionButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
