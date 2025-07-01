import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { UserInfoService } from "./user.service";

@Module({
    imports: [DatabaseModule],
    providers: [UserInfoService],
    exports: [UserInfoService]
})
export class SharedModule { }