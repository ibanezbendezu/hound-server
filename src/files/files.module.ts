import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { UsersModule } from 'src/users/users.module';
import { JwtAuthModule } from 'src/auth/jwt/jwt-auth.module';

@Module({
    imports: [PrismaModule, UsersModule, JwtAuthModule],
    controllers: [FilesController],
    providers: [FilesService],
    exports: [FilesService]
})
export class FilesModule { }
