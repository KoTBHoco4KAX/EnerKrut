import { useEffect } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CraftTicketBody,
  InventoryQuery,
  LambardSellBody,
} from "@enerkrut/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth";

export function useMe() {
  const initData = useAuthStore((state) => state.initData);
  const setMe = useAuthStore((state) => state.setMe);
  const query = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    staleTime: 30_000,
    enabled: initData.length > 0,
  });
  useEffect(() => {
    if (query.data !== undefined) {
      setMe(query.data);
    }
  }, [query.data, setMe]);
  return query;
}

export function useCases() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: api.getCases,
    staleTime: 60_000,
  });
}

export function useInventory(decision: NonNullable<InventoryQuery["decision"]>) {
  const initData = useAuthStore((state) => state.initData);
  return useQuery({
    queryKey: ["inventory", decision],
    queryFn: () => api.getInventory(decision),
    enabled: initData.length > 0,
  });
}

export function useDrops() {
  const initData = useAuthStore((state) => state.initData);
  return useInfiniteQuery({
    queryKey: ["drops"],
    queryFn: ({ pageParam }) => api.getDrops(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: initData.length > 0,
  });
}

function useGameInvalidation() {
  const queryClient = useQueryClient();
  return async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["drops"] }),
    ]);
  };
}

export function useOpenCase() {
  const invalidate = useGameInvalidation();
  return useMutation({
    mutationFn: (caseId: string) => api.openCase(caseId),
    onSuccess: invalidate,
  });
}

export function useSellDrop() {
  const invalidate = useGameInvalidation();
  return useMutation({
    mutationFn: (dropId: string) => api.sellDrop(dropId),
    onSuccess: invalidate,
  });
}

export function useDrinkDrop() {
  const invalidate = useGameInvalidation();
  return useMutation({
    mutationFn: (dropId: string) => api.drinkDrop(dropId),
    onSuccess: invalidate,
  });
}

export function useVendingHit() {
  const invalidate = useGameInvalidation();
  return useMutation({
    mutationFn: (eventId: string) => api.vendingHit(eventId),
    onSuccess: invalidate,
  });
}

export function useLambardSell() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LambardSellBody) => api.lambardSell(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useCraftTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CraftTicketBody) => api.craftTicket(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
