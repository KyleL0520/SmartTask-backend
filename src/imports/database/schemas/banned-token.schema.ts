import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BannedTokenDocument = HydratedDocument<IBannedToken>;

@Schema({ timestamps: true, collection: 'banned-token' })
export class IBannedToken {

    @Prop({ required: true })
    token: string;
}

export const BannedTokeSchema = SchemaFactory.createForClass(IBannedToken);