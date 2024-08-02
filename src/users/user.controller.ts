import { Controller, Get, Param, NotFoundException, Res, Headers } from "@nestjs/common";
import { Response } from "express";
import { UsersService } from "./users.service";
import { JwtAuthService } from "src/auth/jwt/jwt-auth.service";

/**
 * Controlador que maneja todas las solicitudes relacionadas con los usuarios.
 */
@Controller("users")
export class UserController {
    constructor(
        private readonly userService: UsersService,
        private readonly jwt: JwtAuthService
    ) {
    }

    @Get()
    async getAllUsers() {
        return this.userService.getAllUsers();
    }

    @Get(":id")
    async getUserById(@Param("id") id: string) {
        const Userfound = await this.userService.getUserById(Number(id));
        if (!Userfound) throw new NotFoundException("User not found");
        return Userfound;
    }

    /**
     * Endpoint que obtiene el perfil de un usuario y sus repositorios.
     * @param name Nombre del usuario.
     * @param authorizationHeader Cabecera de autorización.
     * @param res Respuesta.
     * @returns Perfil del usuario y sus repositorios.
     */
    @Get("profile/:name")
    async getUserProfileAndRepos(
        @Param("name") name: string,
        @Headers('authorization') authorizationHeader: string,
        @Res({ passthrough: true }) res: Response
    ) {
        try {
            const token = authorizationHeader.split(' ')[1];
            const decoded = this.jwt.verifyToken(token);
            const username = decoded.username;
            const user_token = await this.userService.getUserToken(username);
            
            const owner = name;

            const userRes = await fetch(`https://api.github.com/users/${owner}`, {
                headers: {
                    authorization: `token ${user_token}`
                }
            });

            const userProfile = await userRes.json();

            const repoRes = await fetch(userProfile.repos_url, {
                headers: {
                    authorization: `token ${user_token}`
                }
            });
            const repos = await repoRes.json();

            if (!repos) throw new NotFoundException("Repos not found");

            return { userProfile, repos };
        } catch (error) {
            throw new NotFoundException("User not found");
        }
    }

}