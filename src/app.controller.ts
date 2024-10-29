import { Controller, Get, NotFoundException, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AppService } from "./app.service";
import { JwtAuthGuard } from "./auth/jwt/jwt-auth.guard";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
    ) {
    }

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get("protected")
    @UseGuards(JwtAuthGuard)
    getProtect(): string {
        return this.appService.getProtectedResource();
    }
    
    @Get("profile")
    @UseGuards(JwtAuthGuard)
    profile(@Req() req: Request) {
        console.log("SE ENVIÓ UN PROFILE");
        return req.user;
    }

    /* @Get("dolos")
    dolos() {
        return this.appService.dolosTest();
    } */

    @Get("/test")
    async comparisonTest() {
        const comparison = await this.appService.comparisonTestService();
        return comparison;
    }
}
