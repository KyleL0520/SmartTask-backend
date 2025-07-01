import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { IUser, UserDocument } from "../schemas/user.schema";
import { BaseModel } from "../model/base.model";
import { BannedTokenDocument, IBannedToken } from "../schemas/banned-token.schema";
import { CategoryDocument, ICategory } from "../schemas/category.schema";
import { ITask, TaskDocument } from "../schemas/task.schema";
import { GroupTaskDocument, IGroupTask } from "../schemas/group-task.schema";
import { EmailParamsDocument, IEmailParams } from "../schemas/email-param.schema";

@Injectable()
export class DatabaseService {
    constructor(
        @InjectModel(IUser.name) public readonly User: BaseModel<UserDocument>,
        @InjectModel(IBannedToken.name) public readonly BannedToken: BaseModel<BannedTokenDocument>,
        @InjectModel(ICategory.name) public readonly Category: BaseModel<CategoryDocument>,
        @InjectModel(ITask.name) public readonly Task: BaseModel<TaskDocument>,
        @InjectModel(IGroupTask.name) public readonly GroupTask: BaseModel<GroupTaskDocument>,
        @InjectModel(IEmailParams.name) public readonly EmailParams: BaseModel<EmailParamsDocument>,
    ) {

    }
}