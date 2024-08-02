import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";

import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());

    app.enableCors({
        origin: "http://localhost:3000", // Specify allowed origin(s) here or use '*' to allow all origins
        allowedHeaders: ["Authorization", "Content-Type", "Accept"],
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true // This is important for requests with credentials like cookies or Authorization headers
    });

    const configService = app.get(ConfigService);
    await app.listen(configService.get("port"));
    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
