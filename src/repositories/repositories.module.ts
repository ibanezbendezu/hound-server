import { Module } from "@nestjs/common";
import { RepositoriesService } from "./repositories.service";
import { RepositoriesController } from "./repositories.controller";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [UsersModule],
    controllers: [RepositoriesController],
    providers: [RepositoriesService],
    exports: [RepositoriesService]
})
export class RepositoriesModule {
}
