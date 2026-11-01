-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "verifyCode" TEXT;

-- AlterTable
ALTER TABLE "DataSubmission" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'UPLOAD',
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StagedRecord" ADD COLUMN     "disposition" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "enrolmentId" TEXT,
ADD COLUMN     "rowKey" TEXT;

-- AlterTable
ALTER TABLE "ValidationIssue" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'DATA';

-- CreateTable
CREATE TABLE "ConsentRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "verifierUserId" TEXT NOT NULL,
    "verifierOrg" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "requestedFields" JSONB NOT NULL,
    "approvedFields" JSONB,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "requestExpiresAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "credentialId" TEXT,

    CONSTRAINT "ConsentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRequest_reference_key" ON "ConsentRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRequest_credentialId_key" ON "ConsentRequest"("credentialId");

-- CreateIndex
CREATE INDEX "ConsentRequest_studentId_status_idx" ON "ConsentRequest"("studentId", "status");

-- CreateIndex
CREATE INDEX "ConsentRequest_verifierUserId_createdAt_idx" ON "ConsentRequest"("verifierUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Student_verifyCode_key" ON "Student"("verifyCode");

-- AddForeignKey
ALTER TABLE "ConsentRequest" ADD CONSTRAINT "ConsentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRequest" ADD CONSTRAINT "ConsentRequest_verifierUserId_fkey" FOREIGN KEY ("verifierUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRequest" ADD CONSTRAINT "ConsentRequest_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "DigitalCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
