import { Test } from '@nestjs/testing';
import { PairsController } from './pairs.controller';
import { PairsService } from './pairs.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { Pair } from '@prisma/client';

describe('PairsController', () => {
    let pairsController: PairsController;
    let pairsService: PairsService;
    let findManyMock: jest.Mock;
    let findUniqueMock: jest.Mock;
    let fileFindUniqueMock: jest.Mock;

    beforeEach(async () => {
        findManyMock = jest.fn();
        findUniqueMock = jest.fn();
        fileFindUniqueMock = jest.fn();
        const moduleRef = await Test.createTestingModule({
            controllers: [PairsController],
            providers: [PairsService, {
                provide: PrismaService,
                useValue: {
                    pair: {
                        findMany: findManyMock,
                        findUnique: findUniqueMock,
                    },
                    file: {
                        findUnique: fileFindUniqueMock,
                    },
                },
            }],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({
            canActivate: () => {
                return true;
            },
        })
        .compile();

        pairsController = moduleRef.get<PairsController>(PairsController);
        pairsService = moduleRef.get<PairsService>(PairsService);
    });

    it('should be defined', () => {
        expect(pairsController).toBeDefined();
    });

    describe('getPairById', () => {
        let pair: any;

        beforeEach(() => {
            pair = {
                id: 1,
                similarity: 0.85,
                totalOverlap: 100,
                longestFragment: 50,
                leftFileSha: "leftSha123",
                rightFileSha: "rightSha456",
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
                files: [
                    {
                        id: 1,
                        sha: "leftSha123",
                        type: "typeA",
                        charCount: 100,
                        lineCount: 10,
                        filepath: "leftPath",
                    },
                    {
                        id: 2,
                        sha: "rightSha456",
                        type: "typeB",
                        charCount: 200,
                        lineCount: 20,
                        filepath: "rightPath",
                    },
                ],
            };
            findUniqueMock.mockResolvedValue(pair);
        });

        it('should return a pair', async () => {
            const pair = await pairsController.getPairById('1');
            expect(pair).toBeDefined();
        });
    });

    describe('getPairsByGroupSha', () => {
        let pairs: any[];
        let group: any;
        let comparison: any;
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

        it('should return an array of pairs', async () => {
            const pairs = await pairsController.getPairsByGroupSha('sha123', 'fileSha123');
            expect(pairs).toBeDefined();
        });
    });

    describe('getAllPairs', () => {
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

        it('should return an array of pairs', async () => {
            const pairs = await pairsController.getAllPairs();
            expect(pairs).toBeDefined();
        });
    });
});
