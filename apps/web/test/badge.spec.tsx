import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TachycardiaBadge } from "../src/components/TachycardiaBadge";

describe("TachycardiaBadge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the deadline and ticks every second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T00:00:00.000Z"));
    render(
      <TachycardiaBadge
        active
        until="2026-10-31T00:01:05.000Z"
      />,
    );
    expect(screen.getByText("01:05")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("01:04")).toBeInTheDocument();
  });
});
