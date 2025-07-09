import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TaskSchedulerService } from './task-scheduler.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '../util/mailer/mailer.module';



@Module({
    imports: [DatabaseModule, ScheduleModule.forRoot(), MailerModule],
    providers: [
        TaskSchedulerService
    ],
    exports: [
        TaskSchedulerService
    ],
})
export class SchedulerModule {
}
