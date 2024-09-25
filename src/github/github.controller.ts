import { Body, Controller, Get, Headers, NotFoundException, Param, Post, Res } from '@nestjs/common';
import { JwtAuthService } from 'src/auth/jwt/jwt-auth.service';
import { GithubService } from './github.service';

@Controller("github")
export class GithubController {
    constructor(
        private readonly githubService: GithubService,
        private readonly jwt: JwtAuthService
    ) {
    }

    /**
     * Endpoint que obtiene el perfil de un usuario de GitHub y sus repositorios.
     * @param name Nombre del usuario.
     * @param authorizationHeader Cabecera de autorización.
     * @param res Respuesta.
     * @returns Perfil del usuario y sus repositorios.
     */
    @Get("profile/:owner")
    async getOwnerData(
        @Param("owner") owner: string,
        @Headers('authorization') authorizationHeader: string,
        @Res({ passthrough: true }) res: Response
    ) {
        try {
            const token = authorizationHeader.split(' ')[1];
            const decoded = this.jwt.verifyToken(token);
            const username = decoded.username;

            const data = await this.githubService.getOwnerData(owner, username);
            if (!data) throw new NotFoundException("Data not found");
            return data;
        } catch (error) {
            throw new NotFoundException("User not found");
        }
    }

    @Get("file/:id/content")
    async getFileContentById(
        @Param("id") id: string,
        @Headers('authorization') authorizationHeader: string
    ){
        try {
            const token = authorizationHeader.split(' ')[1];
            const decoded = this.jwt.verifyToken(token);
            const username = decoded.username;

            const fileFound = await this.githubService.getFileContentById(Number(id), username);
            if (!fileFound) throw new NotFoundException("File not found");
            return fileFound;
        } catch (error) {
            throw new NotFoundException("Token inválido o expirado");
        }
    }

    @Get("file/sha/:sha/content")
    async getFileContentBySha(
        @Param("sha") sha: string,
        @Headers('authorization') authorizationHeader: string
    ){
        try {
            const token = authorizationHeader.split(' ')[1];
            const decoded = this.jwt.verifyToken(token);
            const username = decoded.username;

            const fileFound = await this.githubService.getFileContentBySha(sha, username);
            if (!fileFound) throw new NotFoundException("File not found");
            return fileFound;
        } catch (error) {
            throw new NotFoundException("Token inválido o expirado");
        }
    }

    @Post("repositories/search")
    async getRepositoriesSearch(
        @Headers('authorization') authorizationHeader: string,
        @Body() body: { repos: string, username: string }
    ){
        try {
            const token = authorizationHeader.split(' ')[1];
            const decoded = this.jwt.verifyToken(token);
            const username = decoded.username;

            const repositories = await this.githubService.getRepositoriesSearch(body.repos, username);
            if (!repositories) throw new NotFoundException("Repositories not found");
            return repositories;
        } catch (error) {
            throw new NotFoundException("Token inválido o expirado");
        }
    }
}
