import { BadRequestException, Body, Controller, Get, Logger, NotAcceptableException, NotFoundException, ParseFilePipeBuilder, Post, Put, Query, UnauthorizedException, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { randomBytes } from "crypto";
import { APP_PORT, PUBLIC_CLIENT } from "src/config";
import { AuthUser } from "src/decorations/auth-user.decoration";
import { IRemoteClient, RemoteClient } from "src/decorations/remote-client.decoration";
import { InvalidCredential } from "src/exceptions/invalid-credential";
import { AuthGuard } from "src/imports/auth/auth.guard";
import { AuthService } from "src/imports/auth/auth.service";
import { DatabaseService } from "src/imports/database/service/database.service";
import { UserInfoService } from "src/imports/shared/user.service";
import { MailerService } from "src/imports/util/mailer/mailer.service";
import { Express } from 'express';
import { handleUpload } from "src/imports/util/fileUpload/cloudinary";

@Controller('/api/auth')
export class AuthController {

    private readonly logger = new Logger(AuthController.name);


    constructor(
        private auth: AuthService,
        private database: DatabaseService,
        private userInfo: UserInfoService,
        private mailer: MailerService,
    ) { }

    @Post('signup')
    @UseInterceptors(FileInterceptor('avatarPhoto'))
    async signUp(
        @Body() body,
        @UploadedFile
            (new ParseFilePipeBuilder()
                .addFileTypeValidator({ fileType: '(png|jpg|jpeg)' })
                .build())
        image: Express.Multer.File
    ) {
        return await this.auth.user.signUp(body, image);
    }

    @Post('login')
    async login(@Body() body) {
        const { email, password } = body;

        const user = await this.database.User.findOne({ email: body.email })

        if (!user) {
            throw new UnauthorizedException('Login Failed. Please check your Email');
        }

        if (!user.isEmailVerified) {
            throw new UnauthorizedException('Email is not verified');
        }

        try {
            const user = await this.auth.user.attempt({ email, password });
            if (user) {
                const tokens = await this.auth.user.sign(user)

                return {
                    token: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    user
                }
            }
        } catch (err) {
            throw new UnauthorizedException(err);
        }
        throw new InvalidCredential('Login Failed. Please check your Email or Password');
    }

    @Post('forgot-password')
    async forgotPassword(@Body() body) {
        const { email } = body;

        const user = await this.database.User.findOne({ email: email });
        if (user) {
            await this.auth.user.forgetPassword.request(user._id);
            return true;
        } else {
            throw new NotFoundException('Email Not Existed. Please Register First')
        }
    }

    @Post('validate')
    async validate(@Body() body) {
        const { otp, email } = body;

        try {
            const user = await this.database.User.findOne({ email: email });
            if (user) {
                const result = await this.auth.user.forgetPassword.validate(user._id, otp)
                return result
            }
            return false
        } catch (err) {
            return false;
        }
    }

    @Post('reset-password')
    async resetPassword(@Body() body) {
        const { email, password } = body;

        try {
            const user = await this.database.User.findOne({ email: email });
            if (user) {
                await this.database.User.updateOne(
                    { _id: user.id },
                    { $set: { password } }
                );
                return user;
            }
            throw new NotFoundException()
        } catch (err) {
            return false;
        }
    }

    @Get('profile')
    @UseGuards(AuthGuard)
    async getProfileAuthGuard(@AuthUser() usr) {
        return this.auth.user.get(usr.id);
    }

    @Post('logout')
    async logout(
        @RemoteClient() { token }: IRemoteClient
    ) {
        if (token) {
            return { success: await this.auth.token.ban(token) };
        }
        return { success: false };
    }

    @Post('refresh')
    async refreshToken(
        @Body() body,
    ) {
        if (body.token) {
            return this.auth.token.refresh(body.token);
        }

        throw new InvalidCredential('Refresh Token not valid.');
    }

    @Put('password')
    @UseGuards(AuthGuard)
    async updatePassword(
        @AuthUser() usr,
        @Body() body
    ) {
        const { current, password } = body;
        const user = await this.auth.user.get(usr.id);
        const ok = await this.auth.user.attempt({
            email: user.email,
            password: current
        });
        if (ok) {
            await this.database.User.updateOne(
                { _id: usr.id },
                { $set: { password } }
            );
            return { success: true };
        }
        throw new UnauthorizedException('Reset password failed.');
    }

    @Put('profile')
    @UseGuards(AuthGuard)
    async updateProfile(@Body() body, @AuthUser() usr) {
        const user = await this.auth.user.get(usr.id);
        if (user) {
            const set: any = {};
            ['name', 'email', 'avatarPhoto'].forEach((k) => {
                if (body.hasOwnProperty(k)) {
                    set[k] = body[k];
                }
            });
            await this.database.User.updateone({ _id: usr.id }, { $set: set });
            return { success: true };
        }
        throw new NotFoundException();
    }

    @Get('verify-email')
    async verifyEmail(@Query('token') token: string) {
        if (!token) {
            throw new BadRequestException('Token is required');
        }

        const user = await this.database.User.findOne({ verificationToken: token });

        if (!user) {
            throw new NotFoundException('Invalid or expired token');
        }

        await this.database.User.updateOne(
            { _id: user._id },
            { $set: { isEmailVerified: true }, $unset: { verificationToken: "" } }
        )
        return { message: 'Email verified successfully' };
    }
}