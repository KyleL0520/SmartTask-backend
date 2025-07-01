import { Module } from "@nestjs/common";
import { DatabaseModule } from "src/imports/database/database.module";
import { SeederService } from "./seeder.service";

@Module({
    imports: [DatabaseModule],
    providers: [SeederService]
})
export class CliModule {
}