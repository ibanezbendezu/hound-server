import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { RepositoriesModule } from "src/repositories/repositories.module";
import { ComparisonsModule } from "src/comparisons/comparisons.module";
import { ClustersController } from "./clusters.controller";
import { ClustersService } from "./clusters.service";

@Module({
    imports: [PrismaModule, RepositoriesModule, ComparisonsModule],
    controllers: [ClustersController],
    providers: [ClustersService],
    exports: [ClustersService]
})
export class ClustersModule {
}
