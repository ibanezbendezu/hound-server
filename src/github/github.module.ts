import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { JwtAuthModule } from 'src/auth/jwt/jwt-auth.module';

import { Module } from '@nestjs/common';

@Module({
    imports: [PrismaModule, UsersModule, JwtAuthModule],
    controllers: [GithubController, ],
    providers: [GithubService, ],
    exports: [GithubService, ],
})
export class GithubModule {}
