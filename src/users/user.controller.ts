import { Controller, Get, Param, NotFoundException, Res, Headers } from "@nestjs/common";
import { Response } from "express";
import { UsersService } from "./users.service";
import { JwtAuthService } from "src/auth/jwt/jwt-auth.service";

/**
 * Controlador que maneja todas las solicitudes relacionadas con los usuarios.
 */
@Controller("users")
export class UserController {
    constructor(
        private readonly userService: UsersService,
        private readonly jwt: JwtAuthService
    ) {
    }

    @Get()
    async getAllUsers() {
        return this.userService.getAllUsers();
    }

    @Get(":id")
    async getUserById(@Param("id") id: string) {
        const Userfound = await this.userService.getUserById(Number(id));
        if (!Userfound) throw new NotFoundException("User not found");
        return Userfound;
    }
}
