import type { Rarity } from "@enerkrut/shared";

export interface RarityPresentation {
  text: string;
  chip: string;
  border: string;
  glow: string;
  dot: string;
}

export const RARITY_PRESENTATION: Record<Rarity, RarityPresentation> = {
  common: {
    text: "text-rarity-common",
    chip: "bg-rarity-common/15 border-rarity-common/40",
    border: "border-l-rarity-common",
    glow: "",
    dot: "bg-rarity-common",
  },
  uncommon: {
    text: "text-rarity-uncommon",
    chip: "bg-rarity-uncommon/15 border-rarity-uncommon/40",
    border: "border-l-rarity-uncommon",
    glow: "",
    dot: "bg-rarity-uncommon",
  },
  rare: {
    text: "text-rarity-rare",
    chip: "bg-rarity-rare/15 border-rarity-rare/40",
    border: "border-l-rarity-rare",
    glow: "shadow-glow-rare",
    dot: "bg-rarity-rare",
  },
  epic: {
    text: "text-rarity-epic",
    chip: "bg-rarity-epic/15 border-rarity-epic/40",
    border: "border-l-rarity-epic",
    glow: "shadow-glow-epic",
    dot: "bg-rarity-epic",
  },
  legendary: {
    text: "text-rarity-legendary",
    chip: "bg-rarity-legendary/15 border-rarity-legendary/40",
    border: "border-l-rarity-legendary",
    glow: "shadow-glow-legendary",
    dot: "bg-rarity-legendary",
  },
  fictional_mythic: {
    text: "text-rarity-fictional_mythic",
    chip: "bg-rarity-fictional_mythic/15 border-rarity-fictional_mythic/40",
    border: "border-l-rarity-fictional_mythic",
    glow: "shadow-glow-fictional_mythic",
    dot: "bg-rarity-fictional_mythic",
  },
};
