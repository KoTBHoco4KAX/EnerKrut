import { randomBytes, randomInt } from "node:crypto";

export interface RandomSource {
  int(minInclusive: number, maxExclusive: number): number;
  bytes(size: number): Buffer;
}

export const cryptoRandomSource: RandomSource = {
  int: (minInclusive, maxExclusive) => randomInt(minInclusive, maxExclusive),
  bytes: (size) => randomBytes(size),
};
