/*
  Warnings:

  - Adds fulfillment tracking to reservations: `readyAt` marks when a held
    copy became available for pickup, and `heldCopyId` links the reservation
    to the specific physical copy being held.

*/
-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "heldCopyId" INTEGER;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_heldCopyId_fkey" FOREIGN KEY ("heldCopyId") REFERENCES "book_copies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
