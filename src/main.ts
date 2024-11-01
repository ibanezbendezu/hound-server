import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());

    console.log("Client URL: ", process.env.CLIENT_URL);
    app.enableCors({
        origin: [
            process.env.CLIENT_URL,
            'http://localhost:3000',
            'https://hound-front.onrender.com',
            'https://hound.azurewebsites.net'
        ],
        allowedHeaders: ['Cookie', 'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        credentials: true
    });

    const configService = app.get(ConfigService);
    await app.listen(configService.get("port"));
    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
