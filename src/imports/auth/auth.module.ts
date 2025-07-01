import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AuthService } from "./auth.service";
import { UserInfoService } from "../shared/user.service";
import { MailerModule } from "../util/mailer/mailer.module";

@Module({
    imports: [DatabaseModule, MailerModule],
    providers: [AuthService, UserInfoService],
    exports: [AuthService, UserInfoService],
})
export class AuthModule {

}