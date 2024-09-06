import { GithubModule } from './github/github.module';
import { PairsModule } from './pairs/pairs.module';
import { GroupsModule } from "./groups/groups.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GithubOauthModule } from "./auth/github/github-oauth.module";
import appConfig from "./config/app.config";
import { ComparisonsModule } from "./comparisons/comparisons.module";

@Module({
    imports: [
        GithubModule,
        PairsModule,
        GroupsModule, ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        GithubOauthModule, ComparisonsModule],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {
}
