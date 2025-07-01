import { Module } from "@nestjs/common";
import { MongoFeatures, MongoRoot } from "./config/mongo.config";
import { DatabaseService } from "./service/database.service";

@Module({
    imports: [MongoFeatures, MongoRoot],
    providers: [DatabaseService],
    exports: [DatabaseService]
})
export class DatabaseModule { }