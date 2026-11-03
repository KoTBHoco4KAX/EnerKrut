import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, PackageOpen } from "lucide-react";
import type { InventoryResponse } from "@enerkrut/shared";
import { KeyGrade, LAMBARD_RATES } from "@enerkrut/shared";
import { useAuthStore, keysSummary } from "../stores/auth";
import {
  useDrinkDrop,
  useInventory,
  useLambardSell,
  useMe,
  useSellDrop,
} from "../hooks/useGame";
import {
  conditionLabel,
  formatRub,
  keyGradeLabel,
} from "../lib/format";
import { showToast } from "../stores/toast";
import { ActionButton } from "../components/ActionButton";
import { BalanceBar } from "../components/BalanceBar";
import { EmptyState } from "../components/EmptyState";
import { ItemCard } from "../components/ItemCard";
import { Modal } from "../components/Modal";
import { RarityBadge } from "../components/RarityBadge";

type Tab = "pending" | "sold" | "drank";
type InventoryItem = InventoryResponse["items"][number];

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "sold", label: "Sold" },
  { id: "drank", label: "Drank" },
];

const GRADE_COLOR: Record<KeyGrade, string> = {
  [KeyGrade.Gray]: "text-text-muted",
  [KeyGrade.Color]: "text-rarity-rare",
  [KeyGrade.Engraved]: "text-rarity-epic",
  [KeyGrade.Gold]: "text-rarity-legendary",
};

const GRADE_ORDER: readonly KeyGrade[] = [
  KeyGrade.Gray,
  KeyGrade.Color,
  KeyGrade.Engraved,
  KeyGrade.Gold,
];

export function InventoryScreen() {
  const navigate = useNavigate();
  const meQuery = useMe();
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalGrade, setModalGrade] = useState<KeyGrade | null>(null);
  const [modalCount, setModalCount] = useState(1);
  const sellDrop = useSellDrop();
  const drinkDrop = useDrinkDrop();
  const lambardSell = useLambardSell();
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const inventory = useInventory(tab);
  const balanceRub = user?.balanceRub ?? 0;
  const keys = user?.keys ?? { gray: 0, color: 0, engraved: 0, gold: 0 };
  const keysTotal = user === null ? 0 : keysSummary(user.keys);
  const showLambard = user !== null && user.balanceRub < 300;

  const handleSell = async (item: InventoryItem): Promise<void> => {
    try {
      const result = await sellDrop.mutateAsync(item.id);
      showToast(`+${formatRub(result.priceRub)}`, "success");
      setExpandedId(null);
    } catch {
      showToast("Не удалось продать", "error");
    }
  };

  const handleDrink = async (item: InventoryItem): Promise<void> => {
    try {
      const result = await drinkDrop.mutateAsync(item.id);
      showToast(
        `+${result.keyCount} ${keyGradeLabel(result.keyGrade)} ключ`,
        "success",
      );
      setExpandedId(null);
    } catch {
      showToast("Не удалось выпить", "error");
    }
  };

  const sellKeys = async (grade: KeyGrade, count: number): Promise<void> => {
    try {
      const result = await lambardSell.mutateAsync({ grade, count });
      showToast(`+${formatRub(result.rubsAdded)}`, "success");
      setModalGrade(null);
    } catch {
      showToast("Ломбард не принял ключи", "error");
    }
  };

  const beginLongPress = (grade: KeyGrade, count: number): void => {
    if (count <= 1) {
      return;
    }
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setModalGrade(grade);
      setModalCount(count);
    }, 500);
  };

  const endLongPress = (): void => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleKeyClick = (grade: KeyGrade, count: number): void => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (count > 0) {
      void sellKeys(grade, 1);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top shrink-0 px-4 pb-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-text-primary">Инвентарь</h1>
          <BalanceBar balanceRub={balanceRub} keys={keysTotal} />
        </div>
      </header>

      <div className="shrink-0 px-4 pb-3">
        <div className="grid grid-cols-3 gap-2 rounded-full border border-border-base bg-bg-card p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setExpandedId(null);
              }}
              className={`min-h-[44px] rounded-full px-3 text-xs font-semibold transition ${
                tab === item.id
                  ? "bg-accent-neon text-bg-base"
                  : "text-text-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="screen-scroll no-scrollbar flex-1 px-4 pb-4">
        {inventory.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl bg-bg-card"
              />
            ))}
          </div>
        ) : inventory.data !== undefined && inventory.data.items.length > 0 ? (
          <div className="space-y-3">
            {inventory.data.items.map((item) => (
              <ItemCard
                key={item.id}
                item={{
                  displayName: item.item.displayName,
                  imageThumbUrl: item.item.imageThumbUrl,
                  rarity: item.item.rarity,
                  condition: item.item.condition,
                }}
                meta={conditionLabel(item.condition)}
                badges={<RarityBadge rarity={item.item.rarity} />}
                decision={item.decision}
                trailing={
                  tab === "drank" ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${GRADE_COLOR[item.keyGrade]}`}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      {keyGradeLabel(item.keyGrade)}
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-semibold text-accent-ok">
                      {formatRub(item.servedPriceRub)}
                    </span>
                  )
                }
                expanded={expandedId === item.id}
                onClick={
                  tab === "pending"
                    ? () =>
                        setExpandedId((current) =>
                          current === item.id ? null : item.id,
                        )
                    : undefined
                }
              >
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton
                    variant="positive"
                    loading={
                      sellDrop.isPending && sellDrop.variables === item.id
                    }
                    onClick={() => {
                      void handleSell(item);
                    }}
                  >
                    Продать
                  </ActionButton>
                  <ActionButton
                    variant="primary"
                    loading={
                      drinkDrop.isPending && drinkDrop.variables === item.id
                    }
                    onClick={() => {
                      void handleDrink(item);
                    }}
                  >
                    Выпить
                  </ActionButton>
                </div>
              </ItemCard>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PackageOpen className="h-6 w-6" />}
            title={
              tab === "pending"
                ? "Пока пусто. Открой кейс, чтобы начать"
                : tab === "sold"
                  ? "Здесь появятся проданные банки"
                  : "Здесь появятся выпитые банки"
            }
            action={
              tab === "pending" ? (
                <ActionButton onClick={() => navigate("/")}>На витрину</ActionButton>
              ) : undefined
            }
          />
        )}
        {meQuery.isError ? (
          <p className="py-2 text-center text-xs text-accent-warn">
            Не удалось обновить профиль
          </p>
        ) : null}
      </div>

      {showLambard ? (
        <section className="shrink-0 border-t border-border-base bg-bg-card px-4 pb-4 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Ты на мели</h2>
            <span className="text-[11px] text-text-muted">
              Ломбард принимает ключи
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {GRADE_ORDER.map((grade) => {
              const count = keys[grade];
              return (
                <div
                  key={grade}
                  className="flex flex-col items-center gap-1 rounded-xl border border-border-base bg-bg-base p-2"
                >
                  <KeyRound
                    className={`h-5 w-5 ${GRADE_COLOR[grade]}`}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-text-muted">
                    {keyGradeLabel(grade)}
                  </span>
                  <span className="font-mono text-sm font-bold text-text-primary">
                    {count}
                  </span>
                  <button
                    type="button"
                    disabled={count === 0}
                    onPointerDown={() => beginLongPress(grade, count)}
                    onPointerUp={endLongPress}
                    onPointerLeave={endLongPress}
                    onClick={() => handleKeyClick(grade, count)}
                    className="min-h-[44px] w-full rounded-full bg-bg-elevated text-[10px] font-semibold text-accent-ok disabled:opacity-30"
                  >
                    Сдать
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <Modal
        open={modalGrade !== null}
        title="Сколько сдать?"
        onClose={() => setModalGrade(null)}
      >
        {modalGrade !== null ? (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              {keyGradeLabel(modalGrade)} ключи · доступно {keys[modalGrade]}
            </p>
            <input
              type="number"
              min={1}
              max={keys[modalGrade]}
              value={modalCount}
              onChange={(event) => {
                const next = Number(event.target.value);
                setModalCount(
                  Number.isFinite(next)
                    ? Math.max(1, Math.min(keys[modalGrade], next))
                    : 1,
                );
              }}
              className="min-h-[48px] w-full rounded-xl border border-border-base bg-bg-base px-4 font-mono text-lg text-text-primary outline-none focus:border-accent-neon"
            />
            <ActionButton
              fullWidth
              variant="positive"
              loading={lambardSell.isPending}
              onClick={() => {
                void sellKeys(modalGrade, modalCount);
              }}
            >
              Сдать за {formatRub(modalCount * LAMBARD_RATES[modalGrade])}
            </ActionButton>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
