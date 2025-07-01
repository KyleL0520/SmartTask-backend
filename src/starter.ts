import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DefaultLogger } from "./loggers";
import { APP_REQUEST_BODY_SIZE_MB, CORS_ORIGINS, DIR_DATA, DIR_STORAGE, DIR_TEMP } from "./config";
import * as fs from "fs";
import * as bodyParser from "body-parser";
import { NestExpressApplication } from "@nestjs/platform-express";

export const createApp = async <T extends INestApplication>(App): Promise<T> => {
    const app = await NestFactory.create<T>(App, {
        logger: new DefaultLogger(),
        bufferLogs: true
    });
    app.enableShutdownHooks();
    for (const dir of [DIR_STORAGE, DIR_DATA, DIR_TEMP]) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    return app;
};

export const createWebApp = async (App) => {
    const app = await createApp<NestExpressApplication>(App);

    const corsOrigin = CORS_ORIGINS ? CORS_ORIGINS.split(",").map(c => c.trim()) : [];
    app.use(bodyParser.json({ limit: `${APP_REQUEST_BODY_SIZE_MB || 20}mb` }));
    app.use(bodyParser.urlencoded({ limit: `${APP_REQUEST_BODY_SIZE_MB || 20}mb`, extended: true }));
    app.enableCors({
        origin: corsOrigin
    });
    return app;
}