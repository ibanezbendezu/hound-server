import { Controller, Get } from "@nestjs/common";
import { ComparisonsService } from "./comparisons.service";

@Controller("comparisons")
export class ComparisonsController {

    constructor(private readonly comparisonService: ComparisonsService) {
    }

    @Get()
    async getAllComparisons() {
        return await this.comparisonService.getAllComparisons();
    }
}
