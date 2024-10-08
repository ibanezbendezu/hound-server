import { Module } from "@nestjs/common";
import { ComparisonsService } from "./comparisons.service";
import { ComparisonsController } from "./comparisons.controller";
import { UsersModule } from "src/users/users.module";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
    imports: [UsersModule, PrismaModule],
    controllers: [ComparisonsController],
    providers: [ComparisonsService],
    exports: [ComparisonsService]
})
export class ComparisonsModule {
}
