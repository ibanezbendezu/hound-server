import { Test } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { ComparisonsService } from 'src/comparisons/comparisons.service';
import { GithubService } from 'src/github/github.service';
import { UsersService } from 'src/users/users.service';
import { PairsService } from 'src/pairs/pairs.service';
import { Group } from '@prisma/client';

describe('GroupsController', () => {
    let groupsController: GroupsController;
    let groupsService: GroupsService;
    let findManyMock: jest.Mock;
    let findUniqueMock: jest.Mock;
    let pairsFindManyMock: jest.Mock;
    let userFindUniqueMock: jest.Mock;

    beforeEach(async () => {
        findManyMock = jest.fn();
        findUniqueMock = jest.fn();
        pairsFindManyMock = jest.fn();
        userFindUniqueMock = jest.fn();
        
        const moduleRef = await Test.createTestingModule({
            controllers: [GroupsController],
            providers: [
                GroupsService,
                ComparisonsService,
                GithubService,
                UsersService,
                PairsService,
                {
                    provide: PrismaService,
                    useValue: {
                        group: {
                            findMany: findManyMock,
                            findUnique: findUniqueMock,
                        },
                        pair: {
                            findMany: pairsFindManyMock,
                        },
                        user: {
                            findUnique: userFindUniqueMock,
                        },
                    },
                }
            ],
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({
            canActivate: () => {
                return true;
            },
        })
        .compile();

        groupsController = moduleRef.get<GroupsController>(GroupsController);
        groupsService = moduleRef.get<GroupsService>(GroupsService);
    });

    it('should be defined', () => {
        expect(groupsController).toBeDefined();
    });

    describe('getAllGroups', () => {
        let groups: any;

        beforeEach(() => {
            groups = [
                {
                    id: 1,
                    name: 'group1',
                    comparisons: [],
                },
                {
                    id: 2,
                    name: 'group2',
                    comparisons: [],
                },
            ];
        });

        it('should return all groups', async () => {
            findManyMock.mockResolvedValue(groups);

            const result = await groupsController.getAllGroups();
            expect(result).toEqual(groups);
        });
    });

    describe('getGroupBySha', () => {
        let group: any;

        beforeEach(() => {
            group = {
                id: 1,
                sha: 'some-sha',
                date: undefined,
                numberOfFiles: 0,
                numberOfFolders: 0,
                numberOfRepos: 0,
                repositories: [],
                totalLines: 0,
                comparisons: [],
            };
        });

        it('should return the group when found', async () => {
            findUniqueMock.mockResolvedValue(group);

            const result = await groupsController.getGroupBySha('some-sha');
            expect(result).toBeDefined
        });
    });

    describe('getGroupSummaryBySha', () => {
        let group: any;

        beforeEach(() => {
            group = {
                id: 1,
                sha: 'some-sha',
                date: undefined,
                numberOfFiles: 0,
                numberOfFolders: 0,
                numberOfRepos: 0,
                repositories: [],
                totalLines: 0,
                comparisons: [],
            };
        });

        it('should return the group summary when found', async () => {
            findUniqueMock.mockResolvedValue(group);

            const result = await groupsController.getGroupSummaryBySha('some-sha');
            expect(result).toBeDefined
        });
    });

    describe('getGroupReportBySha', () => {
        let group: any;

        beforeEach(() => {
            group = {
                id: 1,
                sha: 'some-sha',
                date: undefined,
                numberOfFiles: 0,
                numberOfFolders: 0,
                numberOfRepos: 0,
                repositories: [],
                totalLines: 0,
                comparisons: [],
            };
        });

        it('should return the group report when found', async () => {
            findUniqueMock.mockResolvedValue(group);

            const result = await groupsController.getGroupReportBySha('some-sha');
            expect(result).toBeDefined
        });
    });

    describe('getGroupOverallBySha', () => {
        let group: any;

        beforeEach(() => {
            group = {
                id: 1,
                sha: 'some-sha',
                date: undefined,
                numberOfFiles: 0,
                numberOfFolders: 0,
                numberOfRepos: 0,
                repositories: [],
                totalLines: 0,
                comparisons: [],
            };
        });

        it('should return the group overall when found', async () => {
            findUniqueMock.mockResolvedValue(group);

            const result = await groupsController.getGroupOverallBySha('some-sha');
            expect(result).toBeDefined
        });
    });

    describe('getPairSimilaritiesByGroupSha', () => {
        let group: any;
        let pairs: any;

        beforeEach(() => {
            group = {
                id: 1,
                sha: 'some-sha',
                date: undefined,
                numberOfFiles: 0,
                numberOfFolders: 0,
                numberOfRepos: 0,
                repositories: [],
                totalLines: 0,
                comparisons: [],
            };

            pairs = [
                {
                    id: 1,
                    files: [],
                },
                {
                    id: 2,
                    files: [],
                },
            ];
        });

        it('should return the pair similarities when found', async () => {
            findUniqueMock.mockResolvedValue(group);
            pairsFindManyMock.mockResolvedValue(pairs);

            const result = await groupsController.getPairSimilaritiesByGroupSha('some-sha');
            expect(result).toBeDefined
        });
    });

    /* describe('createGroup', () => {
        let repos: any[];
        let username: string;
        let user: any;
        let group: Group;

        beforeEach(() => {
            repos = [
                {
                    owner: 'owner1',
                    name: 'repo1',
                },
                {
                    owner: 'owner2',
                    name: 'repo2',
                },
            ];

            username = 'username';
            
            user = {
                id: 1,
                username,
                githubToken: 'token',
            };

            group = {
                id: 1,
                sha: 'some-sha',
                groupDate: undefined,
                numberOfRepos: 0,
            };
        });

        it('should return the created group', async () => {
            const body = {
                repos,
                username,
            };

            findUniqueMock.mockResolvedValue(group);
            userFindUniqueMock.mockResolvedValue(user);

            const result = await groupsController.createGroup(body);
            expect(result).toBeDefined
        });
    }); */

});
