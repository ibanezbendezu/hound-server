import { Injectable } from "@nestjs/common";
import { Dolos } from "src/dolos";
import { Comparison } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { createHash } from "crypto";

@Injectable()
export class ComparisonsService {

    constructor(
        private prisma: PrismaService) {
        if (!this.prisma) {
            throw new Error("PrismaService is not initialized");
        }
    }

    async createComparation(leftRepository: any, rightRepository: any, clusterId: number) {
        try {
            const dolosFile = new Dolos();

            const leftRepoFiles = await dolosFile.stringsToFiles(leftRepository.content);
            const rightRepoFiles = await dolosFile.stringsToFiles(rightRepository.content);

            const sortStrings = [leftRepository.sha, rightRepository.sha].sort();
            const sha = sortStrings.join("");

            const c = await this.prisma.comparison.findUnique({ where: { sha: sha } });
            if (c) {
                return c;
            }

            let repositoryA = await this.prisma.repository.findUnique({ where: { sha: leftRepository.sha } });
            if (!repositoryA) {
                repositoryA = await this.prisma.repository.create({
                    data: {
                        sha: leftRepository.sha,
                        owner: leftRepository.owner,
                        name: leftRepository.name,
                        totalLines: 0
                    }
                });
            }

            let repositoryB = await this.prisma.repository.findUnique({ where: { sha: rightRepository.sha } });
            if (!repositoryB) {
                repositoryB = await this.prisma.repository.create({
                    data: {
                        sha: rightRepository.sha,
                        owner: rightRepository.owner,
                        name: rightRepository.name,
                        totalLines: 0
                    }
                });
            }

            let comparison = await this.prisma.comparison.create({
                data: {
                    sha: sha,
                    similarity: 0.0,
                    comparisonDate: new Date(),
                    repositories: { connect: [{ id: repositoryA.id }, { id: repositoryB.id }] },
                }
            });

            repositoryA = await this.prisma.repository.update({
                where: { id: repositoryA.id },
                data: {
                    comparisons: { connect: { id: comparison.id } }
                }
            });

            repositoryB = await this.prisma.repository.update({
                where: { id: repositoryB.id },
                data: {
                    comparisons: { connect: { id: comparison.id } }
                }
            });

            console.log("Comparing repositories: ", leftRepository.name, rightRepository.name);

            for (const element of leftRepoFiles) {
                let fileA = await this.prisma.file.findUnique({
                    where: {
                        sha: element.file.sha
                    }
                });
                if (!fileA) {
                    const fileAType = this.identifyFileType(element.file.content);
                    const fileALanguage = this.getFileLanguage(element.file.path);
                    fileA = await this.prisma.file.create({
                        data: {
                            sha: element.sha,
                            filepath: element.file.path,
                            charCount: element.file.charCount,
                            lineCount: element.file.lineCount,
                            repository: { connect: { id: repositoryA.id } },
                            type: fileAType,
                            language: fileALanguage
                        }
                    });
                    repositoryA = await this.prisma.repository.update({
                        where: { id: repositoryA.id },
                        data: {
                            totalLines: repositoryA.totalLines + fileA.lineCount,
                            files: { connect: { id: fileA.id } }
                        }
                    });
                }
                for (const rightRepoFile of rightRepoFiles) {
                
                    let fileB = await this.prisma.file.findUnique({
                        where: {
                            sha: rightRepoFile.sha
                        }
                    });
                
                    if (!fileB) {
                        const fileBType = this.identifyFileType(rightRepoFile.file.content);
                        const fileBLanguage = this.getFileLanguage(rightRepoFile.file.path);
                        fileB = await this.prisma.file.create({
                            data: {
                                sha: rightRepoFile.sha,
                                filepath: rightRepoFile.file.path,
                                charCount: rightRepoFile.file.charCount,
                                lineCount: rightRepoFile.file.lineCount,
                                repository: { connect: { id: repositoryB.id } },
                                type: fileBType,
                                language: fileBLanguage
                            }
                        });
                
                        repositoryB = await this.prisma.repository.update({
                            where: { id: repositoryB.id },
                            data: {
                                totalLines: repositoryB.totalLines + fileB.lineCount,
                                files: { connect: { id: fileB.id } }
                            }
                        });
                    }
                    console.log("Comparing files: ", element.file.path, rightRepoFile.file.path);
                
                    const dolos = new Dolos();
                    const result = await dolos.analyze([element.file, rightRepoFile.file]);
                
                    const pair = await this.prisma.pair.create({
                        data: {
                            similarity: result.allPairs()[0].similarity,
                
                            leftFilepath: result.allPairs()[0].leftFile.path,
                            leftFileSha: element.sha,
                            charCountLeft: result.allPairs()[0].leftFile.charCount,
                            lineCountLeft: result.allPairs()[0].leftFile.lineCount,
                
                            rightFilepath: result.allPairs()[0].rightFile.path,
                            rightFileSha: rightRepoFile.sha,
                            charCountRight: result.allPairs()[0].rightFile.charCount,
                            lineCountRight: result.allPairs()[0].rightFile.lineCount,
                
                            files: { connect: [{ id: fileA.id }, { id: fileB.id }] },
                            comparisonId: comparison.id
                        }
                    });
                
                    let p = result.allPairs()[0];
                    if (p) {
                        for (const f of p.buildFragments()) {
                
                            let left = f.leftSelection;
                            let right = f.rightSelection;
                
                            await this.prisma.fragment.create({
                                data: {
                                    leftstartRow: left.startRow,
                                    leftendRow: left.endRow,
                                    leftstartCol: left.startCol,
                                    leftendCol: left.endCol,
                                    rightstartRow: right.startRow,
                                    rightendRow: right.endRow,
                                    rightstartCol: right.startCol,
                                    rightendCol: right.endCol,
                                    pair: { connect: { id: pair.id } }
                                }
                            });
                        }
                    }
                }
            }
            console.log("---------------------------------");
            return comparison;
        } catch (error) {
            console.log(error);
        }
    }

    identifyFileType(fileContent: string): string {
        const controllerPattern = /@Controller|\@GetMapping|\@PostMapping|\@DeleteMapping|\@PutMapping/;
        const servicePattern = /@Service|\@Injectable/;
        const repositoryPattern = /@Repository|findById\(|save\(/;
        const entityPattern = /@Entity/;

        if (controllerPattern.test(fileContent)) {
            return "Controller";
        } else if (servicePattern.test(fileContent)) {
            return "Service";
        } else if (repositoryPattern.test(fileContent)) {
            return "Repository";
        } else if (entityPattern.test(fileContent)) {
            return "Entity";
        }

        return "Unknown";
    }

    getFileLanguage(filename: string): string {
        const lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex === -1) return 'Unknown';
        const extension = filename.substring(lastDotIndex + 1);
        const languageName = ComparisonsService.languagePicker[extension] || 'Unknown';
        return languageName;
    }

    async getAllComparisons(): Promise<Comparison[]> {
        return this.prisma.comparison.findMany({
            include: {
                repositories: true
            }
        });
    }

    static readonly languagePicker = {
        "sh": "bash",
        "bash": "bash",
        "c": "c",
        "h": "c/cpp",
        "cpp": "cpp",
        "hpp": "cpp",
        "cc": "cpp",
        "cp": "cpp",
        "cxx": "cpp",
        "c++": "cpp",
        "hh": "cpp",
        "hxx": "cpp",
        "h++": "cpp",
        "cs": "c-sharp",
        "csx": "c-sharp",
        "py": "python",
        "py3": "python",
        "php": "php",
        "php3": "php",
        "php4": "php",
        "php5": "php",
        "php7": "php",
        "phps": "php",
        "phpt": "php",
        "phtml": "php",
        "mo": "modelica",
        "mos": "modelica",
        "java": "java",
        "js": "javascript",
        "elm": "elm",
        "r": "r",
        "rdata": "r",
        "rds": "r",
        "rda": "r",
        "scala": "scala",
        "sc": "scala",
        "sql": "sql",
        "ts": "typescript",
        "tsx": "tsx",
        "v": "verilog",
        "vh": "verilog"
    };

    async makeComparison(leftRepository: any, rightRepository: any, clusterId?: number) {
        try {
            const dolos = new Dolos();
    
            const [leftRepoFiles, rightRepoFiles] = await Promise.all([
                dolos.stringsToFiles(leftRepository.content),
                dolos.stringsToFiles(rightRepository.content)
            ]);

            const sortStrings = [leftRepository.sha, rightRepository.sha].sort((a, b) => a.localeCompare(b));
            const sha = sortStrings.join("");
            const comparisonSha = createHash("sha256").update(sha).digest("hex");
            const comparisonFound = await this.prisma.comparison.findUnique({ where: { sha: comparisonSha } });
            if (comparisonFound) {
                return comparisonFound;
            }

            const repositoryA = await this.prisma.repository.upsert({
                where: { sha: leftRepository.sha },
                update: {},
                create: {
                    sha: leftRepository.sha,
                    owner: leftRepository.owner,
                    name: leftRepository.name,
                    totalLines: 0
                }
            });

            const repositoryB = await this.prisma.repository.upsert({
                where: { sha: rightRepository.sha },
                update: {},
                create: {
                    sha: rightRepository.sha,
                    owner: rightRepository.owner,
                    name: rightRepository.name,
                    totalLines: 0
                }
            });
    
            const comparison = await this.prisma.comparison.create({
                data: {
                    sha: comparisonSha,
                    similarity: 0.0,
                    comparisonDate: new Date(),
                    repositories: { connect: [{ id: repositoryA.id }, { id: repositoryB.id }] },
                }
            });
    
            await this.prisma.$transaction([
                this.prisma.repository.update({
                    where: { id: repositoryA.id },
                    data: { comparisons: { connect: { id: comparison.id } } }
                }),
                this.prisma.repository.update({
                    where: { id: repositoryB.id },
                    data: { comparisons: { connect: { id: comparison.id } } }
                })
            ]);
            
            console.log("Comparing repositories: ", leftRepository.name, rightRepository.name);

            /* const promises = leftRepoFiles.flatMap((file1) =>
                rightRepoFiles.map((file2) => dolos.analyze([file1.file, file2.file])
                    .then(similarityReport => ({
                        similarityReport,
                        leftFileType: file1.type,
                        lefFileSha: file1.sha,
                        rightFileType: file2.type,
                        rightFileSha: file2.sha
                    }
                )))
            );
    
            const results = await Promise.all(promises); */

            const results = await this.analyzeFiles(leftRepoFiles, rightRepoFiles, dolos);

            await this.prisma.$transaction(results.map((result) => {
                return this.prisma.pair.create({
                    data: {
                        similarity: result.similarityReport.allPairs()[0].similarity,
                        leftFileSha: result.lefFileSha,
                        leftFilepath: result.similarityReport.allPairs()[0].leftFile.path,
                        charCountLeft: result.similarityReport.allPairs()[0].leftFile.charCount,
                        lineCountLeft: result.similarityReport.allPairs()[0].leftFile.lineCount,
                        rightFileSha: result.rightFileSha,
                        rightFilepath: result.similarityReport.allPairs()[0].rightFile.path,
                        charCountRight: result.similarityReport.allPairs()[0].rightFile.charCount,
                        lineCountRight: result.similarityReport.allPairs()[0].rightFile.lineCount,
                        comparison: { connect: { id: comparison.id } },
                        files: {
                            connectOrCreate: [
                                {
                                where: { sha: result.lefFileSha },
                                create: {
                                    sha: result.lefFileSha,
                                    filepath: result.similarityReport.allPairs()[0].leftFile.path,
                                    charCount: result.similarityReport.allPairs()[0].leftFile.charCount,
                                    lineCount: result.similarityReport.allPairs()[0].leftFile.lineCount,
                                    language: this.getFileLanguage(result.similarityReport.allPairs()[0].leftFile.path),
                                    type: this.identifyFileType(result.similarityReport.allPairs()[0].leftFile.content),
                                    repository: { connect: { id: Number(repositoryA.id) } }
                                }
                                },
                                {
                                where: { sha: result.rightFileSha },
                                create: {
                                    sha: result.rightFileSha,
                                    filepath: result.similarityReport.allPairs()[0].rightFile.path,
                                    charCount: result.similarityReport.allPairs()[0].rightFile.charCount,
                                    lineCount: result.similarityReport.allPairs()[0].rightFile.lineCount,
                                    language: this.getFileLanguage(result.similarityReport.allPairs()[0].rightFile.path),
                                    type: this.identifyFileType(result.similarityReport.allPairs()[0].rightFile.content),
                                    repository: { connect: { id: Number(repositoryB.id) } }
                                }
                                }
                            ]
                        },
                        fragments: {
                            create: result.similarityReport.allPairs()[0].buildFragments().map(fragment => ({
                                leftstartRow: fragment.leftSelection.startRow,
                                leftendRow: fragment.leftSelection.endRow,
                                leftstartCol: fragment.leftSelection.startCol,
                                leftendCol: fragment.leftSelection.endCol,
                                rightstartRow: fragment.rightSelection.startRow,
                                rightendRow: fragment.rightSelection.endRow,
                                rightstartCol: fragment.rightSelection.startCol,
                                rightendCol: fragment.rightSelection.endCol,
                            }))
                        },
                    }
                });
            }));

            await this.prisma.comparison.update({
                where: { id: comparison.id },
                data: {
                    similarity: results.reduce((acc, result) => acc + result.similarityReport.allPairs()[0].similarity, 0) / results.length
                }
            });

            return comparison;

            } catch (error) {
            console.log(error);
        }
    }

    async analyzeFiles(leftRepoFiles, rightRepoFiles, dolos) {
        const promises = leftRepoFiles.flatMap((file1) =>
            rightRepoFiles.map(async (file2) => {
                try {
                    const similarityReport = await dolos.analyze([file1.file, file2.file]);
                    return {
                        similarityReport,
                        leftFileType: file1.type,
                        lefFileSha: file1.sha,
                        rightFileType: file2.type,
                        rightFileSha: file2.sha
                    };
                } catch (error) {
                    console.error(`Error analyzing files: ${file1.file} and ${file2.file}`, error);
                    return null;
                }
            })
        );
    
        const results = await Promise.allSettled(promises);
        return results
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);
    }
}
