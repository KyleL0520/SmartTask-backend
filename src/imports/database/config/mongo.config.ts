import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule, MongooseModuleAsyncOptions } from "@nestjs/mongoose";
import { DATABASE_MONGO_URL } from "src/config";
import { IUser, UserFactory } from "../schemas/user.schema";
import { BannedTokeSchema, IBannedToken } from "../schemas/banned-token.schema";
import { CategorySchema, ICategory } from "../schemas/category.schema";
import { ITask, TaskSchema } from "../schemas/task.schema";
import { GroupTaskSchema, IGroupTask } from "../schemas/group-task.schema";
import { EmailParamsSchema, IEmailParams } from "../schemas/email-param.schema";

export const mongooseModuleAsyncOptions: MongooseModuleAsyncOptions = {
    imports: [ConfigModule],
    useFactory: async () => {
        const uri = DATABASE_MONGO_URL;
        return { uri };
    },
    inject: [ConfigService]
}

export const MongoFeatures = MongooseModule.forFeatureAsync([
    { name: IUser.name, useFactory: UserFactory },
    { name: IBannedToken.name, useFactory: () => BannedTokeSchema },
    { name: ICategory.name, useFactory: () => CategorySchema },
    { name: ITask.name, useFactory: () => TaskSchema },
    { name: IGroupTask.name, useFactory: () => GroupTaskSchema },
    { name: IEmailParams.name, useFactory: () => EmailParamsSchema },
]);

export const MongoRoot = MongooseModule.forRootAsync(mongooseModuleAsyncOptions);