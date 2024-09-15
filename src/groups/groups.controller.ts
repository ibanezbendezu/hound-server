import { Controller, Get, Post, Body, Param, NotFoundException, Put } from "@nestjs/common";
import { GroupsService } from "./groups.service";
import { RepositoryDto } from "./dto/repository";

/**
 * Controlador que maneja todas las solicitudes relacionadas con los groups.
 */
@Controller("groups")
export class GroupsController {

    constructor(private readonly groupsService: GroupsService) {
    }

    @Get()
    async getAllGroups() {
        return await this.groupsService.getAllGroups();
    }

    @Get(":id")
    async getGroupById(@Param("id") id: string) {
        const groupFound = await this.groupsService.getGroupById(Number(id));
        if (!groupFound) throw new NotFoundException("Group not found");
        return groupFound;
    }

    /**
     * Endpoint que obtiene un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Group.
    */
    @Get("/sha/:sha")
    async getGroupBySha(@Param("sha") sha: string) {
        const groupFound = await this.groupsService.getGroupBySha(sha);
        if (!groupFound) throw new NotFoundException("Group not found");
        return groupFound;
    }

    @Get(":id/files")
    async getFilesByGroupId(@Param("id") id: string) {
        const files = await this.groupsService.getFilesByGroupId(Number(id));
        if (!files) throw new NotFoundException("Files not found");
        return files;
    }

    /**
     * Endpoint que obtiene los archivos de un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Archivos del group.
     */
    @Get("/sha/:sha/files")
    async getFilesByGroupSha(@Param("sha") sha: string) {
        const files = await this.groupsService.getFilesByGroupSha(sha);
        if (!files) throw new NotFoundException("Files not found");
        return files;
    }
    
    @Get(":id/similarities")
    async getPairSimilaritiesByGroupId(@Param("id") id: string) {
        const similarities = await this.groupsService.getPairSimilaritiesByGroupId(Number(id));
        if (!similarities) throw new NotFoundException("Similarities not found");
        return similarities
    }

    /**
     * Endpoint que obtiene las similitudes de pares de un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Similitudes de pares del group.
    */
    @Get("/sha/:sha/similarities")
    async getPairSimilaritiesByGroupSha(@Param("sha") sha: string) {
        const similarities = await this.groupsService.getPairSimilaritiesByGroupSha(sha);
        if (!similarities) throw new NotFoundException("Similarities not found");
        return similarities
    }

    @Post()
    async createGroup(@Body() body: { repos: any[], username: string }) {
        const groupCreated = await this.groupsService.createGroup(body.repos, body.username);
        if (!groupCreated) throw new NotFoundException("Group not created");
        return groupCreated;
    }

    /**
     * Endpoint que actualiza un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @param body
     * @returns Group actualizado
     */
    @Put("/sha/:sha")
    async updateGroupBySha(@Param("sha") sha: string, @Body() body: { repos: RepositoryDto[], username: string }) {
        console.log("updateGroupBySha in server", body);
        const groupUpdated = await this.groupsService.updateGroupBySha(sha, body.repos, body.username);
        if (!groupUpdated) throw new NotFoundException("Group not updated");
        return groupUpdated;
    }
}
