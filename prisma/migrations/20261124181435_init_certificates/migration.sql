-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "activityTitle" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "workloadHours" INTEGER,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verificationCode_key" ON "certificates"("verificationCode");

-- CreateIndex
CREATE INDEX "certificates_recipientEmail_idx" ON "certificates"("recipientEmail");

-- CreateIndex
CREATE INDEX "certificates_issuerName_idx" ON "certificates"("issuerName");
