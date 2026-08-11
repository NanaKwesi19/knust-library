/*
  Warnings:

  - A unique constraint covering the columns `[openLibraryKey]` on the table `books` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "books" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "openLibraryKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "books_openLibraryKey_key" ON "books"("openLibraryKey");
