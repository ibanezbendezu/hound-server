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
    @UseGuards(JwtAuthGuard)
    getHello(): string {
        return this.appService.getHello();
    }

    @Get("profile")
    @UseGuards(JwtAuthGuard)
    profile(@Req() req: Request) {
        console.log("SE ENVIÓ UN PROFILE");
        return req.user;
    }

    @Get("protected")
    @UseGuards(JwtAuthGuard)
    getProtectedResource(@Req() req: Request) {
        return "Este es un recurso protegido";
    }

    @Get("dolos")
    dolos() {
        return this.appService.dolosTest();
    }

    @Get("/make")
    async makeComparison() {
        const comparison = await this.appService.makeComparison();
        if (!comparison) throw new NotFoundException("Comparison not created");
        return comparison;
    }
}
