import { ForbiddenException, Injectable, Logger, NotAcceptableException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { DatabaseService } from "../database/service/database.service";
import { MailerService } from "../util/mailer/mailer.service";
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AUTH_USER_JWT_EXPIRATION_DAYS, AUTH_USER_JWT_EXPIRATION_MINUTES, AUTH_USER_JWT_SECRET, FORGET_PASSWORD_EXPIRY_MINUTES, PUBLIC_CLIENT } from "src/config";

import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import moment from 'dayjs';

import { InvalidCredential } from "src/exceptions/invalid-credential";
import { UserDocument } from "../database/schemas/user.schema";
import { UserInfoService } from "../shared/user.service";


@Injectable()
export class AuthService {

    private readonly logger = new Logger(AuthService.name);

    constructor(
        private database: DatabaseService,
        private mailer: MailerService,
        private userInfo: UserInfoService
    ) { }

    public get token() {
        return {
            ban: async (token: string) => {
                if (!(await this.token.banned(token))) {
                    await this.database.BannedToken.create({ token });
                }
            },
            banned: async (token: string) => {
                return (await this.database.BannedToken.countDocuments({ token })) > 0;
            },
            verify: async (token: string) => {
                try {
                    return jwt.verify(token, AUTH_USER_JWT_SECRET, {
                        ignoreExpiration: false,
                    }) as any;
                } catch (err) {
                    if (err instanceof TokenExpiredError) {
                        throw new UnauthorizedException({
                            statusCode: 401,
                            message: 'Login Token Expired. Please Login Again'
                        });
                    } else if (err instanceof JsonWebTokenError) {
                        throw new UnauthorizedException({
                            statusCode: 401,
                            message: 'Login Token Expired. Please Login Again'
                        });
                    }
                    throw err;
                }
            },
            refresh: async (token: string) => {
                try {
                    const decoded = await this.token.verify(token);
                    const user = await this.database.User.findOne({ _id: decoded.sub });

                    if (!user) {
                        throw new InvalidCredential('User not found');
                    }

                    return this.user.sign(user);
                } catch (error) {
                    console.log(error)
                    throw new InvalidCredential('Invalid refresh token');
                }
            }
        };
    }

    public get user() {
        return {
            attempt: async (credential: { email: string; password: string }) => {
                const user = await this.database.User.findOne({ email: credential.email }).select('+password');

                if (user && (await bcrypt.compare(credential.password, user.password))) {
                    return user;
                }

                throw new InvalidCredential('Email or Password Incorrect');
            },
            get: async (id: string) => {
                const user = await this.database.User.findOne({
                    _id: id,
                })

                return user;
            },
            sign: async (user: UserDocument) => {
                const secret = AUTH_USER_JWT_SECRET;
                const expiry = AUTH_USER_JWT_EXPIRATION_MINUTES;
                const refreshExpiry = AUTH_USER_JWT_EXPIRATION_DAYS || 7;

                const { _id: id, username, email } = user;
                const accessToken = jwt.sign(
                    { sub: id, id, username, email },
                    secret,
                    { expiresIn: `${expiry || 60}m` },
                );

                const refreshToken = jwt.sign(
                    { sub: id },
                    secret,
                    { expiresIn: `${refreshExpiry || 7}d` },
                );

                return { accessToken, refreshToken };
            },
            forgetPassword: {
                request: async (id) => {
                    const user = await this.database.User.findOne({
                        _id: id
                    });
                    if (!user) {
                        throw new NotFoundException();
                    }

                    const secret = `${Math.floor(
                        Math.random() * 900000 + 100000
                    )}`.padStart(6, '0');

                    const expiryMinutes = FORGET_PASSWORD_EXPIRY_MINUTES ?? 10;
                    const expiry = moment().add(expiryMinutes, 'minutes').endOf('minute');

                    await this.database.User.updateOne(
                        { _id: id },
                        {
                            $set: {
                                forgetPasswordPasscode: bcrypt.hashSync(secret, 10),
                                forgetPasswordExpiry: expiry.toDate()
                            }
                        }
                    );

                    const resetPasswordOTPParams = await this.userInfo.getEmailParams("resetOtp");

                    const personalizations = {
                        verification_code: secret,
                        eventName: 'SMART TASK',
                        imgUrl: PUBLIC_CLIENT + '/assets/images/logo.png',
                        title: resetPasswordOTPParams.title
                            .replace(`{{dynamicUsername}}`, user.username),
                        footer: resetPasswordOTPParams.footer
                            .replace(`{{dynamicUsername}}`, user.username),
                        btnText: resetPasswordOTPParams.btnText
                            .replace(`{{dynamicUsername}}`, user.username),
                        description: resetPasswordOTPParams.description
                            .replace(`{{dynamicUsername}}`, user.username),
                    }

                    this.mailer
                        .send({
                            client_email: user.email,
                            client_name: user.username,
                            template: "TemplateVerifyCode",
                            personalizations: personalizations,
                            subject: resetPasswordOTPParams.subject
                        })
                        .then(() => {
                            this.logger.verbose(
                                `send email for user ${user.username} to ${user.email}`,
                            );
                        })
                        .catch((err) => {
                            this.logger.warn(
                                `failed sent email for user ${user.username} to ${user.email}: ${err}`,
                            )
                        })
                },
                validate: async (id: string, token: string) => {
                    const user = await this.database.User.findOne({
                        _id: id,
                    })
                        .select('+forgetPasswordPasscode')
                        .select('forgetPasswordExpiry');
                    if (
                        user.forgetPasswordExpiry &&
                        bcrypt.compareSync(token, user.forgetPasswordPasscode)
                    ) {
                        if (moment().isAfter(moment(user.forget_password_expiry))) {
                            throw new NotAcceptableException(
                                `Verification code expired. Pleas send another request.`
                            )
                        }
                        return true;
                    }
                    throw new ForbiddenException(`invalid verification code.`);
                }
            }
        };
    }
}