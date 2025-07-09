import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument, now } from "mongoose";
import { IUser } from "./user.schema";
import { ICategory } from "./category.schema";
import { IGroupTask } from "./group-task.schema";

export type TaskDocument = HydratedDocument<ITask>;

@Schema({ timestamps: true, collection: 'task' })
export class ITask {

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: IUser.name })
    user: IUser;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ICategory.name })
    category: ICategory;

    @Prop({ required: true })
    deadlinesDate: string;

    @Prop({ required: true })
    deadlinesTime: string;

    @Prop()
    reminderDate: string;

    @Prop()
    reminderTime: string;

    @Prop()
    priority: string;

    @Prop({ default: 'Pending' })
    status: string;

    @Prop({ default: false })
    isExpired: boolean;

    @Prop({ default: false })
    isApproved: boolean;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: IGroupTask.name })
    groupTask: IGroupTask;
}

export const TaskSchema = SchemaFactory.createForClass(ITask);
