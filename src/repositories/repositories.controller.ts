import { Controller, Get, Body, Param } from "@nestjs/common";
import { RepositoriesService } from "./repositories.service";

/**
 * Controlador que maneja todas las solicitudes relacionadas con los repositorios.
 */
@Controller("repos")
export class RepositoriesController {

    constructor(private readonly repositoryService: RepositoriesService) {
    }
}
