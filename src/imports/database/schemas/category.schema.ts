import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { HydratedDocument } from "mongoose";
import { IUser } from "./user.schema";

export type CategoryDocument = HydratedDocument<ICategory>;

@Schema({ timestamps: true, collection: 'category' })
export class ICategory {

    @Prop({ required: true })
    name: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: IUser.name })
    user: IUser;
}

export const CategorySchema = SchemaFactory.createForClass(ICategory);