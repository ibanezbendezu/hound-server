import { Injectable } from "@nestjs/common";
import { Dolos } from "src/dolos";
import { Comparison } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { createHash } from "crypto";
import { File } from "src/dolos/core";

export interface FileO {
    file: File
    type: string;
    sha: string;
}

@Injectable()
export class ComparisonsService {

    constructor(
        private prisma: PrismaService) {
        if (!this.prisma) {
            throw new Error("PrismaService is not initialized");
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

    async getComparisonBySha(leftSha: string, rightSha: string): Promise<Comparison> {
        const sortStrings = [leftSha, rightSha].sort((a, b) => a.localeCompare(b));
        const sha = sortStrings.join("");
        const comparisonSha = createHash("sha256").update(sha).digest("hex");
        const comparisonFound = await this.prisma.comparison.findUnique({ where: { sha: comparisonSha } });
        if (comparisonFound) {
            return comparisonFound;
        }
        return null;
    }

    /* istanbul ignore next */
    async makeComparison(leftRepository: any, rightRepository: any) {
        try {
            const dolos = new Dolos();

            const sortStrings = [leftRepository.sha, rightRepository.sha].sort((a, b) => a.localeCompare(b));
            const sha = sortStrings.join("");
            const comparisonSha = createHash("sha256").update(sha).digest("hex");
            const comparisonFound = await this.prisma.comparison.findUnique({ where: { sha: comparisonSha } });
            if (comparisonFound) {
                return comparisonFound;
            }

            const [leftRepoFiles, rightRepoFiles] = await Promise.all([
                dolos.stringsToFiles(leftRepository.content),
                dolos.stringsToFiles(rightRepository.content)
            ]);

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
            
            console.log("\nComparando archivos de los repositorios: ", leftRepository.name, rightRepository.name);
            console.time("Tiempo de comparación de archivos");
            const results = await this.analyzeFiles(leftRepoFiles, rightRepoFiles, dolos);
            console.timeEnd("Tiempo de comparación de archivos");
            console.log("Comparación finalizada");

            console.log("Guardando resultados en la base de datos");
            console.time("Tiempo de guardado en la base de datos");
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
            console.timeEnd("Tiempo de guardado en la base de datos");
            
            /* await this.prisma.comparison.update({
                where: { id: comparison.id },
                data: {
                    similarity: results.reduce((acc, result) => acc + result.similarityReport.allPairs()[0].similarity, 0) / results.length
                }
            }); */

            return comparison;

            } catch (error) {
            console.log(error);
        }
    }

    /* istanbul ignore next */
    async analyzeFiles(leftRepoFiles: File[], rightRepoFiles: File[], dolos) {
        const promises = leftRepoFiles.flatMap((file1) =>
            rightRepoFiles.map(async (file2) => {
                try {
                    const similarityReport = await dolos.analyze([file1, file2]);
                    return {
                        similarityReport,
                        leftFileType: file1.extra.type,
                        lefFileSha: file1.extra.sha,
                        rightFileType: file2.extra.type,
                        rightFileSha: file2.extra.sha
                    };
                } catch (error) {
                    console.error(`Error analyzing files: ${file1} and ${file2}`, error);
                    return null;
                }
            })
        );
    
        const results = await Promise.allSettled(promises);
        return results
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /* istanbul ignore next */
    async createComparison(leftRepository: any, rightRepository: any, groupId?: number) {
        try {
            const dolos = new Dolos();

            const sortStrings = [leftRepository.sha, rightRepository.sha].sort((a, b) => a.localeCompare(b));
            const sha = sortStrings.join("");
            const comparisonSha = createHash("sha256").update(sha).digest("hex");
            const comparisonFound = await this.prisma.comparison.findUnique({ where: { sha: comparisonSha } });
            if (comparisonFound) {
                console.log(`COMPARACIÓN DE ${leftRepository.name} Y ${rightRepository.name} YA EXISTE`);
                return comparisonFound;
            }

            //TRANSFORMACIÓN DE STRINGS A ARCHIVOS
            console.log(`TRANSFORMANDO ARCHIVOS DE LOS REPOSITORIOS ${leftRepository.name} y ${rightRepository.name}`);
            console.time("Tiempo de transformación de archivos");
            const [leftRepoFiles, rightRepoFiles] = await Promise.all([
                dolos.stringsToFiles(leftRepository.content, leftRepository.owner, leftRepository.name),
                dolos.stringsToFiles(rightRepository.content, rightRepository.owner, rightRepository.name)
            ]);
            console.timeEnd("Tiempo de transformación de archivos");

            //COMPARACIÓN DE ARCHIVOS
            console.log("COMPARANDO ARCHIVOS");
            console.time("Tiempo de comparación de archivos");
            const files = [...leftRepoFiles, ...rightRepoFiles];
            const results = await dolos.analyze(files);
            console.timeEnd("Tiempo de comparación de archivos");
            
            //FILTRAR PARES
            const filteredPairs = results.allPairs().filter(pair => {
                const isDifferentRepository = pair.leftFile.extra.repository !== pair.rightFile.extra.repository;
                const isSameFileType = pair.leftFile.extra.type === pair.rightFile.extra.type;
                return isDifferentRepository && isSameFileType;
            });
                        
            //GUARDAR EN LA BASE DE DATOS
            console.log("Guardando resultados en la base de datos");
            console.time("Tiempo de guardado en la base de datos");

            const [repositoryA, repositoryB] = await Promise.all([
                this.prisma.repository.upsert({
                    where: { sha: leftRepository.sha },
                    update: {},
                    create: { sha: leftRepository.sha, owner: leftRepository.owner, name: leftRepository.name, totalLines: 0 }
                }),
                this.prisma.repository.upsert({
                    where: { sha: rightRepository.sha },
                    update: {},
                    create: { sha: rightRepository.sha, owner: rightRepository.owner, name: rightRepository.name, totalLines: 0 }
                })
            ]);
    
            const comparison = await this.prisma.comparison.create({
                data: {
                    sha: comparisonSha, similarity: 0.0, comparisonDate: new Date(), repositories: { connect: [{ id: repositoryA.id }, { id: repositoryB.id }] },
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
                }),
                ...filteredPairs.map((pair) =>
                    this.prisma.pair.create({
                        data: {
                            similarity: pair.similarity,
                            totalOverlap: pair.overlap,
                            longestFragment: pair.longest,
                            leftFileSha: pair.leftFile.extra.sha,
                            leftFilepath: pair.leftFile.path,
                            charCountLeft: pair.leftFile.charCount,
                            lineCountLeft: pair.leftFile.lineCount,
                            rightFileSha: pair.rightFile.extra.sha,
                            rightFilepath: pair.rightFile.path,
                            charCountRight: pair.rightFile.charCount,
                            lineCountRight: pair.rightFile.lineCount,
                            comparison: { connect: { id: comparison.id } },
                            files: {
                                connectOrCreate: [
                                    {
                                        where: { sha: pair.leftFile.extra.sha },
                                        create: {
                                            sha: pair.leftFile.extra.sha,
                                            filepath: pair.leftFile.path,
                                            charCount: pair.leftFile.charCount,
                                            lineCount: pair.leftFile.lineCount,
                                            language: this.getFileLanguage(pair.leftFile.path),
                                            type: pair.leftFile.extra.type,
                                            repository: { connect: { id: repositoryA.id } }
                                        }
                                    },
                                    {
                                        where: { sha: pair.rightFile.extra.sha },
                                        create: {
                                            sha: pair.rightFile.extra.sha,
                                            filepath: pair.rightFile.path,
                                            charCount: pair.rightFile.charCount,
                                            lineCount: pair.rightFile.lineCount,
                                            language: this.getFileLanguage(pair.rightFile.path),
                                            type: pair.rightFile.extra.type,
                                            repository: { connect: { id: repositoryB.id } }
                                        }
                                    }
                                ]
                            },
                            fragments: {
                                create: pair.buildFragments().map(fragment => ({
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
                    })
                )
            ]);
            console.timeEnd("Tiempo de guardado en la base de datos");
            
            return comparison;

            } catch (error) {
            console.log(error);
        }
    }
}
