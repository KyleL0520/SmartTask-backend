import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument, now } from "mongoose";
import { IUser } from "./user.schema";

export type GroupTaskDocument = HydratedDocument<IGroupTask>;

@Schema({ timestamps: true, collection: 'group-task' })
export class IGroupTask {

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: IUser.name })
    owner: IUser;

    @Prop({ required: true })
    projectName: string;

    @Prop({ required: true })
    projectDescription: string;

    @Prop({ default: 'To-do' })
    status: string;
}

export const GroupTaskSchema = SchemaFactory.createForClass(IGroupTask);