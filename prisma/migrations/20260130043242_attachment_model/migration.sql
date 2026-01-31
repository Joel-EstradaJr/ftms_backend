-- AlterTable
ALTER TABLE "revenue" ADD COLUMN     "department_id" INTEGER;

-- CreateTable
CREATE TABLE "department_local" (
    "id" INTEGER NOT NULL,
    "department_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "description" TEXT,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "department_local_department_name_idx" ON "department_local"("department_name");

-- CreateIndex
CREATE INDEX "department_local_is_active_idx" ON "department_local"("is_active");

-- CreateIndex
CREATE INDEX "department_local_is_deleted_idx" ON "department_local"("is_deleted");

-- CreateIndex
CREATE INDEX "attachment_entity_type_entity_id_idx" ON "attachment"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "attachment_entity_type_idx" ON "attachment"("entity_type");

-- CreateIndex
CREATE INDEX "attachment_file_type_idx" ON "attachment"("file_type");

-- CreateIndex
CREATE INDEX "attachment_is_deleted_idx" ON "attachment"("is_deleted");

-- CreateIndex
CREATE INDEX "attachment_created_at_idx" ON "attachment"("created_at");

-- CreateIndex
CREATE INDEX "revenue_department_id_idx" ON "revenue"("department_id");

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department_local"("id") ON DELETE SET NULL ON UPDATE CASCADE;
