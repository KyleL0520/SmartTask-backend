import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards, Logger, Res } from "@nestjs/common";
import { populate } from "dotenv";
import { mongo } from "mongoose";
import { APP_PORT, PUBLIC_CLIENT } from "src/config";
import { AuthGuard } from "src/imports/auth/auth.guard";
import { DatabaseService } from "src/imports/database/service/database.service";
import { MailerService } from "src/imports/util/mailer/mailer.service";
import { Response } from 'express';

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
        'isExpired',
        'isApproved',
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
    private readonly logger = new Logger('TASKCONTROLLER');

    constructor(
        private database: DatabaseService,
        private mailer: MailerService,
    ) { }

    @Get('')
    @UseGuards(AuthGuard)
    async list(@Query() query) {
        const {
            offset = 0,
            user,
            status,
            groupTaskId,
            isGroupTask,
            isApproved
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

        if (groupTaskId) {
            where.groupTask = groupTaskId
        }

        if (isApproved === 'true') {
            where.isApproved = true;
        } else if (isApproved === 'false') {
            where.isApproved = false;
        }

        const total = await this.database.Task.countDocuments(where);
        const items = await this.database.Task.find(where)
            .populate('category')
            .populate('user')
            .populate({
                path: 'groupTask',
                populate: [
                    { path: 'owner' }
                ]
            })
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

        const task = await this.database.Task.findOne({ _id: r._id })
            .populate('category')
            .populate('user')
            .populate({
                path: 'groupTask',
                populate: [
                    { path: 'owner' }
                ]
            });

        if (body.groupTask != null) {
            const approvalLink = `http://localhost:${APP_PORT}/api/task/approve?taskId=${r._id}`;

            const personalizations = {
                client_name: task.user.username,
                imgUrl: PUBLIC_CLIENT + '/assets/images/logo.png',
                title: 'Accept task',
                btnText: 'Accept task',
                description: `${task.groupTask.owner.username} is inviting you to join his project. Simply click the link below to accept the task and get started.`,
                verifyUrl: approvalLink
            }

            this.mailer
                .send({
                    client_email: task.user.email,
                    client_name: task.user.username,
                    template: "TemplateWithBtn",
                    personalizations: personalizations,
                    subject: 'Accept task',
                    verifyUrl: approvalLink
                })
                .then(() => {
                    this.logger.verbose(
                        `Invite email sent to ${task.user.email}`
                    );
                })
                .catch((err) => {
                    this.logger.warn(
                        `Failed to send invite email: ${err}`
                    );
                });
        }

        return task;
    }

    @Get('approve')
    async approveTask(@Query('taskId') taskId: string) {
        await this.database.Task.updateOne(
            { _id: taskId },
            { $set: { isApproved: 'true' } }
        );

        return { message: 'Task approved' };
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
        const r = await this.database.Task.findOne({ _id: id })
            .populate('category')
            .populate('user')
            .populate({
                path: 'groupTask',
                populate: [
                    { path: 'owner' }
                ]
            });

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

        const task = await this.database.Task.findOne({ _id: id })
            .populate('category')
            .populate('user')
            .populate({
                path: 'groupTask',
                populate: [
                    { path: 'owner' }
                ]
            });

        if (body.groupTask != null && !body.isApproved) {
            const approvalLink = `http://localhost:${APP_PORT}/api/task/approve?taskId=${rs._id}`;

            const personalizations = {
                client_name: task.user.username,
                imgUrl: PUBLIC_CLIENT + '/assets/images/logo.png',
                title: 'Accept task',
                btnText: 'Accept task',
                description: `${task.groupTask.owner.username} is inviting you to join his project. Simply click the link below to accept the task and get started.`,
                verifyUrl: approvalLink
            }

            this.mailer
                .send({
                    client_email: task.user.email,
                    client_name: task.user.username,
                    template: "TemplateWithBtn",
                    personalizations: personalizations,
                    subject: 'Accept task',
                    verifyUrl: approvalLink
                })
                .then(() => {
                    this.logger.verbose(
                        `Invite email sent to ${task.user.email}`
                    );
                })
                .catch((err) => {
                    this.logger.warn(
                        `Failed to send invite email: ${err}`
                    );
                });
        }

        return task;
    }
}