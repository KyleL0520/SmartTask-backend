import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DatabaseService } from "../database/service/database.service";
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import { MailerService } from "../util/mailer/mailer.service";
import { PUBLIC_CLIENT } from "src/config";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

@Injectable()
export class TaskSchedulerService {
    private readonly logger = new Logger(TaskSchedulerService.name);

    constructor(
        private readonly database: DatabaseService,
        private mailer: MailerService,
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleExpiredChecking() {
        const now = dayjs.utc();

        const tasks = await this.database.Task.find({ isExpired: false }).populate('user');

        for (const task of tasks) {
            const cleanedTime = task.deadlinesTime.replace(/\s+/g, '');
            const formattedTime = cleanedTime.slice(0, 5) + ' ' + cleanedTime.slice(5);
            const deadlineStr = `${task.deadlinesDate} ${formattedTime}`;

            const deadline = dayjs.utc(deadlineStr, 'D MMMM YYYY hh:mm A', true);

            if (!deadline.isValid()) {
                console.log(`Invalid deadline format for task "${task.title}":`, deadlineStr);
                continue;
            }

            if (now.isAfter(deadline)) {
                await this.database.Task.updateOne(
                    { _id: task._id },
                    { $set: { isExpired: true } }
                );
                console.log(`Marked task ${task.title} as expired`);
            }
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleReminderChecking() {
        const now = dayjs.utc();

        const tasks = await this.database.Task.find({
            reminderDate: { $ne: null },
            remidnerTime: { $ne: null },
            isExpired: false,
        }).populate('user');

        for (const task of tasks) {
            const user = task.user;

            const personalizations = {
                title: task.title,
                expiration_date: dayjs(task.deadlinesDate, 'D MMMM YYYY').format('DD MMMM YYYY')
            };

            this.mailer
                .send({
                    client_email: user.email,
                    client_name: user.username,
                    template: 'TemplateTaskExpired',
                    personalizations,
                    subject: `Reminder: ${task.title}`,
                })
                .then(() => {
                    this.logger.verbose(`Sent reminder email for task "${task.title}" to ${user.email}`);
                })
                .catch((err) => {
                    this.logger.warn(`Failed to send reminder email for task "${task.title}" to ${user.email}: ${err}`);
                });
        }
    }
}
