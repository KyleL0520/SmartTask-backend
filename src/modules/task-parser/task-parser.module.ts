import { Module } from "@nestjs/common";
import { TaskParserService } from "./task-parser.service";
import { DatabaseModule } from "src/imports/database/database.module";


@Module({
    imports: [
        DatabaseModule
    ],

    providers: [
        TaskParserService
    ],

    exports: [
        TaskParserService
    ]
})

export class TaskParserModule {
}