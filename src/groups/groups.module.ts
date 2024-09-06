import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { ComparisonsModule } from "src/comparisons/comparisons.module";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";
import { GithubModule } from "src/github/github.module";

@Module({
    imports: [PrismaModule, ComparisonsModule, GithubModule],
    controllers: [GroupsController],
    providers: [GroupsService],
    exports: [GroupsService]
})
export class GroupsModule {
}
