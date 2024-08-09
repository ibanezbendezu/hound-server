import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { RepositoriesModule } from "src/repositories/repositories.module";
import { ComparisonsModule } from "src/comparisons/comparisons.module";
import { ClustersController } from "./clusters.controller";
import { ClustersService } from "./clusters.service";
import { GithubModule } from "src/github/github.module";

@Module({
    imports: [PrismaModule, RepositoriesModule, ComparisonsModule, GithubModule],
    controllers: [ClustersController],
    providers: [ClustersService],
    exports: [ClustersService]
})
export class ClustersModule {
}
