import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { UserController } from "./user.controller";
import { UsersService } from "./users.service";
import { JwtAuthModule } from "src/auth/jwt/jwt-auth.module";

@Module({
    controllers: [UserController],
    imports: [PrismaModule, JwtAuthModule],
    providers: [UsersService],
    exports: [UsersService]
})
export class UsersModule {
}
