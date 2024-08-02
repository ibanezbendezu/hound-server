import { Controller, Get, Body, Param } from "@nestjs/common";
import { RepositoriesService } from "./repositories.service";

/**
 * Controlador que maneja todas las solicitudes relacionadas con los repositorios.
 */
@Controller("repos")
export class RepositoriesController {

    constructor(private readonly repositoryService: RepositoriesService) {
    }

    @Get(":owner/:name")
    async getRepoContent(
        @Param("owner") owner: string,
        @Param("name") name: string,
        @Body() body: { username: string}
    ){
        return await this.repositoryService.getRepositoryContent(owner, name, body.username);
    }
}
