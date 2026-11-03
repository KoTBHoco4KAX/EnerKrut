import { useNavigate } from "react-router-dom";
import { AlertTriangle, Inbox } from "lucide-react";
import { useCases, useMe } from "../hooks/useGame";
import { keysSummary, useAuthStore } from "../stores/auth";
import { BalanceBar } from "../components/BalanceBar";
import { CaseCard } from "../components/CaseCard";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

export function CasesShowcaseScreen() {
  const navigate = useNavigate();
  const meQuery = useMe();
  const casesQuery = useCases();
  const user = useAuthStore((state) => state.user);
  const storeBpm = useAuthStore((state) => state.bpm);
  const bpm = meQuery.data?.bpmCurrent ?? storeBpm;
  const cases = casesQuery.data?.cases ?? [];
  const keys = user === null ? 0 : keysSummary(user.keys);
  const cheapest =
    cases.length === 0
      ? 0
      : Math.min(...cases.map((seedCase) => seedCase.priceRub));
  const lowFunds =
    user !== null && cases.length > 0 && user.balanceRub < cheapest && keys === 0;
  const loading = meQuery.isLoading || casesQuery.isLoading;

  return (
    <div className="flex h-full flex-col">
      <header className="safe-top shrink-0 px-4 pb-3 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="max-w-[60%] text-xl font-bold leading-tight text-text-primary">
            Коллекционер энергетиков
          </h1>
          <BalanceBar balanceRub={user?.balanceRub ?? 0} keys={keys} />
        </div>
      </header>

      <div className="screen-scroll no-scrollbar flex-1 pb-24">
        {lowFunds ? (
          <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl border border-accent-warn/30 bg-accent-warn/10 p-3 text-xs leading-relaxed text-accent-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Ты на мели. Открой дешёвый кейс или сдай ключи в ломбард
            </span>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 p-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : casesQuery.isError ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Витрина недоступна"
            description="Не удалось загрузить кейсы. Потяни экран и попробуй снова."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {cases.map((seedCase) => (
              <CaseCard
                key={seedCase.id}
                publicCase={seedCase}
                disabled={bpm < seedCase.minBpmRequired}
                onOpen={(caseId) => navigate(`/open/${caseId}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
