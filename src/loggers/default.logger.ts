import * as winston from "winston";
import * as util from "util";
import * as path from "path";
import { ConsoleLogger } from "@nestjs/common";
import { APP_ENVIRONMENT, DIR_LOGS, LOG_DAILY_ROTATE_DAYS, LOG_DAILY_ROTATE_SIZE_MB, LOG_LEVEL } from "src/config";
import "winston-daily-rotate-file";

const LogFormat = winston.format.printf(({ level, message, timestamp, context }) => {
    return util.format("%s [%s]%s: %s",
        timestamp,
        level?.toUpperCase(),
        context ? `[${context}]` : "",
        message
    )
})

export class DefaultLogger extends ConsoleLogger {
    private readonly logger: winston.Logger;
    private readonly isDev = APP_ENVIRONMENT === "development";

    constructor(context?: string, options?: { timestamp?: boolean; }) {
        super(context ?? "", options ?? {});

        const rotateConfig = {
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: `${LOG_DAILY_ROTATE_SIZE_MB || 20}m`,
            maxFiles: `${LOG_DAILY_ROTATE_DAYS || 5}d`
        };

        this.logger = winston.createLogger({
            level: LOG_LEVEL || "info",
            format: winston.format.combine(
                winston.format.timestamp(),
                LogFormat
            ),
            defaultMeta: { service: context },
            transports: [
                new winston.transports.DailyRotateFile({
                    ...rotateConfig,
                    level: "error",
                    filename: path.join(DIR_LOGS, "error-%DATE%.log")
                }),
                new winston.transports.DailyRotateFile({
                    ...rotateConfig,
                    maxFiles: 1,
                    filename: path.join(DIR_LOGS, "overall-%DATE%.log")
                })
            ]
        })
    }

    public debug(message: any, context?: string) {
        if (!this.isDev) {
            super.debug(message, context);
            this.logger.log("debug", message, { context });
        }
    }

    public log(message: any, context?: string) {
        super.log(message, context);
        this.logger.log("info", message, { context });
    }

    public error(message: any, trace?: string, context?: string) {
        super.error(message, trace, context);
        this.logger.log("error", message, { context });
    }

    public warn(message: any, context?: string) {
        super.warn(message, context);
        this.logger.log("warn", message, { context });
    }

    public verbose(message: any, context?: string) {
        super.verbose(message, context);
        this.logger.log("verbose", message, { context });
    }
}