import { Logger } from "@nestjs/common";
import * as dotEnv from "dotenv";
import * as path from "path";

const logger = new Logger("CONFIG");

dotEnv.config();

const APP_DIR_ROOT = path.join(__dirname, "..");
const APP_DIR_STORAGE = path.join(APP_DIR_ROOT, "storage");

const DEFAULT_CONFIG = {
    APP_ENVIRONMENT: "task",
    APP_PORT: 4000,
    APP_REQUEST_BODY_SIZE_MB: 20,
    DIR_STORAGE: APP_DIR_STORAGE,
    DIR_TEMP: path.join(APP_DIR_STORAGE, "temp"),
    DIR_DATA: path.join(APP_DIR_STORAGE, "data"),
    DIR_LOGS: path.join(APP_DIR_STORAGE, "logs"),

    LOG_LEVEL: "info",
    LOG_DAILY_ROTATE_DAYS: 5,
    LOG_DAILY_ROTATE_SIZE_MB: 5,

    FORGET_PASSWORD_EXPIRY_MINUTES: 10,
}

export const {
    APP_NAME,
    APP_ENVIRONMENT,
    APP_PORT,
    APP_REQUEST_BODY_SIZE_MB,
    DIR_STORAGE,
    DIR_TEMP,
    DIR_DATA,
    DIR_LOGS,
    DATABASE_MONGO_URL,

    CORS_ORIGINS,
    APP_SUPPORT_EMAIL,
    APP_ADMIN_USERNAME,
    APP_ADMIN_EMAIL,
    APP_ADMIN_PASSWORD,
    PUBLIC_CLIENT,

    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,

    LOG_LEVEL,
    LOG_DAILY_ROTATE_DAYS,
    LOG_DAILY_ROTATE_SIZE_MB,

    FORGET_PASSWORD_EXPIRY_MINUTES,

    AUTH_USER_JWT_SECRET,
    AUTH_USER_JWT_EXPIRATION_MINUTES,
    AUTH_USER_JWT_EXPIRATION_DAYS,

    CLIENT_IP_HEADER,

    E_MAILER_SENDER,

    E_MAILER_SENDER_API_KEY,
    E_MAILER_VERIFY_CODE_TEMPLATE,
    E_MAILER_BLANK_WITH_BTN_TEMPLATE,
}: any = { ...DEFAULT_CONFIG, ...process.env };

logger.verbose(`loaded .env config file, environment [${APP_ENVIRONMENT}]`);