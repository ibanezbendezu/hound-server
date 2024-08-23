import { Injectable } from "@nestjs/common";
import { Profile } from "passport-github2";
import { PrismaService } from "src/prisma/prisma.service";
import { User } from "../types";
import { AuthProvider, User as DummyUser } from "../shared";

/**
 * Servicio que maneja todas las operaciones relacionadas con los usuarios.
 */
@Injectable()
export class UsersService {

    constructor(private prisma: PrismaService) {
    }

    /**
     * Busca un usuario en la base de datos y lo crea si no existe.
     * @param profile Perfil de GitHub.
     * @param accessToken Token de acceso de GitHub.
     * @param provider Proveedor de autenticación.
     * @returns Usuario.
     */
    async findOrCreate(profile: Profile, accessToken: string, provider: AuthProvider): Promise<DummyUser> {
        const { id, username, emails, displayName, photos } = profile;
        const githubId: number = +id;

        let user = await this.prisma.user.findUnique({
            where: {
                githubId: githubId
            }
        });

        if (!user) {
            await this.prisma.user.create({
                data: {
                    githubId: githubId,
                    username: username,
                    name: displayName || username,
                    email: emails ? emails[0].value : "",
                    githubToken: accessToken
                }
            });
        } else {
            let newUsername = username;
            if (user.name !== newUsername) {
                await this.prisma.user.update({
                    where: {
                        githubId: githubId
                    },
                    data: {
                        name: newUsername
                    }
                });
            }
            
            user = await this.prisma.user.update({
                where: {
                    githubId: githubId
                },
                data: {
                    githubToken: accessToken
                }
            });
        }

        return {
            id: user.id.toString(),
            provider,
            providerId: id,
            username: username,
            email: emails ? emails[0].value : "",
            displayName: displayName || username,
            photos: photos
        };
    }

    async getAllUsers(): Promise<User[]> {
        return this.prisma.user.findMany({});
    }

    async getUserById(id: number): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }

    async getUserByUsername(username: string): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }

    async getUserToken(username: string): Promise<string> {
        const user = await this.getUserByUsername(username);
        if (!user.githubToken) {
            throw new Error("User has no token");
        }
        return user.githubToken;
    }
}
