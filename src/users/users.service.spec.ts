
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { Test } from '@nestjs/testing';

describe('The UsersService', () => {
	let usersService: UsersService;
	let findUniqueMock: jest.Mock;
	beforeEach(async () => {
		findUniqueMock = jest.fn();
		const module = await Test.createTestingModule({
			providers: [
				UsersService,
				{
					provide: PrismaService,
					useValue: {
						user: {
							findUnique: findUniqueMock,
						},
					},
				},
			],
		}).compile();

		usersService = await module.get(UsersService);
	});
	describe('when the getByEmail function is called', () => {
		describe('and the findUnique method returns the user', () => {
			let user: User;
			beforeEach(() => {
				user = {
					id: 1,
					githubId: 123,
					username: 'johnsmith',
					name: 'John Smith',
					email: 'js@gmail.com',
					githubToken: 'token',
				};
				findUniqueMock.mockResolvedValue(user);
			});
			it('should return the user', async () => {
				const result = await usersService.getUserByUsername('johnsmith');
				expect(result).toBe(user);
			});
		});
		describe('and the findUnique method does not return the user', () => {
			beforeEach(() => {
				findUniqueMock.mockResolvedValue(undefined);
			});
			it('should throw the UserNotFoundException', async () => {
				return expect(async () => {
					await usersService.getUserByUsername('johnsmith');
				}
				).rejects.toThrow('User not found');
			});
		});
	});
});