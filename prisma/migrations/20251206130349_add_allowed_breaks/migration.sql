-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_UserAllowedBreaks" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserAllowedBreaks_AB_unique" ON "_UserAllowedBreaks"("A", "B");

-- CreateIndex
CREATE INDEX "_UserAllowedBreaks_B_index" ON "_UserAllowedBreaks"("B");

-- AddForeignKey
ALTER TABLE "_UserAllowedBreaks" ADD CONSTRAINT "_UserAllowedBreaks_A_fkey" FOREIGN KEY ("A") REFERENCES "BreakType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserAllowedBreaks" ADD CONSTRAINT "_UserAllowedBreaks_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
