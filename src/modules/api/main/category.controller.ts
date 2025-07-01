import { Body, Controller, Delete, Get, NotAcceptableException, NotFoundException, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { mongo } from "mongoose";
import { AuthGuard } from "src/imports/auth/auth.guard";
import { DatabaseService } from "src/imports/database/service/database.service";

const Dto = (body: any) => {
    const rs: any = {};
    for (const k of [
        'name',
        'user'
    ]) {
        if (body.hasOwnProperty(k)) {
            rs[k] = body[k];
        }
    }
    return rs;
};

@Controller('/api/category')
export class CategoryController {
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

        const total = await this.database.Category.countDocuments(where);
        const items = await this.database.Category.find(where)
            .skip(offset || 0);

        return {
            total,
            items
        };
    }

    @Post('')
    @UseGuards(AuthGuard)
    async create(@Body() body) {
        if ((await this.database.Category.countDocuments({ name: body.name })) > 0) {
            throw new NotAcceptableException(
                `Category already Existed.`
            );
        }
        const r = await this.database.Category.create({
            ...Dto(body),
        });

        return this, this.database.Category.findOne({ _id: r._id });
    }

    @Get(':id')
    @UseGuards(AuthGuard)
    async get(@Param('id') id) {
        const r = await this.database.Category.findOne({ _id: id });
        if (!r) {
            throw new NotFoundException();
        }
        return r;
    }

    @Delete(':id')
    @UseGuards(AuthGuard)
    async delete(@Param('id') id) {
        const r = await this.database.Category.findOne({ _id: id });

        if (r) {
            if (await this.database.Task.countDocuments({
                category: r._id
            }) > 0) {
                throw new NotAcceptableException('Task using this category. Please remove this category before continue');
            }

            if (r.name == 'Others') {
                throw new NotAcceptableException("This category can't be delete");
            }

            await this.database.Category.deleteOne({ _id: id });

            return r;
        }
        throw new NotFoundException();
    }
}