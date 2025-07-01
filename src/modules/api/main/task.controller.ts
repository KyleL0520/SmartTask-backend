import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { mongo } from "mongoose";
import { AuthGuard } from "src/imports/auth/auth.guard";
import { DatabaseService } from "src/imports/database/service/database.service";

const Dto = (body: any) => {
    const rs: any = {};
    for (const k of [
        'user',
        'title',
        'description',
        'category',
        'deadlinesDate',
        'deadlinesTime',
        'reminderDate',
        'reminderTime',
        'priority',
        'status',
        'groupTask'
    ]) {
        if (body.hasOwnProperty(k)) {
            rs[k] = body[k];
        }
    }
    return rs;
};

@Controller('/api/task')
export class TaskController {
    constructor(
        private database: DatabaseService
    ) { }

    @Get('')
    @UseGuards(AuthGuard)
    async list(@Query() query) {
        const {
            offset = 0,
            user,
            status,
            isGroupTask
        } = query;
        const where: any = {};

        if (user) where.user = new mongo.ObjectId(user)

        if (status) where.status = status;

        if (isGroupTask !== undefined) {
            if (isGroupTask === 'true') {
                where.groupTask = { $ne: null };
            } else if (isGroupTask === 'false') {
                where.groupTask = null;
            }
        }

        const total = await this.database.Task.countDocuments(where);
        const items = await this.database.Task.find(where)
            .populate('category')
            .populate('groupTask')
            .skip(offset || 0);

        return {
            total,
            items
        };
    }

    @Post('')
    @UseGuards(AuthGuard)
    async create(@Body() body) {
        const r = await this.database.Task.create({
            ...Dto(body),
        });

        return this, this.database.Task.findOne({ _id: r._id })
            .populate('category')
            .populate('groupTask');
    }

    @Get(':id')
    @UseGuards(AuthGuard)
    async get(@Param('id') id) {
        const r = await this.database.Task.findOne({ _id: id });
        if (!r) {
            throw new NotFoundException();
        }
        return r;
    }

    @Delete(':id')
    @UseGuards(AuthGuard)
    async delete(@Param('id') id) {
        const r = await this.database.Task.findOne({ _id: id });

        if (r) {
            await this.database.Task.deleteOne({ _id: id });

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
        const rs = await this.database.Task.findOne({ _id: id }).lean()
        if (!rs) {
            throw new NotFoundException();
        }
        const set = Dto(body);

        await this.database.Task.updateOne({ _id: id }, { $set: set })

        return await this.database.Task.findOne({ _id: id }).populate('category');
    }
}