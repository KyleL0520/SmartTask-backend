import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, UseGuards, Logger, Res, Req, BadRequestException } from "@nestjs/common";
import { mongo } from "mongoose";
import { APP_PORT, PUBLIC_CLIENT } from "src/config";
import { AuthGuard } from "src/imports/auth/auth.guard";
import { CategoryDocument } from "src/imports/database/schemas/category.schema";
import { DatabaseService } from "src/imports/database/service/database.service";
import { MailerService } from "src/imports/util/mailer/mailer.service";
import { TaskParserService } from "src/modules/task-parser/task-parser.service";
import axios from 'axios';

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
        'isReminderSent',
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
    private readonly logger = new Logger(TaskController.name);

    constructor(
        private database: DatabaseService,
        private mailer: MailerService,
        private taskParserService: TaskParserService
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
            isApproved,
            isByUser
        } = query;
        const where: any = {};

        if (isByUser == 'true') {
            if (user) where.user = new mongo.ObjectId(user)
        }

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
                title: 'Task Invitation!',
                btnText: 'Accept task invitation',
                description: `${task.groupTask.owner.username} is inviting you to join his project. Simply click the link below to accept the task and get started.`,
                verifyUrl: approvalLink
            }

            this.mailer
                .send({
                    client_email: task.user.email,
                    client_name: task.user.username,
                    template: "TemplateWithBtn",
                    personalizations: personalizations,
                    subject: 'Task Invitation!',
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

    // @Post('parse')
    // @UseGuards(AuthGuard)
    // async parseFromtext(@Body() body) {
    //     const categories = await this.database.Category.find({ user: body.user });

    //     const parsed = await this.taskParserService.parseTaskFromText(body.text, body.user, categories);
    //     console.log('parsed:', JSON.stringify(parsed, null, 2));

    //     const createdTask = await this.database.Task.create({
    //         user: body.user,
    //         title: parsed.title,
    //         description: parsed.description || parsed.title,
    //         deadlinesDate: parsed.deadlinesDate,
    //         deadlinesTime: parsed.deadlinesTime,
    //         reminderDate: parsed.reminderDate,
    //         reminderTime: parsed.reminderTime,
    //         priority: parsed.priority,
    //         category: parsed.category,
    //         groupTask: body.groupTask,
    //         isApproved: true,
    //         status: 'Pending',
    //     });

    //     console.log(`createdTask: ${createdTask}`);

    //     const populatedTask = await this.database.Task.findById(createdTask._id)
    //         .populate('category')
    //         .populate('user')
    //         .populate({
    //             path: 'groupTask',
    //             populate: [{ path: 'owner' }],
    //         });
    //     console.log(`populatedTask: ${populatedTask}`);

    //     return populatedTask;
    // }

    @Post('parse')
    @UseGuards(AuthGuard)
    async parseFromtext(@Body() body) {
        const { text, label, user, groupTask } = body;

        try {
            const response = await axios.post('http://localhost:8000/predict', { text, label });
            const parsed = response.data;

            const titleCharCount = parsed.title?.trim().length || 0;
            const descriptionCharCount = parsed.description?.trim().length || 0;

            if (titleCharCount > 25) {
                throw new BadRequestException(`Title exceeds 100 characters (found ${titleCharCount})`);
            }

            if (descriptionCharCount > 130) {
                throw new BadRequestException(`Description exceeds 500 characters (found ${descriptionCharCount})`);
            }

            const deadlineDT = new Date(`${parsed.deadlinesDate} ${parsed.deadlinesTime}`);
            const reminderDT = parsed.reminderDate && parsed.reminderTime
                ? new Date(`${parsed.reminderDate} ${parsed.reminderTime}`)
                : null;

            const now = new Date();

            if (deadlineDT < now) {
                throw new BadRequestException("Deadline cannot be before the current time");
            }

            if (reminderDT && reminderDT >= deadlineDT) {
                throw new BadRequestException("Reminder time cannot be after the deadline");
            }

            let categoryDoc = await this.database.Category.findOne({ name: parsed.category, user });

            if (!categoryDoc) {
                categoryDoc = await this.database.Category.findOne({ name: 'Others', user });
            }

            const createdTask = await this.database.Task.create({
                user: user,
                title: parsed.title,
                description: parsed.description || parsed.title,
                deadlinesDate: parsed.deadlinesDate,
                deadlinesTime: parsed.deadlinesTime,
                reminderDate: parsed.reminderDate || null,
                reminderTime: parsed.reminderTime || null,
                priority: parsed.priority,
                category: categoryDoc,
                groupTask: groupTask,
                isApproved: true,
                status: 'Pending',
            });

            const populatedTask = await this.database.Task.findById(createdTask._id)
                .populate('category')
                .populate('user')
                .populate({
                    path: 'groupTask',
                    populate: [{ path: 'owner' }],
                });

            return populatedTask;

        } catch (error) {
            console.error('Error in parseFromtext:', error);
            throw new BadRequestException('Failed to parse text using ML model.');
        }
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
                title: 'Task Invitation!',
                btnText: 'Accept task invitation',
                description: `${task.groupTask.owner.username} is inviting you to join his project. Simply click the link below to accept the task and get started.`,
                verifyUrl: approvalLink
            }

            this.mailer
                .send({
                    client_email: task.user.email,
                    client_name: task.user.username,
                    template: "TemplateWithBtn",
                    personalizations: personalizations,
                    subject: 'Task Invitation!',
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