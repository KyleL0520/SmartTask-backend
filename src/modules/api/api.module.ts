import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { AuthModule } from "src/imports/auth/auth.module";
import { DatabaseModule } from "src/imports/database/database.module";
import { AuthController } from "./main/auth.controller";
import { CategoryController } from "./main/category.controller";
import { TaskController } from "./main/task.controller";
import { GroupTaskController } from "./main/group-task.controller";
import { SharedModule } from "src/imports/shared/shared.module";
import { MailerModule } from "src/imports/util/mailer/mailer.module";
import { UserController } from "./main/user.controller";
import { TaskParserModule } from "../task-parser/task-parser.module";

@Module({
    imports: [
        AuthModule,
        DatabaseModule,
        SharedModule,
        MailerModule,
        TaskParserModule
    ],

    controllers: [
        AuthController,
        CategoryController,
        TaskController,
        GroupTaskController,
        UserController
    ],
})

export class ApiModule {
}