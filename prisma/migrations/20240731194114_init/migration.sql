-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "githubId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "githubToken" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cluster" (
    "id" SERIAL NOT NULL,
    "sha" TEXT NOT NULL,
    "clusterDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numberOfRepos" INTEGER NOT NULL,

    CONSTRAINT "Cluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comparison" (
    "id" SERIAL NOT NULL,
    "sha" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "comparisonDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" SERIAL NOT NULL,
    "sha" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalLines" INTEGER NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "sha" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "lineCount" INTEGER NOT NULL,
    "type" TEXT,
    "language" TEXT,
    "repositoryId" INTEGER NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pair" (
    "id" SERIAL NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "leftFilepath" TEXT NOT NULL,
    "leftFileSha" TEXT NOT NULL,
    "charCountLeft" INTEGER NOT NULL,
    "lineCountLeft" INTEGER NOT NULL,
    "rightFilepath" TEXT NOT NULL,
    "rightFileSha" TEXT NOT NULL,
    "charCountRight" INTEGER NOT NULL,
    "lineCountRight" INTEGER NOT NULL,
    "comparisonId" INTEGER NOT NULL,

    CONSTRAINT "Pair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fragment" (
    "id" SERIAL NOT NULL,
    "leftstartRow" INTEGER NOT NULL,
    "leftendRow" INTEGER NOT NULL,
    "leftstartCol" INTEGER NOT NULL,
    "leftendCol" INTEGER NOT NULL,
    "rightstartRow" INTEGER NOT NULL,
    "rightendRow" INTEGER NOT NULL,
    "rightstartCol" INTEGER NOT NULL,
    "rightendCol" INTEGER NOT NULL,
    "pairId" INTEGER NOT NULL,

    CONSTRAINT "Fragment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClusterToComparison" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ComparisonToRepository" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_FileToPair" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_sha_key" ON "Cluster"("sha");

-- CreateIndex
CREATE UNIQUE INDEX "Comparison_sha_key" ON "Comparison"("sha");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_sha_key" ON "Repository"("sha");

-- CreateIndex
CREATE UNIQUE INDEX "File_sha_key" ON "File"("sha");

-- CreateIndex
CREATE UNIQUE INDEX "_ClusterToComparison_AB_unique" ON "_ClusterToComparison"("A", "B");

-- CreateIndex
CREATE INDEX "_ClusterToComparison_B_index" ON "_ClusterToComparison"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ComparisonToRepository_AB_unique" ON "_ComparisonToRepository"("A", "B");

-- CreateIndex
CREATE INDEX "_ComparisonToRepository_B_index" ON "_ComparisonToRepository"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FileToPair_AB_unique" ON "_FileToPair"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToPair_B_index" ON "_FileToPair"("B");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pair" ADD CONSTRAINT "Pair_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fragment" ADD CONSTRAINT "Fragment_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "Pair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToComparison" ADD CONSTRAINT "_ClusterToComparison_A_fkey" FOREIGN KEY ("A") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClusterToComparison" ADD CONSTRAINT "_ClusterToComparison_B_fkey" FOREIGN KEY ("B") REFERENCES "Comparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComparisonToRepository" ADD CONSTRAINT "_ComparisonToRepository_A_fkey" FOREIGN KEY ("A") REFERENCES "Comparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComparisonToRepository" ADD CONSTRAINT "_ComparisonToRepository_B_fkey" FOREIGN KEY ("B") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToPair" ADD CONSTRAINT "_FileToPair_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToPair" ADD CONSTRAINT "_FileToPair_B_fkey" FOREIGN KEY ("B") REFERENCES "Pair"("id") ON DELETE CASCADE ON UPDATE CASCADE;
