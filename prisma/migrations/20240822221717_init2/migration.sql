/*
  Warnings:

  - You are about to drop the `Cluster` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ClusterToComparison` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ClusterToComparison" DROP CONSTRAINT "_ClusterToComparison_A_fkey";

-- DropForeignKey
ALTER TABLE "_ClusterToComparison" DROP CONSTRAINT "_ClusterToComparison_B_fkey";

-- DropTable
DROP TABLE "Cluster";

-- DropTable
DROP TABLE "_ClusterToComparison";

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "sha" TEXT NOT NULL,
    "groupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numberOfRepos" INTEGER NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ComparisonToGroup" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_sha_key" ON "Group"("sha");

-- CreateIndex
CREATE UNIQUE INDEX "_ComparisonToGroup_AB_unique" ON "_ComparisonToGroup"("A", "B");

-- CreateIndex
CREATE INDEX "_ComparisonToGroup_B_index" ON "_ComparisonToGroup"("B");

-- AddForeignKey
ALTER TABLE "_ComparisonToGroup" ADD CONSTRAINT "_ComparisonToGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Comparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComparisonToGroup" ADD CONSTRAINT "_ComparisonToGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
