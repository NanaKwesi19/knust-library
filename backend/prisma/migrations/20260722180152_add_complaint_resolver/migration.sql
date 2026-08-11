-- AlterTable
ALTER TABLE "maintenance_complaints" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedById" INTEGER;

-- AddForeignKey
ALTER TABLE "maintenance_complaints" ADD CONSTRAINT "maintenance_complaints_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
