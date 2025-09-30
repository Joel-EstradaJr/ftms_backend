-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "file_id" TEXT,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "path" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GoogleOAuthToken" (
    "id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT NOT NULL,
    "scope" TEXT,
    "token_type" TEXT,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleOAuthToken_pkey" PRIMARY KEY ("id")
);
