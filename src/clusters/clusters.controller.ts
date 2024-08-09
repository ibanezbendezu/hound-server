import { Controller, Get, Post, Body, Param, NotFoundException, Put } from "@nestjs/common";
import { ClustersService } from "./clusters.service";
import { RepositoryDto as Repo } from "../comparisons/dto/repo";

/**
 * Controlador que maneja todas las solicitudes relacionadas con los clusters.
 */
@Controller("clusters")
export class ClustersController {

    constructor(private readonly clustersService: ClustersService) {
    }

    @Get()
    async getAllClusters() {
        return await this.clustersService.getAllClusters();
    }

    @Get(":id")
    async getClusterById(@Param("id") id: string) {
        const clusterFound = await this.clustersService.getClusterById(Number(id));
        if (!clusterFound) throw new NotFoundException("Cluster not found");
        return clusterFound;
    }

    /**
     * Endpoint que obtiene un cluster por su SHA.
     * SHA es un hash único que identifica un cluster.
     * @param sha
     * @returns Cluster.
    */
    @Get("/sha/:sha")
    async getClusterBySha(@Param("sha") sha: string) {
        const clusterFound = await this.clustersService.getClusterBySha(sha);
        if (!clusterFound) throw new NotFoundException("Cluster not found");
        return clusterFound;
    }

    @Get(":id/files")
    async getFilesByClusterId(@Param("id") id: string) {
        const files = await this.clustersService.getFilesByClusterId(Number(id));
        if (!files) throw new NotFoundException("Files not found");
        return files;
    }

    /**
     * Endpoint que obtiene los archivos de un cluster por su SHA.
     * SHA es un hash único que identifica un cluster.
     * @param sha
     * @returns Archivos del cluster.
     */
    @Get("/sha/:sha/files")
    async getFilesByClusterSha(@Param("sha") sha: string) {
        const files = await this.clustersService.getFilesByClusterSha(sha);
        if (!files) throw new NotFoundException("Files not found");
        return files;
    }
    
    @Get(":id/similarities")
    async getPairSimilaritiesByClusterId(@Param("id") id: string) {
        const similarities = await this.clustersService.getPairSimilaritiesByClusterId(Number(id));
        if (!similarities) throw new NotFoundException("Similarities not found");
        return similarities
    }

    /**
     * Endpoint que obtiene las similitudes de pares de un cluster por su SHA.
     * SHA es un hash único que identifica un cluster.
     * @param sha
     * @returns Similitudes de pares del cluster.
    */
    @Get("/sha/:sha/similarities")
    async getPairSimilaritiesByClusterSha(@Param("sha") sha: string) {
        const similarities = await this.clustersService.getPairSimilaritiesByClusterSha(sha);
        if (!similarities) throw new NotFoundException("Similarities not found");
        return similarities
    }

    @Post()
    async createCluster(@Body() body: { repos: any[], username: string }) {
        const clusterCreated = await this.clustersService.makeCluster(body.repos, body.username);
        if (!clusterCreated) throw new NotFoundException("Cluster not created");
        return clusterCreated;
    }

    @Put(":id")
    async updateCluster(@Param("id") id: string, @Body() body: { repos: Repo[], username: string }) {
        console.log("updateCluster in server", body);
        const clusterUpdated = await this.clustersService.updateCluster(Number(id), body.repos, body.username);
        if (!clusterUpdated) throw new NotFoundException("Cluster not updated");
        return clusterUpdated;
    }

    /**
     * Endpoint que actualiza un cluster por su SHA.
     * SHA es un hash único que identifica un cluster.
     * @param sha
     * @param body
     * @returns Cluster actualizado
     */
    @Put("/sha/:sha")
    async updateClusterBySha(@Param("sha") sha: string, @Body() body: { repos: Repo[], username: string }) {
        console.log("updateClusterBySha in server", body);
        const clusterUpdated = await this.clustersService.updateClusterBySha(sha, body.repos, body.username);
        if (!clusterUpdated) throw new NotFoundException("Cluster not updated");
        return clusterUpdated;
    }
}
