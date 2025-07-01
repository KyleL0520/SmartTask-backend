import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { CLOUDINARY_API_KEY } from "src/config";
import * as bcrypt from "bcryptjs";

export type UserDocument = HydratedDocument<IUser>;

@Schema({ timestamps: true, collection: 'user' })
export class IUser {

    @Prop({ required: true })
    username: string;

    @Prop({ required: true })
    email: string;

    @Prop({ select: false })
    password: string;

    @Prop()
    avatarPhoto: string;

    @Prop({ select: false })
    forgetPasswordPasscode?: string;

    @Prop({ select: false })
    forgetPasswordExpiry?: string;

    @Prop({ default: false })
    isEmailVerified: boolean;

    @Prop({ default: null })
    verificationToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(IUser);

export const UserFactory = () => {
    const schema = UserSchema;
    schema.pre('save', async function (next) {
        try {
            if (this.isModified('password')) {
                const password = this.get('password');
                const isHashed = /^\$2[aby]\$[\d]+\$/.test(password);
                if (!isHashed) {
                    this.set('password', await bcrypt.hash(password, 10));
                }
            }
            return next();
        } catch (error) {
            return next(error);
        }
    });
    schema.pre("updateOne", async function (next) {
        try {
            const update = this.getUpdate?.();
            const updatedSet = update?.["$set"];
            if (updatedSet?.hasOwnProperty("password")) {
                const password = this.get('password');
                const isHashed = /^\$2[aby]\$[\d]+\$/.test(password);
                if (!isHashed) {
                    this.set('password', await bcrypt.hash(password, 10));
                }
            }
            return next();
        } catch (error) {
            return next(error);
        }
    })
    return schema;
}

// UserSchema.virtual('avatarPhotoDIR').get(function () {
//     return this.avatarPhoto ? `${CLOUDINARY_API_KEY}/` + this.avatarPhoto : null;
// })