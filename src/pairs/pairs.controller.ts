import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { PairsService } from './pairs.service';

/**
 * Controlador que maneja todas las solicitudes relacionadas con los pares.
 */
@Controller("pairs")
export class PairsController {
    constructor(
        private readonly pairsService: PairsService,
    ) {
    }

    @Get(":id")
    async getPairById(
        @Param("id") id: string,
    ){
        const pairFound = await this.pairsService.getPairById(Number(id));
        if (!pairFound) throw new NotFoundException("Pair not found");
        return pairFound;
    }

    /**
     * Endpoint que obtiene los pares de un group por su SHA.
     * SHA es un hash único que identifica un group.
     * @param sha SHA del group.
     * @returns Pares del group.
     */
    @Get("/sha/:sha/:fileSha")
    async getPairsByGroupSha(
        @Param("sha") sha: string,
        @Param("fileSha") fileSha: string,
    ){
        const pairsFound = await this.pairsService.getPairsByGroupSha(sha, fileSha);
        if (!pairsFound) throw new NotFoundException("Pairs not found");
        return pairsFound;
    }
    
    @Get()
    async getAllPairs(){
        const pairsFound = await this.pairsService.getAllPairs();
        if (!pairsFound) throw new NotFoundException("Pairs not found");
        return pairsFound;
    }
}
