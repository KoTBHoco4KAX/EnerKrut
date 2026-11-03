import { useEffect, useMemo, useRef } from "react";
import { History } from "lucide-react";
import type { DropsResponse } from "@enerkrut/shared";
import { useMe, useDrops } from "../hooks/useGame";
import { keysSummary, useAuthStore } from "../stores/auth";
import { dateGroup, formatRelative, formatRub } from "../lib/format";
import { BalanceBar } from "../components/BalanceBar";
import { EmptyState } from "../components/EmptyState";
import { ItemCard } from "../components/ItemCard";

type Drop = DropsResponse["drops"][number];

export function HistoryScreen() {
  useMe();
  const user = useAuthStore((state) => state.user);
  const dropsQuery = useDrops();
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = dropsQuery;
  const sentinel = useRef<HTMLDivElement>(null);
  const drops = useMemo(
    () => dropsQuery.data?.pages.flatMap((page) => page.drops) ?? [],
    [dropsQuery.data],
  );

  useEffect(() => {
    const element = sentinel.current;
    if (
      element === null ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const groups = useMemo(() => {
    const result = new Map<string, Drop[]>();
    for (const drop of drops) {
      const label = dateGroup(drop.createdAt);
      const bucket = result.get(label) ?? [];
      bucket.push(drop);
      result.set(label, bucket);
    }
    return [...result.entries()];
  }, [drops]);

  const keys = user === null ? 0 : keysSummary(user.keys);

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top shrink-0 px-4 pb-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-text-primary">История</h1>
          <BalanceBar balanceRub={user?.balanceRub ?? 0} keys={keys} />
        </div>
      </header>
      <div className="screen-scroll no-scrollbar flex-1 px-4 pb-24">
        {dropsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-bg-card"
              />
            ))}
          </div>
        ) : drops.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title="История пока пуста"
            description="Открой первый кейс — и здесь появятся все дропы."
          />
        ) : (
          groups.map(([label, group]) => (
            <section key={label} className="mb-4">
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {label}
              </h2>
              <div className="space-y-2">
                {group.map((drop) => (
                  <ItemCard
                    key={drop.id}
                    compact
                    rarityBar
                    item={{
                      displayName: drop.item.displayName,
                      imageThumbUrl: drop.item.imageThumbUrl,
                      rarity: drop.item.rarity,
                    }}
                    meta={`${drop.case.displayName} · ${formatRelative(drop.createdAt)}`}
                    decision={drop.decision}
                    trailing={
                      <span className="font-mono text-[11px] text-text-muted">
                        {formatRub(drop.servedPriceRub)}
                      </span>
                    }
                  />
                ))}
              </div>
            </section>
          ))
        )}
        <div ref={sentinel} className="h-8" />
        {dropsQuery.isFetchingNextPage ? (
          <p className="pb-4 text-center text-xs text-text-muted">Загружаем ещё…</p>
        ) : null}
        {!dropsQuery.hasNextPage && drops.length > 0 ? (
          <p className="pb-4 text-center text-xs text-text-muted">
            Это вся история
          </p>
        ) : null}
      </div>
    </div>
  );
}
