import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { JwtPayload, User } from "../../shared";

/**
 * Este servicio maneja la autenticación JWT.
 */
@Injectable()
export class JwtAuthService {
    constructor(private jwtService: JwtService) {
    }

    /**
     * Método que crea un JWT. Aquí, se firma el token con el payload del usuario.
     * @param user
     */
    login(user: User) {
        const { id, displayName, photos, username, email } = user;
        const payload: JwtPayload = {
            sub: id,
            username: username,
            displayName,
            email,
            photo: photos?.[0]?.value,
        };

        return {
            accessToken: this.jwtService.sign(payload)
        };
    }

    verifyToken(token: string) {
        return this.jwtService.verify(token);
    }
}
