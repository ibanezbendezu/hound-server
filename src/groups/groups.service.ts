import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Group } from "@prisma/client";
import { ComparisonsService } from "src/comparisons/comparisons.service";
import { GithubService } from "src/github/github.service";
import { compoundHash } from "src/shared";

import { GroupDTO } from "./dto/all-groups.dto";
import { CreateGroupDTO } from "./dto/create-group.dto";
import { ClassPairDTO, ClassReportDTO, GroupReportDTO, ReportRepositoryDTO } from "./dto/group.report.dto";
import { GroupSummaryDTO } from "./dto/group-summary.dto";
import { GroupOverallDTO } from "./dto/group-overall.dto";
import { GraphGroupDTO, GraphLayerDTO, GraphRepositoryDTO } from "./dto/group.graph.dto";

const { PromisePool } = require('@supercharge/promise-pool');

/**
 * Servicio que maneja todas las operaciones relacionadas con los groups.
 */
@Injectable()
export class GroupsService {

    constructor(
        private comparisons: ComparisonsService,
        private github: GithubService,
        private prisma: PrismaService) {
    }

    async getAllGroups(): Promise<Group[]> {
        return this.prisma.group.findMany({
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

    /* istanbul ignore next */
    async groupPrismaQueryBySha(sha: string) {
        return this.prisma.group.findUnique({
            where: {
                sha: sha
            },
            include: {
                comparisons: {
                    select: {
                        id: true,
                        sha: true,
                        comparisonDate: true,
                        repositories: {
                            select: {
                                id: true,
                                name: true,
                                owner: true,
                                sha: true,
                                totalLines: true,
                                files: {
                                    select: {
                                        id: true,
                                        filepath: true,
                                        sha: true,
                                        lineCount: true,
                                        type: true,
                                        pairs: {
                                            where: {
                                                comparison: {
                                                    groups: {
                                                        some: {
                                                            sha: sha
                                                        },
                                                    },
                                                },
                                            },
                                            select: {
                                                id: true,
                                                similarity: true,
                                                totalOverlap: true,
                                                longestFragment: true,
                                                leftFilepath: true,
                                                rightFilepath: true,
                                                leftFileSha: true,
                                                rightFileSha: true,
                                                files: {
                                                    select: {
                                                        sha: true,
                                                        lineCount: true,
                                                        repository: {
                                                            select: {
                                                                id: true,
                                                                name: true,
                                                                owner: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            }
                                        }
                                    }
                                }
                            }
                        },
                    }
                }
            }
        });
    }

    async getGroupOverallBySha(sha: string): Promise<GroupOverallDTO> {
        const groupFind = this.groupPrismaQueryBySha(sha);
        if (!groupFind) throw new Error("Group not found");
        const group = await groupFind;

        const repositories = Array.from(
            new Map(
                group.comparisons.flatMap(comparison => comparison.repositories)
                    .map(repo => {
                        const { id, name, owner, sha, files } = repo;
                        const repositoryLines = files.reduce((acc, file) => acc + file.lineCount, 0);
                        const numberOfFiles = files.length;
        
                        return [id, { id, name, owner, sha, repositoryLines, numberOfFiles }];
                    })
            ).values()
        );

        const pairs = await this.prisma.pair.findMany({
            where: {
                comparison: {
                    groups: {
                        some: {
                            sha: sha,
                        },
                    },
                },
            },
            select: {
                id: true,
                similarity: true,
                totalOverlap: true,
                longestFragment: true,
            },
        });

        const result = {
            id: group.id,
            sha: group.sha,
            date: group.groupDate,
            numberOfRepos: group.numberOfRepos,
            numberOfFiles: repositories.reduce((acc, repo) => acc + repo.numberOfFiles, 0),
            groupLines: repositories.reduce((acc, repo) => acc + repo.repositoryLines, 0),
            pairs: pairs,
        };

        return result;
    }

    async getGroupReportBySha(sha: string): Promise<GroupReportDTO> {
        const groupFind = this.groupPrismaQueryBySha(sha);
        if (!groupFind) throw new Error("Group not found");
        const group = await groupFind;

        const repositories: ReportRepositoryDTO[] = Array.from(
            new Map(
                group.comparisons.flatMap(comparison => comparison.repositories)
                    .map(repo => {
                        const { id, name, owner, sha, files } = repo;

                        const classMap: Record<string, ClassReportDTO> = {};
                        files.forEach(file => {
                            const type = file.type;
                            if (!classMap[type]) {
                                classMap[type] = {
                                    name: type, averageMatch: 0, standardDeviation: 0, numberOfFiles: 0, classLines: 0,
                                    class: type, files: [],
                                };
                            }
                            const maxOverlap = Math.max(...file.pairs.map(pair => pair.totalOverlap));
                            classMap[type].files.push(
                                {
                                    id: file.id,
                                    filepath: file.filepath,
                                    class: file.type,
                                    sha: file.sha,
                                    lineCount: file.lineCount,
                                    classMatch: file.pairs.reduce((acc, pair) => acc + pair.similarity, 0) / file.pairs.length,
                                    top: (() => {
                                        const maxSimilarity = Math.max(...file.pairs.map(pair => pair.similarity));
                                        const topPairs = file.pairs.filter(pair => pair.similarity === maxSimilarity);
                                        const topPair = topPairs.sort((a, b) => b.totalOverlap - a.totalOverlap)[0];
                                        return {
                                            id: topPair.id,
                                            similarity: topPair.similarity,
                                            totalOverlap: topPair.totalOverlap,
                                            normalizedImpact: topPair.totalOverlap / maxOverlap,
                                            longestFragment: topPair.longestFragment,
                                            lineCount: topPair.files.find(f => f.sha !== file.sha).lineCount,
                                            sha: topPair.leftFileSha === file.sha ? topPair.rightFileSha : topPair.leftFileSha,
                                            filepath: topPair.leftFileSha === file.sha ? topPair.rightFilepath : topPair.leftFilepath,
                                            repositoryName: topPair.files.find(f => f.sha !== file.sha).repository.name,
                                            repositoryOwner: topPair.files.find(f => f.sha !== file.sha).repository.owner,
                                        };
                                    })(),
                                    pairs: file.pairs.map(pair => {
                                        return {
                                            id: pair.id,
                                            similarity: pair.similarity,
                                            totalOverlap: pair.totalOverlap,
                                            normalizedImpact: pair.totalOverlap / maxOverlap,
                                            longestFragment: pair.longestFragment,
                                            filepath: pair.leftFileSha === file.sha ? pair.rightFilepath : pair.leftFilepath,
                                            lineCount: pair.files.find(f => f.sha !== file.sha).lineCount,
                                            sha: pair.leftFileSha === file.sha ? pair.rightFileSha : pair.leftFileSha,
                                            repositoryId: pair.files.find(f => f.sha !== file.sha).repository.id,
                                            repositoryName: pair.files.find(f => f.sha !== file.sha).repository.name,
                                            repositoryOwner: pair.files.find(f => f.sha !== file.sha).repository.owner,
                                        };
                                    })
                                }
                            );
                            
                            classMap[type].averageMatch = classMap[type].files.reduce((acc, file) => acc + file.classMatch, 0) / classMap[type].files.length;
                            classMap[type].standardDeviation = this.std(classMap[type].files.map(file => file.classMatch));
                            classMap[type].numberOfFiles = classMap[type].files.length;
                            classMap[type].classLines = classMap[type].files.reduce((acc, file) => acc + file.lineCount, 0);
                        });
                        const classes = Object.values(classMap);
                        const repositoryLines = files.reduce((acc, file) => acc + file.lineCount, 0);
                        const numberOfFiles = files.length;
        
                        return [id, { id, name, owner, sha, repositoryLines, numberOfFiles, classes }];
                    })
            ).values()
        );

        const result: GroupReportDTO = {
            id: group.id,
            sha: group.sha,
            date: group.groupDate,
            numberOfRepos: group.numberOfRepos,
            numberOfFiles: repositories.reduce((acc, repo) => acc + repo.numberOfFiles, 0),
            groupLines: repositories.reduce((acc, repo) => acc + repo.repositoryLines, 0),
            repositories: repositories,
        };

        return result;
    }

    async getGroupGraphBySha(sha: string): Promise<GraphGroupDTO> {
        const groupFind = this.groupPrismaQueryBySha(sha);
        if (!groupFind) throw new Error("Group not found");
        const group = await groupFind;

        const repositories: GraphRepositoryDTO[] = Array.from(
            new Map(
                group.comparisons.flatMap(comparison => comparison.repositories)
                    .map(repo => {
                        const { id, name, owner, sha, files } = repo;

                        const layerMap: Record<string, GraphLayerDTO> = {};
                        files.forEach(file => {
                            const type = file.type;
                            if (!layerMap[type]) {
                                layerMap[type] = {
                                    name: type, averageMatch: 0, standardDeviation: 0, numberOfFiles: 0, layerLines: 0,
                                    layer: type, files: [],
                                };
                            }
                            const maxOverlap = Math.max(...file.pairs.map(pair => pair.totalOverlap));
                            layerMap[type].files.push(
                                {
                                    id: file.id,
                                    filepath: file.filepath,
                                    layer: file.type,
                                    sha: file.sha,
                                    lineCount: file.lineCount,
                                    layerMatch: file.pairs.reduce((acc, pair) => acc + pair.similarity, 0) / file.pairs.length,
                                    top: (() => {
                                        const maxSimilarity = Math.max(...file.pairs.map(pair => pair.similarity));
                                        const topPairs = file.pairs.filter(pair => pair.similarity === maxSimilarity);
                                        const topPair = topPairs.sort((a, b) => b.totalOverlap - a.totalOverlap)[0];
                                        return {
                                            id: topPair.id,
                                            similarity: topPair.similarity,
                                            totalOverlap: topPair.totalOverlap,
                                            normalizedImpact: topPair.totalOverlap / maxOverlap,
                                            longestFragment: topPair.longestFragment,
                                            lineCount: topPair.files.find(f => f.sha !== file.sha).lineCount,
                                            sha: topPair.leftFileSha === file.sha ? topPair.rightFileSha : topPair.leftFileSha,
                                            filepath: topPair.leftFileSha === file.sha ? topPair.rightFilepath : topPair.leftFilepath,
                                            repositoryName: topPair.files.find(f => f.sha !== file.sha).repository.name,
                                            repositoryOwner: topPair.files.find(f => f.sha !== file.sha).repository.owner,
                                        };
                                    })(),
                                    pairs: file.pairs.map(pair => {
                                        return {
                                            id: pair.id,
                                            similarity: pair.similarity,
                                            totalOverlap: pair.totalOverlap,
                                            normalizedImpact: pair.totalOverlap / maxOverlap,
                                            longestFragment: pair.longestFragment,
                                            filepath: pair.leftFileSha === file.sha ? pair.rightFilepath : pair.leftFilepath,
                                            lineCount: pair.files.find(f => f.sha !== file.sha).lineCount,
                                            sha: pair.leftFileSha === file.sha ? pair.rightFileSha : pair.leftFileSha,
                                            repositoryId: pair.files.find(f => f.sha !== file.sha).repository.id,
                                            repositoryName: pair.files.find(f => f.sha !== file.sha).repository.name,
                                            repositoryOwner: pair.files.find(f => f.sha !== file.sha).repository.owner,
                                        };
                                    })
                                }
                            );
                            
                            layerMap[type].averageMatch = layerMap[type].files.reduce((acc, file) => acc + file.layerMatch, 0) / layerMap[type].files.length;
                            layerMap[type].standardDeviation = this.std(layerMap[type].files.map(file => file.layerMatch));
                            layerMap[type].numberOfFiles = layerMap[type].files.length;
                            layerMap[type].layerLines = layerMap[type].files.reduce((acc, file) => acc + file.lineCount, 0);
                        });
                        const layers = Object.values(layerMap);
                        const repositoryLines = files.reduce((acc, file) => acc + file.lineCount, 0);
                        const numberOfFiles = files.length;
        
                        return [id, { id, name, owner, sha, repositoryLines, numberOfFiles, layers }];
                    })
            ).values()
        );

        const result: GraphGroupDTO = {
            id: group.id,
            sha: group.sha,
            date: group.groupDate,
            numberOfRepos: group.numberOfRepos,
            numberOfFiles: repositories.reduce((acc, repo) => acc + repo.numberOfFiles, 0),
            groupLines: repositories.reduce((acc, repo) => acc + repo.repositoryLines, 0),
            repositories: repositories,
        };

        return result;
    }

    /* istanbul ignore next */
    async getGroupHeriarquicalBySha(sha: string): Promise<any> {
        const groupFind = this.groupPrismaQueryBySha(sha);
        const group = await groupFind;

        /* const repositories = Array.from(
            new Map(
                group.comparisons.flatMap(comparison => comparison.repositories)
                    .map(repo => {
                        const { id, name, owner, sha, files } = repo;
                        const folderMap = {};
                        files.forEach(file => {
                            const folderPath = file.filepath.split('/').slice(0, -1).join('/');
                            const linesCount = file.lineCount;
                            if (!folderMap[folderPath]) {
                                folderMap[folderPath] = {
                                    name: file.filepath.split('/').slice(-2, -1), folderLines: 0, type: [], files: [],
                                };
                            }
                            folderMap[folderPath].folderLines += linesCount;
                            folderMap[folderPath].files.push(file);
                            if (!folderMap[folderPath].type.includes(file.type)) {
                                folderMap[folderPath].type.push(file.type);
                            }
                        });
                        const folders = Object.values(folderMap);
        
                        return [id, { id, name, owner, sha, folders }];
                    })
            ).values()
        ); */

        const repositories = Array.from(
            new Map(
                group.comparisons.flatMap(comparison => comparison.repositories)
                    .map(repo => {
                        const { id, name, owner, sha, files } = repo;
                        const classMap = {};
                        files.forEach(file => {
                            const type = file.type;
                            if (!classMap[type]) {
                                classMap[type] = {
                                    name: type, averageMatch: 0, standardDeviation: 0, numberOfFiles: 0,
                                    class: type, files: [],
                                };
                            }
                            const maxOverlap = Math.max(...file.pairs.map(pair => pair.totalOverlap));
                            classMap[type].files.push(
                                {
                                    id: file.id,
                                    filepath: file.filepath,
                                    class: file.type,
                                    sha: file.sha,
                                    lineCount: file.lineCount,
                                    classMatch: file.pairs.reduce((acc, pair) => acc + pair.similarity, 0),
                                    top: (() => {
                                        const maxSimilarity = Math.max(...file.pairs.map(pair => pair.similarity));
                                        const topPairs = file.pairs.filter(pair => pair.similarity === maxSimilarity);
                                        const topPair = topPairs.sort((a, b) => b.totalOverlap - a.totalOverlap)[0];

                                        return {
                                            similarity: topPair.similarity,
                                            totalOverlap: topPair.totalOverlap,
                                            normalizedImpact: topPair.totalOverlap / maxOverlap,
                                            longestFragment: topPair.longestFragment,
                                            filepath: topPair.leftFileSha === file.sha ? topPair.rightFilepath : topPair.leftFilepath,
                                            lineCount: topPair.files.find(f => f.sha !== file.sha).lineCount,
                                            sha: topPair.leftFileSha === file.sha ? topPair.rightFileSha : topPair.leftFileSha,
                                            repositoryName: topPair.files.find(f => f.sha !== file.sha).repository.name,
                                            repositoryOwner: topPair.files.find(f => f.sha !== file.sha).repository.owner,
                                        };
                                    })(),
                                    pairs: file.pairs.map(pair => {
                                        return {
                                            id: pair.id,
                                            similarity: pair.similarity,
                                            totalOverlap: pair.totalOverlap,
                                            normalizedImpact: pair.totalOverlap / maxOverlap,
                                            longestFragment: pair.longestFragment,
                                            filepath: pair.leftFileSha === file.sha ? pair.rightFilepath : pair.leftFilepath,
                                            lineCount: pair.files.find(f => f.sha !== file.sha).lineCount,
                                            sha: pair.leftFileSha === file.sha ? pair.rightFileSha : pair.leftFileSha,
                                            repositoryName: pair.files.find(f => f.sha !== file.sha).repository.name,
                                            repositoryOwner: pair.files.find(f => f.sha !== file.sha).repository.owner,
                                        };
                                    })
                                }
                            );
                            
                            classMap[type].averageMatch = classMap[type].files.reduce((acc, file) => acc + file.classMatch, 0) / classMap[type].files.length;
                            classMap[type].standardDeviation = this.std(classMap[type].files.map(file => file.classMatch));
                            classMap[type].numberOfFiles = classMap[type].files.length;
                        });
                        const classes = Object.values(classMap);
                        const repositoryLines = files.reduce((acc, file) => acc + file.lineCount, 0);
                        const numberOfFiles = files.length;
        
                        return [id, { id, name, owner, sha, repositoryLines, numberOfFiles, classes }];
                    })
            ).values()
        );

        const result = {
            id: group.id,
            sha: group.sha,
            date: group.groupDate,
            numberOfRepos: group.numberOfRepos,
            numberOfFiles: repositories.reduce((acc, repo) => acc + repo.numberOfFiles, 0),
            groupLines: repositories.reduce((acc, repo) => acc + repo.repositoryLines, 0),
            repositories: repositories,
        };

        return result;
    }

    async getGroupById(id: number): Promise<Group> {
        const groupFind = this.prisma.group.findUnique({
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
        return groupFind;
    }

    /**
     * Método que obtiene un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Group data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE
    /* istanbul ignore next */
    async getGroupBySha(sha: string): Promise<any> {
        const groupFind = this.prisma.group.findUnique({
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
                                totalOverlap: true,
                                longestFragment: true,
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

        const cf = await groupFind;
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
                        totalOverlap: pair.totalOverlap,
                        longestFragment: pair.longestFragment,
                        pairLineCount: pair.leftFilepath !== filepath ? rightFile.lineCount : leftFile.lineCount,
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
            date: cf.groupDate,
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
                    const maxOverlap = Math.max(...file.links.map(link => link.totalOverlap));
                    file.links.forEach(link => link.normalizedImpact = link.totalOverlap / maxOverlap);
                    const top = [...file.links].sort((a, b) => b.similarity - a.similarity)[0];
                    const totalSimilarity = file.links.reduce((acc, link) => acc + link.similarity, 0);
                    const averageFever = file.links.length > 0 ? totalSimilarity / file.links.length : 0;
                    file.fever = averageFever;
                    file.top = {pairId: top.pairId, pairFilePath: top.pairFilePath, similarity: top.similarity, repositoryName: top.pairFileRepositoryName };
                });
                const totalFiles = folder.children.length;
                const totalLines = folder.children.reduce((acc, file) => acc + file.lines, 0);
                const totalFolderFever = folder.children.reduce((acc, file) => acc + file.fever, 0);
                const averageFolderFever = folder.children.length > 0 ? totalFolderFever / folder.children.length : 0;
                folder.numberOfFiles = totalFiles;
                folder.folderLines = totalLines;
                folder.fever = averageFolderFever;
                folder.standardDeviation = this.std(folder.children.map(file => file.fever));
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
     * Método que obtiene un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Group data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE
    async getGroupSummaryBySha(sha: string): Promise<GroupSummaryDTO> {
        const groupFind = this.prisma.group.findUnique({
            where: {
                sha: sha
            },
            include: {
                comparisons: {
                    select: {
                        id: true
                    }
                }
            }
        });

        const cf = await groupFind;
        const comparisons = cf.comparisons;

        const result = {
            id: cf.id,
            sha: cf.sha,
            date: cf.groupDate,
            numberOfRepos: cf.numberOfRepos,
            comparissonsCompleted: comparisons.length,
        };

        return result;
    }

    /**
     * Método que actualiza un group a partir de una lista de repositorios.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @param repos
     * @param username
     * @returns Group data.
    */
    // ARREGLAR EL TIPO QUE DEVUELVE
    /* istanbul ignore next */
    async updateGroupBySha(sha: string, repos: any[], username: string) {
        console.log(repos);
        console.log(username);

        const repositories = await Promise.all(repos.map(async (repo) => {
            return await this.github.getFilteredRepositoryContent(repo.owner, repo.name, username);
        }));

        console.log("ACTUALIZANDO GRUPO...\n");
        const newNumberOfRepos = repositories.filter(repo => repo.content.length > 0).length;

        let group = await this.prisma.group.update({
            where: { sha: sha },
            data: {
                numberOfRepos: newNumberOfRepos
            }
        });

        console.log("\n> COMPARANDO REPOSITORIOS...");
        console.time("Tiempo en hacer todas las comparaciones");
        for (let i = 0; i < repositories.length; i++) {
            for (let j = i + 1; j < repositories.length; j++) {
                if (repositories[i].content.length > 0 && repositories[j].content.length > 0) {
                    console.log(`\n>>COMPARANDO ${repositories[i].name} CON ${repositories[j].name}`);
                    let comparison = await this.comparisons.createComparison(repositories[i], repositories[j]);
                    if (comparison) {
                        group = await this.prisma.group.update({
                            where: { id: group.id },
                            data: { comparisons: { connect: { id: comparison.id } } }
                        });

                        comparison = await this.prisma.comparison.update({
                            where: { id: comparison.id },
                            data: { groups: { connect: { id: group.id } } }
                        });
                    }
                }
            }
        }
        console.log("\n");
        console.timeEnd("Tiempo en hacer todas las comparaciones");
        console.log("COMPARACIONES REALIZADAS\n");
        console.log("------------------------------------\n\n");

        return group;
    }

    /**
     * Método que obtiene los archivos de un group a partir de su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Files data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE
    /* istanbul ignore next */
    async getFilesByGroupSha(sha: string) {
        const comparisons = await this.prisma.group.findUnique({
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

    /**
     * Método que obtiene las similitudes de los pares de un group a partir de su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Pair similarities data.
     */
    // ARREGLAR EL TIPO QUE DEVUELVE
    /* istanbul ignore next */
    async getPairSimilaritiesByGroupSha(sha: string) {
        const comparisons = await this.prisma.group.findUnique({
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
     * Método que hace la comparación de los repositorios.
     * @param repositoryContents
     * @param group
     * @returns void
     * */
    /* istanbul ignore next */
    async doComparison(repositoryContents: any[], group: any) {
        console.log("\n> COMPARANDO REPOSITORIOS...");
        console.time("Tiempo en hacer todas las comparaciones");
        for (let i = 0; i < repositoryContents.length; i++) {
            for (let j = i + 1; j < repositoryContents.length; j++) {
                console.log(`\n>>COMPARANDO ${repositoryContents[i].name} CON ${repositoryContents[j].name}`);
                let comparison = await this.comparisons.createComparison(repositoryContents[i], repositoryContents[j]);
                if (comparison) {
                    group = await this.prisma.group.update({
                        where: { id: group.id },
                        data: { comparisons: { connect: { id: comparison.id } } }
                    });
        
                    comparison = await this.prisma.comparison.update({
                        where: { id: comparison.id },
                        data: { groups: { connect: { id: group.id } } }
                    });
                }
            }
        }
        console.log("\n");
        console.timeEnd("Tiempo en hacer todas las comparaciones");
        console.log("COMPARACIONES REALIZADAS\n");
        console.log("------------------------------------\n\n");
    }

    /**
     * Método que crea un group a partir de una lista de repositorios.
     * @param repos
     * @param username
     * @returns Group data.
     */
    /* istanbul ignore next */
    async createGroup(repos: any[], username: string) {
        console.log("\nREPOSITORIOS A COMPARAR: ", repos);
        console.log("USUARIO QUE REALIZA LA COMPARACIÓN: ", username);

        const repositoryContents = await Promise.all(repos.map(async (repo) => {
            return await this.github.getFilteredRepositoryContent(repo.owner, repo.name, username);
        }));

        console.log("Contenido de los repositorios obtenido\n");
        console.log("NUMERO DE REPOSITORIOS: ", repositoryContents.length);
        
        console.log("CREANDO GRUPO...\n");
        const groupSha = compoundHash(repositoryContents, true);
        let group = await this.prisma.group.create({
            data: {
                sha: groupSha,
                groupDate: new Date(),
                numberOfRepos: repos.length
            }
        });

        this.doComparison(repositoryContents, group);

        return group;
    }

    sum(list:number[]) {
        return list.reduce((partialSum, a) => partialSum + a, 0);
    }

    std(arr: number[]) {
        const mean = this.sum(arr) / arr.length;
        const variance = this.sum(arr.map(v => (v - mean) ** 2));
        return Math.sqrt(variance);
    }
}
