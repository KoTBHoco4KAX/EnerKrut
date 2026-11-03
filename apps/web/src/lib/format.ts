import dayjs from "dayjs";
import type {
  Condition,
  KeyGrade,
  Rarity,
} from "@enerkrut/shared";

export function formatRub(value: number | bigint): string {
  const numeric = Number(value);
  const sign = numeric < 0 ? "-" : "";
  const digits = Math.abs(numeric).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped} ₽`;
}

export function formatRelative(iso: string): string {
  const then = dayjs(iso);
  const now = dayjs();
  const seconds = now.diff(then, "second");
  if (seconds < 60) {
    return "только что";
  }
  const minutes = now.diff(then, "minute");
  if (minutes < 60) {
    return `${minutes} мин назад`;
  }
  const hours = now.diff(then, "hour");
  if (hours < 24) {
    return `${hours} ч назад`;
  }
  const days = now.diff(then, "day");
  if (days < 7) {
    return `${days} дн назад`;
  }
  return then.format("DD.MM.YYYY");
}

export function formatCountdown(until: string, now: Date = new Date()): string {
  const remaining = Math.max(0, dayjs(until).diff(now, "second"));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function dateGroup(iso: string): "Сегодня" | "Вчера" | "Раньше" {
  const date = dayjs(iso);
  const today = dayjs().startOf("day");
  if (date.isAfter(today) || date.isSame(today, "day")) {
    return "Сегодня";
  }
  if (date.isSame(today.subtract(1, "day"), "day")) {
    return "Вчера";
  }
  return "Раньше";
}

export function rarityLabel(rarity: Rarity): string {
  const labels: Record<Rarity, string> = {
    common: "Обычная",
    uncommon: "Необычная",
    rare: "Редкая",
    epic: "Эпическая",
    legendary: "Легендарная",
    fictional_mythic: "Мифическая",
  };
  return labels[rarity];
}

export function conditionLabel(condition: Condition): string {
  const labels: Record<Condition, string> = {
    mint: "Идеал",
    dented: "Мятая",
    bloated: "Вздутая",
    crooked_label: "Кривая наклейка",
  };
  return labels[condition];
}

export function keyGradeLabel(grade: KeyGrade): string {
  const labels: Record<KeyGrade, string> = {
    gray: "Серый",
    color: "Цветной",
    engraved: "Гравированный",
    gold: "Золотой",
  };
  return labels[grade];
}
