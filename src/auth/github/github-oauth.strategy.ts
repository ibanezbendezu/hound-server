import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-github";

import { AppConfig } from "../../config/interfaces";
import { UsersService } from "../../users/users.service";

/**
 * Clase que maneja la estrategia de autenticación de GitHub.
 * Aquí, se configura la estrategia de autenticación de Passport.
 */
@Injectable()
export class GithubOauthStrategy extends PassportStrategy(Strategy, "github") {
    constructor(
        private configService: ConfigService<AppConfig>,
        private usersService: UsersService
    ) {
        super({
            clientID: configService.get<string>("auth.github.clientId"),
            clientSecret: configService.get<string>("auth.github.clientSecret"),
            callbackURL: configService.get<string>("auth.github.callbackURL"),
            scope: ["public_profile"]
        });
    }

    /**
     * Método que valida el token de acceso y el perfil del usuario.
     * Si el usuario no está en la base de datos, se lanza una excepción.
     * @param accessToken
     * @param _refreshToken
     * @param profile
     */
    async validate(accessToken: string, _refreshToken: string, profile: Profile) {
        const user = await this.usersService.findOrCreate(profile, accessToken, "github");
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}
