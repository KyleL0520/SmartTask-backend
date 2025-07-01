import { Injectable, OnApplicationBootstrap, OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "../database/service/database.service";
import { EMAIL_PARAMS } from "src/modules/cli/seeds/system-base-data";

@Injectable()
export class UserInfoService implements OnApplicationBootstrap {
    constructor(
        private database: DatabaseService,
    ) { }

    async onApplicationBootstrap() {
        await this.initUser();
    }

    async initUser() {
        for (const emailParams of EMAIL_PARAMS) {
            if ((await this.database.EmailParams.countDocuments({ key: emailParams.key })) === 0) {
                await this.database.EmailParams.create(emailParams);
            }
        }
    }

    async getEmailParams(type: "verifyEmail" | "resetOtp") {
        const emailParam = await this.database.EmailParams.findOne({ key: type });
        console.log(emailParam);
        return emailParam ?? {
            subject: '',
            title: '',
            description: '',
            footer: '',
            btnText: ''
        };
    }
}