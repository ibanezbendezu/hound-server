import { Test, TestingModule } from "@nestjs/testing";
import { ComparisonsService } from "./comparisons.service";
import { PrismaService } from "../prisma/prisma.service";
import { GithubService } from "../github/github.service";
import { UsersService } from "../users/users.service";
import { createHash } from "crypto";

describe("ComparisonsService", () => {
    let comparisonService: ComparisonsService;
    let prismaService: PrismaService;
    let findManyMock: jest.Mock;
    let findUniqueMock: jest.Mock;
    let createMock: jest.Mock;
    let updateMock: jest.Mock;
    let upsertMock: jest.Mock;
    let transactionMock: jest.Mock;


    beforeEach(async () => {
        findUniqueMock = jest.fn();
        findManyMock = jest.fn();
        createMock = jest.fn();
        updateMock = jest.fn();
        upsertMock = jest.fn();
        transactionMock = jest.fn();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ComparisonsService,
                GithubService,
                UsersService,
                {
                    provide: PrismaService,
                    useValue: {
                        comparison: {
                            findMany: findManyMock,
                            findUnique: findUniqueMock,
                            create: createMock,
                            update: updateMock,
                            transaction: transactionMock,
                            upsert: upsertMock,
                        },
                    },
                },
            ],
        }).compile();

        comparisonService = module.get<ComparisonsService>(ComparisonsService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    describe("getAllComparisons", () => {
        it("should return an array of comparisons", async () => {
            const mockComparisons = [
                { id: 1, sha: "sha1", repositories: [] },
                { id: 2, sha: "sha2", repositories: [] },
            ];
            findManyMock.mockResolvedValue(mockComparisons);

            const result = await comparisonService.getAllComparisons();
            expect(result).toEqual(mockComparisons);
            expect(findManyMock).toHaveBeenCalledWith({
                include: {
                    repositories: true,
                },
            });
        });

        it("should throw an error if prisma service fails", async () => {
            findManyMock.mockRejectedValue(new Error("PrismaService error"));

            await expect(comparisonService.getAllComparisons()).rejects.toThrow("PrismaService error");
        });

        describe("identifyFileType", () => {
            it("should identify a Controller file", () => {
                const fileContent = "@Controller\npublic class MyController {}";
                const result = comparisonService.identifyFileType(fileContent);
                expect(result).toBe("Controller");
            });

            it("should identify a Service file", () => {
                const fileContent = "@Service\npublic class MyService {}";
                const result = comparisonService.identifyFileType(fileContent);
                expect(result).toBe("Service");
            });

            it("should identify a Repository file", () => {
                const fileContent = "@Repository\npublic class MyRepository {}";
                const result = comparisonService.identifyFileType(fileContent);
                expect(result).toBe("Repository");
            });

            it("should identify an Entity file", () => {
                const fileContent = "@Entity\npublic class MyEntity {}";
                const result = comparisonService.identifyFileType(fileContent);
                expect(result).toBe("Entity");
            });

            it("should return Unknown for an unrecognized file type", () => {
                const fileContent = "public class MyClass {}";
                const result = comparisonService.identifyFileType(fileContent);
                expect(result).toBe("Unknown");
            });

        });
    });

    describe("createComparison", () => {
        it("should return existing comparison if found", async () => {
            const leftRepository = { sha: "leftSha", name: "leftRepo", content: "leftContent", owner: "leftOwner" };
            const rightRepository = { sha: "rightSha", name: "rightRepo", content: "rightContent", owner: "rightOwner" };
            const comparisonSha = createHash("sha256").update("leftSharightSha").digest("hex");
            const mockComparison = { id: 1, sha: comparisonSha };

            findUniqueMock.mockResolvedValue(mockComparison);

            const result = await comparisonService.createComparison(leftRepository, rightRepository);

            expect(result).toEqual(mockComparison);
            expect(findUniqueMock).toHaveBeenCalledWith({ where: { sha: comparisonSha } });
        });
    });
});