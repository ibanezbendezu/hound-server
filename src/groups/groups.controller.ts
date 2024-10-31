import { Controller, Get, Post, Body, Param, NotFoundException, Put } from "@nestjs/common";
import { GroupsService } from "./groups.service";
import { RepositoryDTO } from "./dto/repository.dto";

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

    /**
     * Endpoint que obtiene un resumen de un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Resumen del group.
     * */
    @Get("/summary/:sha")
    async getGroupSummaryBySha(@Param("sha") sha: string) {
        const groupFound = await this.groupsService.getGroupSummaryBySha(sha);
        if (!groupFound) throw new NotFoundException("Group not found");
        return groupFound;
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

    /**
     * Endpoint que crea un group.
     * @param body
     * @returns Group creado.
     * */
    @Post()
    /* istanbul ignore next */
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
    /* istanbul ignore next */
    async updateGroupBySha(@Param("sha") sha: string, @Body() body: { repos: RepositoryDTO[], username: string }) {
        const groupUpdated = await this.groupsService.updateGroupBySha(sha, body.repos, body.username);
        if (!groupUpdated) throw new NotFoundException("Group not updated");
        return groupUpdated;
    }

    /**
     * Endpoint que obtiene el reporte de un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Reporte del group.
     */
    @Get("/report/:sha")
    async getGroupReportBySha(@Param("sha") sha: string) {
        const groupSummary = await this.groupsService.getGroupReportBySha(sha);
        if (!groupSummary) throw new NotFoundException("Group summary not found");
        return groupSummary;
    }

    /**
     * Endpoint que obtiene el resumen general de un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Resumen general del
     * */
    @Get("/overall/:sha")
    async getGroupOverallBySha(@Param("sha") sha: string) {
        const groupSummary = await this.groupsService.getGroupOverallBySha(sha);
        if (!groupSummary) throw new NotFoundException("Group summary not found");
        return groupSummary;
    }

    /**
     * Endpoint que obtiene la data para un grafo, de un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha
     * @returns Datos para el grafo del group.
     */
    @Get("/graph/:sha")
    async getGroupGraphBySha(@Param("sha") sha: string) {
        const groupGraph = await this.groupsService.getGroupGraphBySha(sha);
        if (!groupGraph) throw new NotFoundException("Group graph data not found");
        return groupGraph;
    }
}
