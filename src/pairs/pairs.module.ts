import { Module } from '@nestjs/common';
import { PairsService } from './pairs.service';
import { PairsController } from './pairs.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtAuthModule } from 'src/auth/jwt/jwt-auth.module';
import { FilesModule } from 'src/files/files.module';

@Module({
    imports: [PrismaModule, JwtAuthModule, FilesModule],
    controllers: [PairsController],
    providers: [PairsService],
    exports: [PairsService]
})
export class PairsModule { }
