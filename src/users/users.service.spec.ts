
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { Profile } from "passport-github2";
import { AuthProvider, User as DummyUser } from "../shared";

describe('UsersService', () => {
	let usersService: UsersService;
	let findManyMock: jest.Mock;
	let findUniqueMock: jest.Mock;
	let createMock: jest.Mock;
	let updateMock: jest.Mock;
	
	beforeEach(async () => {
		findUniqueMock = jest.fn();
		findManyMock = jest.fn();
		createMock = jest.fn();
		updateMock = jest.fn();
		const module = await Test.createTestingModule({
			providers: [
				UsersService,
				{
					provide: PrismaService,
					useValue: {
						user: {
							findUnique: findUniqueMock,
							findMany: findManyMock,
							create: createMock,
							update: updateMock,
						},
					},
				},
			],
		}).compile();

		usersService = await module.get(UsersService);
	});
	
	describe('findOrCreate', () => {
		const profile: Profile = {
			id: '123',
			username: 'testuser',
			emails: [{ value: 'test@example.com' }],
			displayName: 'Test User',
			photos: [{ value: 'https://example.com/avatar.jpg' }],
			profileUrl: 'https://example.com/testuser',
			provider: 'github',
		};
		const accessToken = 'abc123';
		const provider: AuthProvider = 'github';

		describe('when the user does not exist', () => {
			beforeEach(() => {
				findUniqueMock.mockResolvedValue(null);
				createMock.mockResolvedValue({
					id: 1,
					githubId: 123,
					username: 'testuser',
					name: 'Test User',
					email: 'test@example.com',
					githubToken: 'abc123',
				});
			});

			it('should create a new user', async () => {
				const result = await usersService.findOrCreate(profile, accessToken, provider);
				expect(result).toEqual({
					id: '1',
					provider,
					providerId: '123',
					username: 'testuser',
					email: 'test@example.com',
					displayName: 'Test User',
					photos: [{ value: 'https://example.com/avatar.jpg' }],
				});
				expect(createMock).toHaveBeenCalledWith({
					data: {
					githubId: 123,
					username: 'testuser',
					name: 'Test User',
					email: 'test@example.com',
					githubToken: 'abc123',
					},
				});
			});
		});
	});

	describe('when the getAllUsers function is called', () => {
		describe('and the findMany method returns the users', () => {
			let users: User[];
			beforeEach(() => {
				users = [
					{
						id: 1,
						githubId: 123,
						username: 'johnsmith',
						name: 'John Smith',
						email: 'js@gmail.com',
						githubToken: 'token',
					},
					{
						id: 2,
						githubId: 456,
						username: 'janesmith',
						name: 'Jane Smith',
						email: 'jas@gmail.com',
						githubToken: 'token',
					},
				];
				findManyMock.mockResolvedValue(users);
			});
			it('should return the users', async () => {
				const result = await usersService.getAllUsers();
				expect(result).toBe(users);
			});
		});
		describe('and the findMany method does not return the users', () => {
			beforeEach(() => {
				findManyMock.mockResolvedValue([]);
			});
			it('should return an empty array', async () => {
				const result = await usersService.getAllUsers();
				expect(result).toEqual([]);
			});
		});
	});

	describe('when the getUserById function is called', () => {
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
				const result = await usersService.getUserById(1);
				expect(result).toBe(user);
			});
		});
		describe('and the findUnique method does not return the user', () => {
			beforeEach(() => {
				findUniqueMock.mockResolvedValue(undefined);
			});
			it('should throw the Error', async () => {
				return expect(async () => {
					await usersService.getUserById(1);
				}
				).rejects.toThrow('User not found');
			});
		});
	});
	
	describe('when the getByUsername function is called', () => {
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
			it('should throw the Error', async () => {
				return expect(async () => {
					await usersService.getUserByUsername('johnsmith');
				}
				).rejects.toThrow('User not found');
			});
		});
	});
});