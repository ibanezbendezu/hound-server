import { Controller, Get, Param, NotFoundException, Res, Headers } from "@nestjs/common";
import { UsersService } from "./users.service";

/**
 * Controlador que maneja todas las solicitudes relacionadas con los usuarios.
 */
@Controller("users")
export class UsersController {
    constructor(
        private readonly userService: UsersService,
    ) {
    }

    /**
     * Maneja las solicitudes GET en /users/:id
     * @param id El id del usuario que se solicita
     */
    @Get(":id")
    async getUserById(@Param("id") id: string) {
        const Userfound = await this.userService.getUserById(Number(id));
        if (!Userfound) throw new NotFoundException("User not found");
        return Userfound;
    }

    /**
     * Maneja las solicitudes GET en /users
     */
    @Get()
    async getAllUsers() {
        return this.userService.getAllUsers();
    }
}
