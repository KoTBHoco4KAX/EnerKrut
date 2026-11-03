-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary', 'fictional_mythic');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('mint', 'dented', 'bloated', 'crooked_label');

-- CreateEnum
CREATE TYPE "ConditionProfileKey" AS ENUM ('massmarket', 'premium_import', 'archive_rare', 'fictional');

-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('can', 'slim_can', 'bottle', 'shot', 'jar', 'tube', 'jelly', 'ration', 'carton');

-- CreateEnum
CREATE TYPE "KeyGrade" AS ENUM ('gray', 'color', 'engraved', 'gold');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('sold', 'drank', 'kept');

-- CreateEnum
CREATE TYPE "VendingEventType" AS ENUM ('stuck_can_hit', 'stuck_can_double', 'stuck_can_fail', 'machine_ate_100', 'tachycardia_trigger');

-- CreateEnum
CREATE TYPE "LedgerCurrency" AS ENUM ('rub', 'star');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('rub_pack_small', 'rub_pack_mid', 'rub_pack_large', 'vip_30d', 'vip_90d', 'donate_safe', 'donate_import', 'auction_pass');

-- CreateTable
CREATE TABLE "ItemsCatalog" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayNameRu" TEXT,
    "brand" TEXT NOT NULL,
    "countryOrigin" CHAR(2) NOT NULL,
    "containerType" "ContainerType" NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "conditionProfile" "ConditionProfileKey" NOT NULL,
    "basePriceRub" INTEGER NOT NULL,
    "tasteScore" DECIMAL(3,1) NOT NULL,
    "flavorNotes" TEXT NOT NULL,
    "yearRelease" INTEGER,
    "isAlcoholic" BOOLEAN NOT NULL DEFAULT false,
    "alcoholPercent" DECIMAL(3,1),
    "isFictional" BOOLEAN NOT NULL DEFAULT false,
    "isDiscontinued" BOOLEAN NOT NULL DEFAULT false,
    "isArchiveRare" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT NOT NULL,
    "imageThumbUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "legalFlags" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemsCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionProfile" (
    "key" "ConditionProfileKey" NOT NULL,
    "multipliers" JSONB NOT NULL,
    "allowedStates" "Condition"[],
    "description" TEXT NOT NULL,

    CONSTRAINT "ConditionProfile_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL,
    "priceStarsAlt" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minBpmRequired" INTEGER NOT NULL DEFAULT 0,
    "isVipOnly" BOOLEAN NOT NULL DEFAULT false,
    "coverUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseRarityWeight" (
    "caseId" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "CaseRarityWeight_pkey" PRIMARY KEY ("caseId","rarity")
);

-- CreateTable
CREATE TABLE "CaseDropTable" (
    "caseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,

    CONSTRAINT "CaseDropTable_pkey" PRIMARY KEY ("caseId","itemId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "balanceRub" BIGINT NOT NULL DEFAULT 0,
    "balanceStars" INTEGER NOT NULL DEFAULT 0,
    "keysGray" INTEGER NOT NULL DEFAULT 0,
    "keysColor" INTEGER NOT NULL DEFAULT 0,
    "keysEngraved" INTEGER NOT NULL DEFAULT 0,
    "keysGold" INTEGER NOT NULL DEFAULT 0,
    "bpmCurrent" INTEGER NOT NULL DEFAULT 60,
    "bpmUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tachycardiaActive" BOOLEAN NOT NULL DEFAULT false,
    "tachycardiaUntil" TIMESTAMP(3),
    "vipTier" INTEGER NOT NULL DEFAULT 0,
    "vipExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "condition" "Condition" NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'pending',
    "obtainedFromCase" TEXT,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servedPriceRub" INTEGER NOT NULL,
    "decision" "Decision",
    "decisionAt" TIMESTAMP(3),
    "meta" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "condition" "Condition" NOT NULL,
    "rollSeed" TEXT NOT NULL,
    "rollValueRarity" INTEGER NOT NULL,
    "rollValueItem" INTEGER NOT NULL,
    "weightsSnapshot" JSONB NOT NULL,
    "servedPriceRub" INTEGER NOT NULL,
    "decision" "Decision",
    "decisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DropHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deltaRub" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "balanceAfter" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StarLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deltaStars" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StarLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grade" "KeyGrade" NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceItem" TEXT,
    "refId" TEXT,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "amountStars" INTEGER NOT NULL,
    "invoiceLink" TEXT NOT NULL,
    "telegramPaymentChargeId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "TelegramPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" "VendingEventType" NOT NULL,
    "outcome" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemsCatalog_rarity_idx" ON "ItemsCatalog"("rarity");

-- CreateIndex
CREATE INDEX "ItemsCatalog_conditionProfile_idx" ON "ItemsCatalog"("conditionProfile");

-- CreateIndex
CREATE INDEX "ItemsCatalog_isArchiveRare_isDiscontinued_idx" ON "ItemsCatalog"("isArchiveRare", "isDiscontinued");

-- CreateIndex
CREATE UNIQUE INDEX "Case_slug_key" ON "Case"("slug");

-- CreateIndex
CREATE INDEX "CaseDropTable_caseId_weight_idx" ON "CaseDropTable"("caseId", "weight");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "UserInventory_userId_decision_idx" ON "UserInventory"("userId", "decision");

-- CreateIndex
CREATE INDEX "UserInventory_itemId_condition_idx" ON "UserInventory"("itemId", "condition");

-- CreateIndex
CREATE INDEX "DropHistory_userId_createdAt_idx" ON "DropHistory"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "DropHistory_caseId_rarity_idx" ON "DropHistory"("caseId", "rarity");

-- CreateIndex
CREATE INDEX "DropHistory_itemId_idx" ON "DropHistory"("itemId");

-- CreateIndex
CREATE INDEX "RubLedger_userId_createdAt_idx" ON "RubLedger"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StarLedger_userId_createdAt_idx" ON "StarLedger"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "KeyLedger_userId_grade_createdAt_idx" ON "KeyLedger"("userId", "grade", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramPayment_telegramPaymentChargeId_key" ON "TelegramPayment"("telegramPaymentChargeId");

-- CreateIndex
CREATE INDEX "TelegramPayment_userId_status_idx" ON "TelegramPayment"("userId", "status");

-- CreateIndex
CREATE INDEX "VendingEvent_userId_createdAt_idx" ON "VendingEvent"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CaseRarityWeight" ADD CONSTRAINT "CaseRarityWeight_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDropTable" ADD CONSTRAINT "CaseDropTable_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDropTable" ADD CONSTRAINT "CaseDropTable_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemsCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemsCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropHistory" ADD CONSTRAINT "DropHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropHistory" ADD CONSTRAINT "DropHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DropHistory" ADD CONSTRAINT "DropHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemsCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubLedger" ADD CONSTRAINT "RubLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarLedger" ADD CONSTRAINT "StarLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyLedger" ADD CONSTRAINT "KeyLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramPayment" ADD CONSTRAINT "TelegramPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendingEvent" ADD CONSTRAINT "VendingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendingEvent" ADD CONSTRAINT "VendingEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
