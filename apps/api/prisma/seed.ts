import "dotenv/config";
import { pathToFileURL } from "node:url";
import {
  Condition as PrismaCondition,
  ConditionProfileKey as PrismaConditionProfileKey,
  ContainerType as PrismaContainerType,
  Prisma,
  PrismaClient,
  Rarity as PrismaRarity,
} from "@prisma/client";
import {
  CASE_IDS,
  Condition as SharedCondition,
  ConditionProfileKey as SharedConditionProfileKey,
  ContainerType as SharedContainerType,
  Rarity as SharedRarity,
} from "@enerkrut/shared";
import type {
  CaseSeed,
  ConditionProfileSeed,
  ItemSeed,
  RarityWeightSeed,
} from "@enerkrut/shared";
import { loadSeedData } from "../src/seed/load.js";
import { validateSeedData } from "../src/seed/validate.js";
import type { SeedData } from "../src/seed/load.js";

const RARITY_MAP: Record<SharedRarity, PrismaRarity> = {
  [SharedRarity.Common]: PrismaRarity.common,
  [SharedRarity.Uncommon]: PrismaRarity.uncommon,
  [SharedRarity.Rare]: PrismaRarity.rare,
  [SharedRarity.Epic]: PrismaRarity.epic,
  [SharedRarity.Legendary]: PrismaRarity.legendary,
  [SharedRarity.FictionalMythic]: PrismaRarity.fictional_mythic,
};

const CONDITION_MAP: Record<SharedCondition, PrismaCondition> = {
  [SharedCondition.Mint]: PrismaCondition.mint,
  [SharedCondition.Dented]: PrismaCondition.dented,
  [SharedCondition.Bloated]: PrismaCondition.bloated,
  [SharedCondition.CrookedLabel]: PrismaCondition.crooked_label,
};

const PROFILE_MAP: Record<SharedConditionProfileKey, PrismaConditionProfileKey> = {
  [SharedConditionProfileKey.Massmarket]: PrismaConditionProfileKey.massmarket,
  [SharedConditionProfileKey.PremiumImport]: PrismaConditionProfileKey.premium_import,
  [SharedConditionProfileKey.ArchiveRare]: PrismaConditionProfileKey.archive_rare,
  [SharedConditionProfileKey.Fictional]: PrismaConditionProfileKey.fictional,
};

const CONTAINER_MAP: Record<SharedContainerType, PrismaContainerType> = {
  [SharedContainerType.Can]: PrismaContainerType.can,
  [SharedContainerType.SlimCan]: PrismaContainerType.slim_can,
  [SharedContainerType.Bottle]: PrismaContainerType.bottle,
  [SharedContainerType.Shot]: PrismaContainerType.shot,
  [SharedContainerType.Jar]: PrismaContainerType.jar,
  [SharedContainerType.Tube]: PrismaContainerType.tube,
  [SharedContainerType.Jelly]: PrismaContainerType.jelly,
  [SharedContainerType.Ration]: PrismaContainerType.ration,
  [SharedContainerType.Carton]: PrismaContainerType.carton,
};

export interface SeedCounts {
  items: number;
  cases: number;
  rarityWeights: number;
  conditionProfiles: number;
  dropTableRows: number;
}

type ItemScalars = Omit<Prisma.ItemsCatalogUncheckedCreateInput, "id">;
type CaseScalars = Omit<Prisma.CaseUncheckedCreateInput, "id">;

function toItemScalars(item: ItemSeed): ItemScalars {
  return {
    displayName: item.displayName,
    displayNameRu: item.displayNameRu ?? null,
    brand: item.brand,
    countryOrigin: item.countryOrigin,
    containerType: CONTAINER_MAP[item.containerType],
    rarity: RARITY_MAP[item.rarity],
    conditionProfile: PROFILE_MAP[item.conditionProfile],
    basePriceRub: item.basePriceRub,
    tasteScore: item.tasteScore,
    flavorNotes: item.flavorNotes,
    yearRelease: item.yearRelease ?? null,
    isAlcoholic: item.isAlcoholic,
    alcoholPercent: item.alcoholPercent ?? null,
    isFictional: item.isFictional,
    isDiscontinued: item.isDiscontinued,
    isArchiveRare: item.isArchiveRare,
    imageUrl: item.imageUrl,
    imageThumbUrl: item.imageThumbUrl,
    source: item.source,
    legalFlags: item.legalFlags,
  };
}

function toCaseScalars(seedCase: CaseSeed): CaseScalars {
  return {
    slug: seedCase.slug,
    displayName: seedCase.displayName,
    description: seedCase.description,
    priceRub: seedCase.priceRub,
    priceStarsAlt: seedCase.priceStarsAlt ?? null,
    isActive: seedCase.isActive,
    minBpmRequired: seedCase.minBpmRequired,
    isVipOnly: seedCase.isVipOnly,
    hasVendingMachine: seedCase.hasVendingMachine,
    coverUrl: seedCase.coverUrl,
    order: seedCase.order,
  };
}

function toProfileData(profile: ConditionProfileSeed): {
  multipliers: Prisma.InputJsonValue;
  allowedStates: PrismaCondition[];
  description: string;
} {
  return {
    multipliers: profile.multipliers,
    allowedStates: profile.allowedStates.map((state) => CONDITION_MAP[state]),
    description: profile.description,
  };
}

function toWeightData(weight: RarityWeightSeed): {
  caseId: string;
  rarity: PrismaRarity;
  weight: number;
} {
  return {
    caseId: weight.caseId,
    rarity: RARITY_MAP[weight.rarity],
    weight: weight.weight,
  };
}

async function readCounts(tx: Prisma.TransactionClient): Promise<SeedCounts> {
  const [items, cases, rarityWeights, conditionProfiles, dropTableRows] =
    await Promise.all([
      tx.itemsCatalog.count(),
      tx.case.count(),
      tx.caseRarityWeight.count(),
      tx.conditionProfile.count(),
      tx.caseDropTable.count(),
    ]);
  return { items, cases, rarityWeights, conditionProfiles, dropTableRows };
}

export async function seedDatabase(
  prisma: PrismaClient,
  data?: SeedData,
): Promise<SeedCounts> {
  const seedData = data ?? (await loadSeedData());
  return prisma.$transaction(
    async (tx) => {
      for (const profile of seedData.conditionProfiles) {
        const profileData = toProfileData(profile);
        const key = PROFILE_MAP[profile.key];
        await tx.conditionProfile.upsert({
          where: { key },
          update: profileData,
          create: { key, ...profileData },
        });
      }

      for (const seedCase of seedData.cases) {
        const caseData = toCaseScalars(seedCase);
        await tx.case.upsert({
          where: { id: seedCase.id },
          update: caseData,
          create: { id: seedCase.id, ...caseData },
        });
      }

      for (const weight of seedData.rarityWeights) {
        const { caseId, rarity, weight: amount } = toWeightData(weight);
        await tx.caseRarityWeight.upsert({
          where: { caseId_rarity: { caseId, rarity } },
          update: { weight: amount },
          create: { caseId, rarity, weight: amount },
        });
      }

      for (const item of seedData.items) {
        const scalars = toItemScalars(item);
        await tx.itemsCatalog.upsert({
          where: { id: item.id },
          update: scalars,
          create: { id: item.id, ...scalars },
        });
      }

      await tx.caseDropTable.deleteMany({
        where: { caseId: { in: [...CASE_IDS] } },
      });
      await tx.caseDropTable.createMany({
        data: seedData.items.map((item) => ({
          caseId: item.caseId,
          itemId: item.id,
          weight: item.weightInRarity,
        })),
      });

      return readCounts(tx);
    },
    { timeout: 180_000, maxWait: 30_000 },
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const data = await loadSeedData();
    const report = validateSeedData(data);
    if (!report.valid) {
      process.stderr.write(`${report.errors.join("\n")}\n`);
      process.exitCode = 1;
      return;
    }
    const counts = await seedDatabase(prisma, data);
    process.stdout.write(`${JSON.stringify(counts, null, 2)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const invokedFile = process.argv[1];
if (invokedFile !== undefined && import.meta.url === pathToFileURL(invokedFile).href) {
  await main();
}
