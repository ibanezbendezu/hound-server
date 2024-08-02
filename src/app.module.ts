import { PairsModule } from './pairs/pairs.module';
import { FilesModule } from './files/files.module';
import { ClustersModule } from "./clusters/clusters.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GithubOauthModule } from "./auth/github/github-oauth.module";
import { RepositoriesModule } from "./repositories/repositories.module";
import appConfig from "./config/app.config";
import { ComparisonsModule } from "./comparisons/comparisons.module";

@Module({
    imports: [
        PairsModule, 
        FilesModule, 
        ClustersModule, ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        GithubOauthModule, RepositoriesModule, ComparisonsModule],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {
}
