-- AlterTable
ALTER TABLE "Case" ADD COLUMN     "hasVendingMachine" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CaseTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CaseTicket_userId_consumedAt_idx" ON "CaseTicket"("userId", "consumedAt");

-- AddForeignKey
ALTER TABLE "CaseTicket" ADD CONSTRAINT "CaseTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseTicket" ADD CONSTRAINT "CaseTicket_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
