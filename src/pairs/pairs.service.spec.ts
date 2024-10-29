import { Test, TestingModule } from '@nestjs/testing';
import { PairsService } from './pairs.service';
import { PrismaService } from '../prisma/prisma.service'; // Import PrismaService
import { Comparison, Group, Pair } from '@prisma/client';

describe('PairsService', () => {
    let pairsService: PairsService;
    let prismaService: PrismaService;
    let findManyMock: jest.Mock;
	let findUniqueMock: jest.Mock;
	let createMock: jest.Mock;
	let updateMock: jest.Mock;
    let fileFindUniqueMock: jest.Mock;

    beforeEach(async () => {
        findUniqueMock = jest.fn();
        findManyMock = jest.fn();
        createMock = jest.fn();
        updateMock = jest.fn();
        fileFindUniqueMock = jest.fn();

        const module = await Test.createTestingModule({
            providers: [
                PairsService,
                {
                    provide: PrismaService,
                    useValue: {
                        pair: {
                            findMany: findManyMock,
                            findUnique: findUniqueMock,
                            create: createMock,
                            update: updateMock,
                        },
                        file: {
                            findUnique: fileFindUniqueMock,
                        },
                    },
                },
            ],
        }).compile();

        pairsService = module.get<PairsService>(PairsService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    describe('when the function getPairById is called', () => {
        describe('and the findUnique method returns a pair', () => {
            let pairFound: any;

            beforeEach(() => {
                pairFound = {
                    id: 1,
                    similarity: 0.85,
                    totalOverlap: 100,
                    longestFragment: 50,
                    leftFileSha: "leftSha123",
                    rightFileSha: "rightSha456",
                    files: [
                        {
                            id: 1,
                            sha: "leftSha123",
                            type: "typeA",
                            repository: {
                                name: "Repo1",
                                owner: "Owner1",
                                sha: "repoSha1",
                            },
                        },
                        {
                            id: 2,
                            sha: "rightSha456",
                            type: "typeB",
                            repository: {
                                name: "Repo2",
                                owner: "Owner2",
                                sha: "repoSha2",
                            },
                        },
                    ],
                    fragments: [
                        {
                            id: 1,
                            leftstartRow: 10,
                            leftendRow: 20,
                            rightstartRow: 30,
                            rightendRow: 40,
                            pairId: 1,
                        },
                        {
                            id: 2,
                            leftstartRow: 50,
                            leftendRow: 60,
                            rightstartRow: 70,
                            rightendRow: 80,
                            pairId: 1,
                        },
                    ],
                };
                findUniqueMock.mockResolvedValue(pairFound);
            });

            it('should return the transformed pair data', async () => {
                const result = await pairsService.getPairById(1);
                expect(result).toBeDefined();
                expect(result).toHaveProperty('id', 1);
                expect(result).toHaveProperty('similarity', 0.85);
                expect(result).toHaveProperty('file1');
                expect(result).toHaveProperty('file2');

                expect(result.file1).toHaveProperty('sha', 'rightSha456');
                expect(result.file1.fragments).toEqual([
                    { start: 30, end: 40 },
                    { start: 70, end: 80 },
                ]);

                expect(result.file2).toHaveProperty('sha', 'leftSha123');
                expect(result.file2.fragments).toEqual([
                    { start: 10, end: 20 },
                    { start: 50, end: 60 },
                ]);
            });
        });
    });

    describe('when the function getPairsByGroupSha is called', () => {
        describe('and the findMany method returns a list of pairs', () => {
            let pairs: any[];
            let group: Group;
            let comparison: Comparison;
            let files: any[];

            beforeEach(() => {
                group = {
                    id: 1,
                    sha: 'groupSha123',
                    groupDate: new Date(),
                    numberOfRepos: 2,
                };

                comparison = {
                    id: 1,
                    comparisonDate: new Date(),
                    sha: 'comparisonSha123',
                    similarity: 0.85,
                };

                files = [
                    {
                        id: 1,
                        sha: 'leftSha123',
                        type: 'typeA',
                        charCount: 100,
                        lineCount: 10,
                        filepath: 'leftPath',
                        language: 'Python',
                        repositoryId: 1,
                        repository: {
                            id: 1,
                            name: 'Repo1',
                            owner: 'Owner1',
                            sha: 'repoSha1',
                        },
                    },
                    {
                        id: 2,
                        sha: 'rightSha456',
                        type: 'typeB',
                        charCount: 200,
                        lineCount: 20,
                        filepath: 'rightPath',
                        language: 'Python',
                        repositoryId: 2,
                        repository: {
                            id: 2,
                            name: 'Repo2',
                            owner: 'Owner2',
                            sha: 'repoSha2',
                        },
                    },
                ];

                pairs = [
                    {
                        id: 1,
                        similarity: 0.85,
                        totalOverlap: 100,
                        longestFragment: 50,
                        leftFileSha: "leftSha123",
                        rightFileSha: "rightSha456",
                        charCountLeft: 100,
                        charCountRight: 200,
                        comparisonId: 1,
                        leftFilepath: "leftPath",
                        lineCountLeft: 10,
                        lineCountRight: 20,
                        rightFilepath: "rightPath",
                        files: files,
                        fragments: [
                            {
                                id: 1,
                                leftstartRow: 10,
                                leftendRow: 20,
                                rightstartRow: 30,
                                rightendRow: 40,
                                pairId: 1,
                            },
                            {
                                id: 2,
                                leftstartRow: 50,
                                leftendRow: 60,
                                rightstartRow: 70,
                                rightendRow: 80,
                                pairId: 1,
                            },
                        ],
                    },
                ];

                findManyMock.mockResolvedValue(pairs);
                fileFindUniqueMock.mockResolvedValue(files);
            });
        
            it('should return the transformed pair data', async () => {
                const result = await pairsService.getPairsByGroupSha('groupSha123', "leftSha123");
                expect(result).toBeDefined();
                expect(result).toHaveProperty('file');
            });
        });
    });

    describe('when the function getAllPairs is called', () => {
        describe('and the findMany method returns a list of pairs', () => {
            let pairs: Pair[];

            beforeEach(() => {
                pairs = [
                    {
                        id: 1,
                        similarity: 0.85,
                        totalOverlap: 100,
                        longestFragment: 50,
                        leftFileSha: "leftSha123",
                        rightFileSha: "rightSha456",
                        comparisonId: 1,
                        charCountLeft: 100,
                        charCountRight: 200,
                        leftFilepath: "leftPath",
                        lineCountLeft: 10,
                        lineCountRight: 20,
                        rightFilepath: "rightPath",
                    },
                ];

                findManyMock.mockResolvedValue(pairs);
            });

            it('should return the transformed pair data', async () => {
                const result = await pairsService.getAllPairs();
                expect(result).toBeDefined();
                expect(result).toHaveLength(1);
            });
        });
    });
});