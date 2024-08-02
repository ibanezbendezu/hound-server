import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Octokit } from '@octokit/rest';
import { UsersService } from '../users/users.service';

/**
 * Servicio que maneja todas las solicitudes relacionadas con los archivos.
 */
@Injectable()
export class FilesService {
    private octokit: Octokit;

    constructor(
        private prisma: PrismaService,
        private user: UsersService) {
    }
    
    async getFileContentById(id: number, username: string) {
        const user_token = await this.user.getUserToken(username);
        const token = user_token || process.env.GITHUB_TOKEN;
        this.octokit = new Octokit({ auth: token });

        const file = await this.prisma.file.findUnique({
            where: { id },
            include: { repository: {
                select: { owner: true, name: true }
            }}
        });

        if (!file) return null;

        const content = await this.getFileContent(file.repository.owner, file.repository.name, file.sha);
        return content;
    }

    /**
     * Obtiene el contenido de un archivo por su SHA.
     * @param sha SHA del archivo.
     * @param username Nombre de usuario del propietario del archivo.
     * @returns Contenido del archivo.
     */
    async getFileContentBySha(sha: string, username: string) {
        const user_token = await this.user.getUserToken(username);
        const token = user_token || process.env.GITHUB_TOKEN;
        this.octokit = new Octokit({ auth: token });

        const file = await this.prisma.file.findUnique({
            where: { sha },
            include: { repository: {
                select: { owner: true, name: true }
            }}
        });

        if (!file) return null;

        const content = await this.getFileContent(file.repository.owner, file.repository.name, file.sha);
        return content;
    }

    /**
     * Función que obtiene el contenido de un archivo.
     * @param owner Propietario del repositorio.
     * @param repo Nombre del repositorio.
     * @param file_sha SHA del archivo.
     * @returns Contenido del archivo.
     */
    private async getFileContent(owner: string, repo: string, file_sha: string) {
        const { data } = await this.octokit.git.getBlob({
            owner,
            repo,
            file_sha
        });

        return Buffer.from(data.content, "base64").toString("utf-8");
    }
}
