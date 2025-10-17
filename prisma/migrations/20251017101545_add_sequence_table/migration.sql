-- CreateTable
CREATE TABLE "Sequence" (
    "name" VARCHAR(50) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "Sequence_name_idx" ON "Sequence"("name");
