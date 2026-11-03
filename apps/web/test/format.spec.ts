import { describe, expect, it } from "vitest";
import {
  Condition,
  KeyGrade,
  Rarity,
} from "@enerkrut/shared";
import {
  conditionLabel,
  formatCountdown,
  formatRelative,
  formatRub,
  keyGradeLabel,
  rarityLabel,
} from "../src/lib/format";

describe("format helpers", () => {
  it("formats rubles with grouped thousands", () => {
    expect(formatRub(1_234_567)).toBe("1 234 567 ₽");
    expect(formatRub(0)).toBe("0 ₽");
    expect(formatRub(10_000n)).toBe("10 000 ₽");
  });

  it("formats relative time in compact Russian", () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(formatRelative(twoMinutesAgo)).toBe("2 мин назад");
    const justNow = new Date(Date.now() - 10 * 1000).toISOString();
    expect(formatRelative(justNow)).toBe("только что");
  });

  it("localizes rarity, condition and key grade", () => {
    expect(rarityLabel(Rarity.FictionalMythic)).toBe("Мифическая");
    expect(conditionLabel(Condition.CrookedLabel)).toBe("Кривая наклейка");
    expect(keyGradeLabel(KeyGrade.Engraved)).toBe("Гравированный");
  });

  it("formats the tachycardia countdown", () => {
    const now = new Date("2026-10-31T00:00:00.000Z");
    expect(formatCountdown("2026-10-31T00:02:05.000Z", now)).toBe("02:05");
    expect(formatCountdown("2026-10-31T00:02:05.000Z", new Date("2026-10-31T00:02:10.000Z"))).toBe(
      "00:00",
    );
  });
});
