import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { JwtAuthGuard } from "./auth/jwt/jwt-auth.guard";
import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

describe("AppController", () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService]
        })
        .overrideGuard(JwtAuthGuard)
        .useValue({
            canActivate: (context: ExecutionContext) => {
                const req = context.switchToHttp().getRequest<Request>();
                req.user = { id: 1, username: 'test', email: 't@t.com' };
                return true;
            },
        })
        .compile();

        appController = app.get<AppController>(AppController);
    });

    describe("root", () => {
        it("should return \"Hello World!\"", () => {
            expect(appController.getHello()).toBe("Hello World!");
        });
    });

    describe('profile', () => {
        it('should return the user', () => {
            const req = { user: { id: 1, username: 'test', email: 't@t.com' } } as unknown as Request;
            expect(appController.profile(req)).toBe(req.user);
        });
    });
});
