import { Test, TestingModule } from "@nestjs/testing";

import { UsersService } from "./users.service";
import { PrismaService } from 'src/prisma/prisma.service';
import { mockDeep } from 'jest-mock-extended';
import { Profile } from 'passport-github2';
import { AuthProvider } from '../shared';


describe("UsersService", () => {
    let service: UsersService;
    let prisma: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: mockDeep<PrismaService>() },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    it('should find or create a user', async () => {
        const profile: Profile = {
          id: '123',
          username: 'testuser',
          emails: [{ value: 'test@example.com' }],
          displayName: 'Test User',
          photos: [],
          provider: 'github',
          profileUrl: '',
        };
        const accessToken = 'fake-token';
        const provider: AuthProvider = 'github';
    
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.user.create.mockResolvedValue({
          id: 1,
          githubId: 123,
          name: 'testuser',
          githubToken: accessToken,
        });
    
        const result = await service.findOrCreate(profile, accessToken, provider);
    
        expect(result).toEqual({
          id: '1',
          provider,
          providerId: '123',
          username: 'testuser',
          email: 'test@example.com',
          displayName: 'Test User',
          photos: [],
        });
        expect(prisma.user.create).toHaveBeenCalled();
      });
    
});
