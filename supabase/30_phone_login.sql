BEGIN;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneE164" TEXT,
ALTER COLUMN "employeeId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");


COMMIT;
