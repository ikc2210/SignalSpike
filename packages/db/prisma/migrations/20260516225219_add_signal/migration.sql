-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "runFindingId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "queryTemplateId" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "signalType" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrls" TEXT[],
    "sourceDomains" TEXT[],
    "topicTags" TEXT[],
    "jurisdictionTags" TEXT[],
    "observedAt" TIMESTAMP(3) NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importance" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "changeType" TEXT,
    "eventDate" TIMESTAMP(3),
    "actorsMentioned" TEXT[],
    "topic" TEXT,
    "positionLabel" TEXT,
    "stance" TEXT,
    "strength" INTEGER,
    "evidenceSnippets" TEXT[],
    "priorityLabel" TEXT,
    "priorityDirection" TEXT,
    "momentum" INTEGER,
    "rationale" TEXT,
    "supportingSignalIds" TEXT[],
    "details" JSONB,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_runId_idx" ON "Signal"("runId");

-- CreateIndex
CREATE INDEX "Signal_runFindingId_idx" ON "Signal"("runFindingId");

-- CreateIndex
CREATE INDEX "Signal_entityId_idx" ON "Signal"("entityId");

-- CreateIndex
CREATE INDEX "Signal_objective_idx" ON "Signal"("objective");

-- CreateIndex
CREATE INDEX "Signal_observedAt_idx" ON "Signal"("observedAt");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MonitoringRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_runFindingId_fkey" FOREIGN KEY ("runFindingId") REFERENCES "RunFinding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
