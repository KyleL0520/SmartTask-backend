import { Body, Controller, Delete, Get, NotAcceptableException, NotFoundException, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { mongo } from "mongoose";
import { AuthGuard } from "src/imports/auth/auth.guard";
import { DatabaseService } from "src/imports/database/service/database.service";

const Dto = (body: any) => {
    const rs: any = {};
    for (const k of [
        'owner',
        'projectName',
        'projectDescription',
    ]) {
        if (body.hasOwnProperty(k)) {
            rs[k] = body[k];
        }
    }
    return rs;
};

@Controller('/api/group-task')
export class GroupTaskController {
    constructor(
        private database: DatabaseService
    ) { }

    @Get('')
    @UseGuards(AuthGuard)
    async list(@Query() query) {
        const {
            offset = 0,
            user
        } = query;
        const where: any = {};

        if (user) {
            where.user = new mongo.ObjectId(user)
        }

        const total = await this.database.GroupTask.countDocuments(where);
        const items = await this.database.GroupTask.find(where)
            .skip(offset || 0);

        return {
            total,
            items
        };
    }

    @Post('')
    @UseGuards(AuthGuard)
    async create(@Body() body) {
        const r = await this.database.GroupTask.create({
            ...Dto(body),
        });

        return this, this.database.GroupTask.findOne({ _id: r._id });
    }

    @Get('user')
    @UseGuards(AuthGuard)
    async getName() {
        const r = await this.database.User.find();
        if (!r) {
            throw new NotFoundException();
        }
        return r;
    }

    // @Get(':id')
    // @UseGuards(AuthGuard)
    // async get(@Param('id') id) {
    //     const r = await this.database.GroupTask.findOne({ _id: id });
    //     if (!r) {
    //         throw new NotFoundException();
    //     }
    //     return r;
    // }

    @Delete(':id')
    @UseGuards(AuthGuard)
    async delete(@Param('id') id) {
        const r = await this.database.GroupTask.findOne({ _id: id });

        if (r) {
            await this.database.GroupTask.deleteOne({ _id: id });

            return r;
        }
        throw new NotFoundException();
    }

    @Put(':id')
    @UseGuards(AuthGuard)
    async update(
        @Param('id') id,
        @Body() body,
    ) {
        const rs = await this.database.GroupTask.findOne({ _id: id }).lean()
        if (!rs) {
            throw new NotFoundException();
        }
        const set = Dto(body);

        await this.database.GroupTask.updateOne({ _id: id }, { $set: set })

        return this.database.GroupTask.findOne({ _id: id });
    }
}