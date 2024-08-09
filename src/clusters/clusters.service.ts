import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Cluster } from "@prisma/client";
import { RepositoriesService } from "src/repositories/repositories.service";
import { ComparisonsService } from "src/comparisons/comparisons.service";
import { createHash } from 'crypto';
import { compoundHash } from "src/shared";
import { GithubService } from "src/github/github.service";

/**
 * Servicio que maneja todas las operaciones relacionadas con los clusters.
 */
@Injectable()
export class ClustersService {

    constructor(
        private repository: RepositoriesService,
        private comparisons: ComparisonsService,
        private github: GithubService,
        private prisma: PrismaService) {
    }

    async getAllClusters(): Promise<Cluster[]> {
        return this.prisma.cluster.findMany({
            include: {
                comparisons: {
                    select: {
                        repositories: true,
                        pairs: true,
                    }
                }
            }
        });
    }

    async getClusterById(id: number): Promise<Cluster> {
        const clusterFind = this.prisma.cluster.findUnique({
            where: {
                id: id
            },
            include: {
                comparisons: {
                    select : {
                        id: true,
                        sha: true,
                        similarity: true,
                        repositories: true,
                        pairs: {
                            select: {
                                id: true,
                                similarity: true,
                                leftFilepath: true,
                                rightFilepath: true,
                            }
                        }
                    }
                }
            }
        });
        return clusterFind;
    }

    /**
     * Método que obtiene un cluster por su SHA.
     * SHA es un hash único que identifica un cluster.
     * @param sha
     * @returns Cluster data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE
    async getClusterBySha(sha: string): Promise<any> {
        const clusterFind = this.prisma.cluster.findUnique({
            where: {
                sha: sha
            },
            include: {
                comparisons: {
                    select: {
                        id: true,
                        sha: true,
                        similarity: true,
                        comparisonDate: true,

                        repositories: {
                            select: {
                                id: true,
                                name: true,
                                owner: true,
                                sha: true,
                            }
                        },
                        pairs: {
                            select: {
                                id: true,
                                similarity: true,
                                leftFilepath: true,
                                lineCountLeft: true,
                                rightFilepath: true,
                                lineCountRight: true,
                                fragments: true,

                                files: {
                                    select: {
                                        filepath: true,
                                        sha: true,
                                        id: true,
                                        lineCount: true,
                                        repositoryId: true,
                                        type: true,
                                        repository: {
                                            select: {
                                                id: true,
                                                name: true,
                                                owner: true,
                                                totalLines: true,
                                                sha: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const cf = await clusterFind;
        const comparisons = cf.comparisons;

        const groupedByRepository = comparisons.reduce((acc, comparison) => {
            comparison.pairs.forEach(pair => {
                let leftFile = pair.files.find(f => f.filepath === pair.leftFilepath);
                let rightFile = pair.files.find(f => f.filepath === pair.rightFilepath);

                pair.files.forEach(file => {
                    const { repositoryId, filepath, repository } = file;
                    if (!acc[repositoryId]) {
                        acc[repositoryId] = {
                            type: "node",
                            class: "repository",
                            name: repository.owner + "/" + repository.name,
                            fever: 0,
                            value: 0,
                            id: repository.id,
                            sha: repository.sha,
                            repo: repository.name,
                            owner: repository.owner,
                            numberOfFolders: 0,
                            numberOfFiles: 0,
                            repoLines: 0,
                            edges: [],
                            children: []
                        };
                    }
                    const pathComponents = filepath.split("/");
                    pathComponents.pop();
                    const folderPath = pathComponents.join("/");

                    let folder = acc[repositoryId].children.find(f => f.folderPath === folderPath);
                    if (!folder) {
                        let fileType = "Unknown";
                        if (file.type === "Controller" || file.type === "Service" || file.type === "Repository") {
                            fileType = file.type;
                        }
                        folder = {
                            type: "node",
                            class: "folder",
                            name: folderPath.split("/").pop(),
                            fever: 0,
                            value: 0,
                            folderType: fileType,
                            folderPath,
                            folderLines: 0,
                            numberOfFiles: 0,
                            edges: [],
                            children: []
                        };

                        acc[repositoryId].children.push(folder);
                    }

                    const link = {
                        similarity: pair.similarity,
                        pairFileId: pair.leftFilepath !== filepath ? leftFile.id : rightFile.id,
                        pairFileSha: pair.leftFilepath !== filepath ? leftFile.sha : rightFile.sha,
                        pairFileSide: pair.leftFilepath !== filepath ? "left" : "right",
                        pairFilePath: pair.leftFilepath !== filepath ? pair.leftFilepath : pair.rightFilepath,
                        pairFileType: pair.leftFilepath !== filepath ? leftFile.type : rightFile.type,
                        pairFileLines: pair.leftFilepath !== filepath ? leftFile.lineCount : rightFile.lineCount,
                        pairFileRepository: comparison.repositories.find(r => r.id !== repositoryId).id,
                        pairFileRepositoryName: comparison.repositories.find(r => r.id !== repositoryId).name,
                        pairFileRepositoryOwner: comparison.repositories.find(r => r.id !== repositoryId).owner,
                        fragments: pair.fragments,
                        pairId: pair.id
                    };

                    const existingFileIndex = folder.children.findIndex(f => f.filepath === filepath);

                    if (existingFileIndex !== -1) {
                        folder.children[existingFileIndex].links.push(link);
                    } else {
                        folder.children.push({
                            type: "leaf",
                            class: "file",
                            name: filepath.split("/").pop().split(".").shift(),
                            value: file.lineCount,
                            fever: 0,
                            id: file.id,
                            sha: file.sha,
                            filepath,
                            fileType: file.type,
                            lines: file.lineCount,
                            links: [link]
                        });
                    }
                });
            });
            return acc;
        }, {});

        const result = {
            id: cf.id,
            sha: cf.sha,
            date: cf.clusterDate,
            numberOfRepos: 0,
            numberOfFolders: 0,
            numberOfFiles: 0,
            totalLines: 0,
            repositories: []
        };

        Object.keys(groupedByRepository).forEach(repositoryId => {
            const repo = groupedByRepository[repositoryId];
            let foldersArray = Object.keys(repo.children).map(folderPath => repo.children[folderPath]);
            
            foldersArray.forEach(folder => {
                folder.children.forEach(file => {
                    file.links = file.links.filter(link => {
                        return link.pairFileType === file.fileType;
                    });
                });

                folder.children = folder.children.filter(file => {
                    return file.fileType === folder.folderType;
                });
            });
            foldersArray = foldersArray.filter(folder => {
                return ["Controller", "Service", "Repository"].includes(folder.folderType) && folder.children.every(child => child.links.length > 0);
            });
            
            repo.children = foldersArray;
            if (repo.children.length > 0) {
                result.repositories.push(repo);
            }
        });

        result.repositories.forEach(repo => {
            repo.children.forEach(folder => {
                folder.children.forEach(file => {
                    const totalSimilarity = file.links.reduce((acc, link) => acc + link.similarity, 0);
                    const averageFever = file.links.length > 0 ? totalSimilarity / file.links.length : 0;
                    file.fever = averageFever;
                });
                const totalFiles = folder.children.length;
                const totalLines = folder.children.reduce((acc, file) => acc + file.lines, 0);
                const totalFolderFever = folder.children.reduce((acc, file) => acc + file.fever, 0);
                const averageFolderFever = folder.children.length > 0 ? totalFolderFever / folder.children.length : 0;
                folder.numberOfFiles = totalFiles;
                folder.folderLines = totalLines;
                folder.fever = averageFolderFever;
            });
            const totalFiles = repo.children.reduce((acc, folder) => acc + folder.numberOfFiles, 0);
            const totalFolders = repo.children.length;
            const totalRepoLines = repo.children.reduce((acc, folder) => acc + folder.folderLines, 0);
            const totalRepoFever = repo.children.reduce((acc, folder) => acc + folder.fever, 0);
            const averageRepoFever = repo.children.length > 0 ? totalRepoFever / repo.children.length : 0;
            repo.numberOfFiles = totalFiles;
            repo.numberOfFolders = totalFolders;
            repo.repoLines = totalRepoLines;
            repo.fever = averageRepoFever;
        });
        result.numberOfRepos = result.repositories.length;
        result.numberOfFolders = result.repositories.reduce((acc, repo) => acc + repo.numberOfFolders, 0);
        result.numberOfFiles = result.repositories.reduce((acc, repo) => acc + repo.numberOfFiles, 0);
        result.totalLines = result.repositories.reduce((acc, repo) => acc + repo.repoLines, 0);

        return result;
    }

    /**
     * Método que crea un cluster a partir de una lista de repositorios.
     * @param repos
     * @param username
     * @returns Cluster data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE
    async createCluster(repos: any[], username: string) {
        console.log(repos);
        console.log(username);

        const repositories = await Promise.all(repos.map(async (repo) => {
            return await this.github.getFilteredRepositoryContent(repo.owner, repo.name, username);
        }));

        const concatenatedShas = repositories.map(repo => repo.sha).join('');
        const currentTime = new Date().toISOString();
        const clusterSha = createHash('sha256').update(concatenatedShas + currentTime).digest('hex');

        let cluster = await this.prisma.cluster.create({
            data: {
                sha: clusterSha,
                clusterDate: new Date(),
                numberOfRepos: repositories.length
            }
        });

        for (let i = 0; i < repositories.length; i++) {
            for (let j = i + 1; j < repositories.length; j++) {
                let comparison = await this.comparisons.createComparation(repositories[i], repositories[j], cluster.id);
                cluster = await this.prisma.cluster.update({
                    where: { id: cluster.id },
                    data: {
                        comparisons: { connect: { id: comparison.id } }
                    }
                });

                comparison = await this.prisma.comparison.update({
                    where: { id: comparison.id },
                    data: {
                        clusters: { connect: { id: cluster.id } }
                    }
                });
            }
        }

        const newCluster = await this.prisma.cluster.findUnique({
            where: { id: cluster.id },
            include: {
                comparisons: {
                    include: {
                        repositories: true,
                    }
                }
            }
        });

        const rps = repositories.map(repo => {
            return {
                name: repo.name,
                owner: repo.owner,
            };
        });

        return { ...newCluster, repositories: rps };
    }

    async updateCluster(id: number, repos: any[], username: string) {
        const repositories = await Promise.all(repos.map(async (repo) => {
            return await this.github.getFilteredRepositoryContent(repo.owner, repo.name, username);
        }));

        let cluster = await this.prisma.cluster.update({
            where: { id: id },
            data: {
                clusterDate: new Date(),
                numberOfRepos: repositories.length
            }
        });

        for (let i = 0; i < repositories.length; i++) {
            for (let j = i + 1; j < repositories.length; j++) {
                let comparison = await this.comparisons.createComparation(repositories[i], repositories[j], cluster.id);
                cluster = await this.prisma.cluster.update({
                    where: { id: cluster.id },
                    data: {
                        comparisons: { connect: { id: comparison.id } }
                    }
                });

                comparison = await this.prisma.comparison.update({
                    where: { id: comparison.id },
                    data: {
                        clusters: { connect: { id: cluster.id } }
                    }
                });
            }
        }

        const newCluster = await this.prisma.cluster.findUnique({
            where: { id: cluster.id },
            include: {
                comparisons: {
                    include: {
                        repositories: true,
                    }
                }
            }
        });

        const rps = repositories.map(repo => {
            return {
                name: repo.name,
                owner: repo.owner,
            };
        });

        return { ...newCluster, repositories: rps };
    }

    /**
     * Método que actualiza un cluster a partir de una lista de repositorios.
     * SHA es un hash único que identifica un cluster.
     * @param sha
     * @param repos
     * @param username
     * @returns Cluster data.
    */
    // ARREGLAR EL TIPO QUE DEVUELVE
    async updateClusterBySha(sha: string, repos: any[], username: string) {
        const repositories = await Promise.all(repos.map(async (repo) => {
            return await this.github.getFilteredRepositoryContent(repo.owner, repo.name, username);
        }));

        let cluster = await this.prisma.cluster.update({
            where: { sha: sha },
            data: {
                numberOfRepos: repositories.length
            }
        });

        for (let i = 0; i < repositories.length; i++) {
            for (let j = i + 1; j < repositories.length; j++) {
                let comparison = await this.comparisons.createComparation(repositories[i], repositories[j], cluster.id);
                cluster = await this.prisma.cluster.update({
                    where: { id: cluster.id },
                    data: {
                        comparisons: { connect: { id: comparison.id } }
                    }
                });

                comparison = await this.prisma.comparison.update({
                    where: { id: comparison.id },
                    data: {
                        clusters: { connect: { id: cluster.id } }
                    }
                });
            }
        }

        const newCluster = await this.prisma.cluster.findUnique({
            where: { id: cluster.id },
            include: {
                comparisons: {
                    include: {
                        repositories: true,
                    }
                }
            }
        });

        const rps = repositories.map(repo => {
            return {
                name: repo.name,
                owner: repo.owner,
            };
        });

        return { ...newCluster, repositories: rps };
    }

    async getFilesByClusterId(clusterId: number) {
        const comparisons = await this.prisma.cluster.findUnique({
            where: { id: clusterId },
            select: { comparisons: { select: { id: true } } },
        });
        const comparisonIds = comparisons.comparisons.map(c => c.id);
        
        const pairs = await this.prisma.pair.findMany({
            where: { comparisonId: { in: comparisonIds } },
            select: { id: true },
        });
        const pairIds = pairs.map(p => p.id);
    
        const files = await this.prisma.file.findMany({
            where: {
                pairs: {
                some: { id: { in: pairIds } },
                },
            },
        });
    
        return files;
    }

    /**
     * Método que obtiene los archivos de un cluster a partir de su SHA.
     * SHA es un hash único que identifica un cluster.
     * @param sha
     * @returns Files data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE    
    async getFilesByClusterSha(sha: string) {
        const comparisons = await this.prisma.cluster.findUnique({
            where: { sha: sha },
            select: { comparisons: { select: { id: true } } },
        });
        const comparisonIds = comparisons.comparisons.map(c => c.id);
        
        const pairs = await this.prisma.pair.findMany({
            where: { comparisonId: { in: comparisonIds } },
            select: { id: true },
        });
        const pairIds = pairs.map(p => p.id);
    
        const files = await this.prisma.file.findMany({
            where: {
                pairs: {
                some: { id: { in: pairIds } },
                },
            },
        });
    
        return files;
    }

    async getPairSimilaritiesByClusterId(clusterId: number) {
        const comparisons = await this.prisma.cluster.findUnique({
            where: { id: clusterId },
            select: { comparisons: { select: { id: true } } },
        });
        const comparisonIds = comparisons.comparisons.map(c => c.id);
        
        let pairs = await this.prisma.pair.findMany({
            where: { comparisonId: { in: comparisonIds } },
            select: {
                id: true,
                similarity: true,
                files: {
                    select: {
                        id: true,
                        sha: true,
                        repository: {
                            select: {
                                id: true,
                                name: true,
                                owner: true,
                            },
                        },
                        filepath: true,
                        type: true,
                    }
                }
            },
        });

        pairs = pairs.filter(pair => {
            if (pair.files.length === 1 && (pair.files[0].type === "Controller" || pair.files[0].type === "Service" || pair.files[0].type === "Repository")) {
                return true;
            }
            else if (pair.files.length === 2 && pair.files[0].type === pair.files[1].type
                && (pair.files[0].type === "Controller" || pair.files[0].type === "Service" || pair.files[0].type === "Repository")
            ) {
                return true;
            }
            return false;
        });
    
        return pairs;
    }

    /**
     * Método que obtiene las similitudes de los pares de un cluster a partir de su SHA.
     * SHA es un hash único que identifica un cluster.
     * @param sha
     * @returns Pair similarities data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE
    async getPairSimilaritiesByClusterSha(sha: string) {
        const comparisons = await this.prisma.cluster.findUnique({
            where: { sha: sha },
            select: { comparisons: { select: { id: true } } },
        });
        const comparisonIds = comparisons.comparisons.map(c => c.id);
        
        let pairs = await this.prisma.pair.findMany({
            where: { comparisonId: { in: comparisonIds } },
            select: {
                id: true,
                similarity: true,
                files: {
                    select: {
                        id: true,
                        sha: true,
                        repository: {
                            select: {
                                id: true,
                                name: true,
                                owner: true,
                            },
                        },
                        filepath: true,
                        type: true,
                    }
                }
            },
        });

        pairs = pairs.filter(pair => {
            if (pair.files.length === 1 && (pair.files[0].type === "Controller" || pair.files[0].type === "Service" || pair.files[0].type === "Repository")) {
                return true;
            }
            else if (pair.files.length === 2 && pair.files[0].type === pair.files[1].type
                && (pair.files[0].type === "Controller" || pair.files[0].type === "Service" || pair.files[0].type === "Repository")
            ) {
                return true;
            }
            return false;
        });
    
        return pairs;
    }

    /**
     * Método que crea un cluster a partir de una lista de repositorios.
     * @param repos
     * @param username
     * @returns Cluster data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE
    async makeCluster(repos: any[], username: string) {
        console.log(repos);
        console.log(username);

        const repositoryContents = await Promise.all(repos.map(async (repo) => {
            return await this.github.getFilteredRepositoryContent(repo.owner, repo.name, username);
        }));

        console.log("Contenido de los repositorios obtenido");

        const clusterSha = compoundHash(repositoryContents, true);
        let cluster = await this.prisma.cluster.create({
            data: {
                sha: clusterSha,
                clusterDate: new Date(),
                numberOfRepos: repos.length
            }
        });

        for (let i = 0; i < repositoryContents.length; i++) {
            for (let j = i + 1; j < repositoryContents.length; j++) {
                console.log(`\nComparando ${repositoryContents[i].name} con ${repositoryContents[j].name}`);
                let comparison = await this.comparisons.makeComparison(repositoryContents[i], repositoryContents[j]);
                console.log(`Comparación realizada: ${comparison.id}`);
                cluster = await this.prisma.cluster.update({
                    where: { id: cluster.id },
                    data: {
                        comparisons: { connect: { id: comparison.id } }
                    }
                });

                comparison = await this.prisma.comparison.update({
                    where: { id: comparison.id },
                    data: {
                        clusters: { connect: { id: cluster.id } }
                    }
                });
            }
        }

        const newCluster = await this.prisma.cluster.findUnique({
            where: { id: cluster.id },
            include: {
                comparisons: {
                    include: {
                        repositories: true,
                    }
                }
            }
        });

        return { ...newCluster, repositories: repos };

        return cluster;
    }

    async doCluster(repos: any[], username: string) {
        console.log(repos);
        console.log(username);

        const repositoryContents = await Promise.all(repos.map(async (repo) => {
            return await this.github.getFilteredRepositoryContent(repo.owner, repo.name, username);
        }));

        console.log("Contenido de los repositorios obtenido");

        const clusterSha = compoundHash(repositoryContents, true);
        let cluster = await this.prisma.cluster.create({
            data: {
                sha: clusterSha,
                clusterDate: new Date(),
                numberOfRepos: repos.length
            }
        });

        for (let i = 0; i < repositoryContents.length; i++) {
            for (let j = i + 1; j < repositoryContents.length; j++) {
                console.log(`\nComparando ${repositoryContents[i].name} con ${repositoryContents[j].name}`);
                let comparison = await this.comparisons.makeComparison(repositoryContents[i], repositoryContents[j]);
                console.log(`Comparación realizada: ${comparison.id}`);
                cluster = await this.prisma.cluster.update({
                    where: { id: cluster.id },
                    data: {
                        comparisons: { connect: { id: comparison.id } }
                    }
                });

                comparison = await this.prisma.comparison.update({
                    where: { id: comparison.id },
                    data: {
                        clusters: { connect: { id: cluster.id } }
                    }
                });
            }
        }

        return cluster;
    }
}
