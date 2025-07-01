import { Body, Controller, Delete, Get, NotAcceptableException, NotFoundException, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { mongo } from "mongoose";
import { AuthGuard } from "src/imports/auth/auth.guard";
import { DatabaseService } from "src/imports/database/service/database.service";

const Dto = (body: any) => {
    const rs: any = {};
    for (const k of [
        'username',
        'password',
        'avatarPhoto'
    ]) {
        if (body.hasOwnProperty(k)) {
            rs[k] = body[k];
        }
    }
    return rs;
};

@Controller('/api/user')
export class UserController {
    constructor(
        private database: DatabaseService
    ) { }


    @Put(':id')
    @UseGuards(AuthGuard)
    async update(
        @Param('id') id,
        @Body() body,
    ) {
        const rs = await this.database.User.findOne({ _id: id }).lean()
        if (!rs) {
            throw new NotFoundException();
        }
        const set = Dto(body);

        await this.database.User.updateOne({ _id: id }, { $set: set })

        return await this.database.User.findOne({ _id: id });
    }
}