import { Test } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { PrismaService } from '../prisma/prisma.service';
import { ComparisonsService } from 'src/comparisons/comparisons.service';
import { GithubService } from 'src/github/github.service';
import { PairsService } from 'src/pairs/pairs.service';
import { UsersService } from 'src/users/users.service';

describe('GroupsService', () => {
    let groupsService: GroupsService;
    let prismaService: PrismaService;
    let findManyMock: jest.Mock;
    let findUniqueMock: jest.Mock;
    let createMock: jest.Mock;
    let updateMock: jest.Mock;
    let comparisonFindUniqueMock: jest.Mock;
    let pairsFindManyMock: jest.Mock;

    beforeEach(async () => {
        findUniqueMock = jest.fn();
        findManyMock = jest.fn();
        createMock = jest.fn();
        updateMock = jest.fn();
        comparisonFindUniqueMock = jest.fn();
        pairsFindManyMock = jest.fn();

        const module = await Test.createTestingModule({
            providers: [
                GroupsService,
                ComparisonsService,
                GithubService,
                UsersService,
                {
                    provide: PrismaService,
                    useValue: {
                        group: {
                            findMany: findManyMock,
                            findUnique: findUniqueMock,
                            create: createMock,
                            update: updateMock,
                        },
                        comparison: {
                            findUnique: comparisonFindUniqueMock,
                        },
                        pair: {
                            findMany: pairsFindManyMock,
                        },
                    },
                },
            ],
        }).compile();

        groupsService = module.get<GroupsService>(GroupsService);
        prismaService = module.get<PrismaService>(PrismaService);
    });

    describe('when the function getGroupById is called', () => {
        describe('and the findUnique method returns a group', () => {
            let groupFound: any;

            beforeEach(() => {
                groupFound = {
                    id: 1,
                    name: 'group1',
                    comparisons: [
                        {
                            id: 1,
                            similarity: 0.85,
                            totalOverlap: 100,
                            longestFragment: 50,
                            leftFileSha: 'leftSha123',
                            rightFileSha: 'rightSha456',
                        },
                    ],
                };

                findUniqueMock.mockResolvedValue(groupFound);
            });

            it('should return the group', async () => {
                const group = await groupsService.getGroupById(1);
                expect(group).toEqual(groupFound);
            });
        });
    });

    describe('getAllGroups', () => {
        it('should return an array of groups', async () => {
            const mockGroups = [
                { id: 1, sha: 'sha1', groupDate: undefined, numberOfRepos: 0 },
                { id: 2, sha: 'sha2', groupDate: undefined, numberOfRepos: 0 },
            ];
            findManyMock.mockResolvedValue(mockGroups);

            const result = await groupsService.getAllGroups();
            expect(result).toEqual(mockGroups);
        });
    });

    describe('getGroupReportBySha', () => {
        it('should return the report of a group', async () => {
            const mockGroup = {
                id: 1,
                sha: 'sha1',
                groupDate: new Date(), // Asegúrate de proporcionar una fecha válida
                numberOfRepos: 1, // Ajusta según corresponda
                comparisons: [
                    {
                        id: 1,
                        similarity: 0.85,
                        totalOverlap: 100,
                        longestFragment: 50,
                        leftFileSha: 'leftSha123',
                        rightFileSha: 'rightSha456',
                        repositories: [
                            {
                                id: 1,
                                name: 'repo1',
                                owner: 'owner1',
                                sha: 'sha1',
                                files: [
                                    {
                                        id: 1,
                                        filepath: 'path/to/file1.ts',
                                        sha: 'leftSha123',
                                        lineCount: 100,
                                        type: 'TypeA',
                                        pairs: [
                                            {
                                                id: 1,
                                                similarity: 0.85,
                                                totalOverlap: 100,
                                                longestFragment: 50,
                                                leftFileSha: 'leftSha123',
                                                rightFileSha: 'rightSha456',
                                                files: [ // Añadido
                                                    {
                                                        sha: 'leftSha123',
                                                        repository: {
                                                            id: 1,
                                                            name: 'repo1',
                                                            owner: 'owner1',
                                                        },
                                                    },
                                                    {
                                                        sha: 'rightSha456',
                                                        repository: {
                                                            id: 2,
                                                            name: 'repo2',
                                                            owner: 'owner2',
                                                        },
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };            

            findUniqueMock.mockResolvedValue(mockGroup);

            const result = await groupsService.getGroupReportBySha('sha1');
            expect(result).toBeDefined
        });
    });

    describe('getGroupOverallBySha', () => {
        it('should return the overall data of a group', async () => {
            const mockGroup = {
                id: 1,
                sha: 'sha1',
                groupDate: undefined,
                numberOfRepos: 0,
                comparisons: [
                    {
                        id: 1,
                        similarity: 0.85,
                        totalOverlap: 100,
                        longestFragment: 50,
                        leftFileSha: 'leftSha123',
                        rightFileSha: 'rightSha456',
                        repositories: [
                            {
                                id: 1,
                                name: 'repo1',
                                owner: 'owner1',
                                sha: 'sha1',
                                files: [
                                    {
                                        id: 1,
                                        lineCount: 100,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };

            const mockPairs = [
                {
                    id: 1,
                    files: [],
                },
                {
                    id: 2,
                    files: [],
                },
            ];
                
            findUniqueMock.mockResolvedValue(mockGroup);
            pairsFindManyMock.mockResolvedValue(mockPairs);

            const result = await groupsService.getGroupOverallBySha('sha1');
            expect(result).toBeDefined
        });
    });
});
