import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type EmailParamsDocument = HydratedDocument<IEmailParams>;

@Schema({ timestamps: true, collection: 'email-params' })
export class IEmailParams {

    @Prop({ required: true })
    key: String;

    @Prop()
    label: String;

    @Prop()
    subject: String;

    @Prop()
    title: String;

    @Prop()
    description: String;

    @Prop()
    footer: String;

    @Prop()
    btnText: String;
}

export const EmailParamsSchema = SchemaFactory.createForClass(IEmailParams);