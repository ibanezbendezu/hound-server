import { Test } from '@nestjs/testing';
import { ComparisonsController } from './comparisons.controller';
import { ComparisonsService } from './comparisons.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { Comparison } from '@prisma/client';

describe('ComparisonsController', () => {
    let comparisonsController: ComparisonsController;
    let comparisonsService: ComparisonsService;
    let findManyMock: jest.Mock;
    let findUniqueMock: jest.Mock;

    beforeEach(async () => {
        findManyMock = jest.fn();
        findUniqueMock = jest.fn();
        const moduleRef = await Test.createTestingModule({
            controllers: [ComparisonsController],
            providers: [ComparisonsService, {
                provide: PrismaService,
                useValue: {
                    comparison: {
                        findMany: findManyMock,
                        findUnique: findUniqueMock,
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

        comparisonsController = moduleRef.get<ComparisonsController>(ComparisonsController);
        comparisonsService = moduleRef.get<ComparisonsService>(ComparisonsService);
    });

    it('should be defined', () => {
        expect(comparisonsController).toBeDefined();
    });

    describe('getAllComparisons', () => {
        let comparisons: any;

        beforeEach(() => {
            comparisons = [
                {
                    id: 1,
                    sha: 'sha1',
                    repositories: [],
                },
                {
                    id: 2,
                    sha: 'sha2',
                    repositories: [],
                },
            ];
        });

        it('should return an array of comparisons', async () => {
            findManyMock.mockResolvedValue(comparisons);

            const result = await comparisonsController.getAllComparisons();

            expect(result).toEqual(comparisons);
        });
    });
});
