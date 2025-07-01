import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "src/imports/database/service/database.service";
import { CATEGORY, USERS } from "./seeds/system-base-data";

@Injectable()
export class SeederService {
    private readonly logger = new Logger(SeederService.name);

    constructor(
        private database: DatabaseService
    ) { }

    public async data() {
        for (const user of USERS) {
            const { username, password, email } = user;
            await this.database.User.create({
                username,
                password,
                email: email
            })
        }

        for (const cat of CATEGORY) {
            const { name } = cat;
            await this.database.Category.create({
                name
            })
        }
    }
}