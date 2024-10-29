import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

describe('UsersController', () => {
    let usersController: UsersController;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [UsersService, PrismaService], // Add PrismaService to providers
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({
            canActivate: () => {
                return true;
            },
        })
        .compile();

        usersController = moduleRef.get<UsersController>(UsersController);
    });

    it('should be defined', () => {
        expect(usersController).toBeDefined();
    });

    describe('getUserById', () => {
        it('should return a user', async () => {
            const user = await usersController.getUserById('1');
            expect(user).toBeDefined();
        });
    });

    describe('getAllUsers', () => {
        it('should return an array of users', async () => {
            const users = await usersController.getAllUsers();
            expect(users).toBeDefined();
        });
    });
});