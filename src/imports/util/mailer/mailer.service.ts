import { Injectable, Logger } from "@nestjs/common"
import { DIR_STORAGE, DIR_TPLT, E_MAILER_BLANK_WITH_BTN_TEMPLATE, E_MAILER_SENDER, E_MAILER_SENDER_API_KEY, E_MAILER_SENDER_PASS, E_MAILER_TASK_EXPIRED_TEMPLATE, E_MAILER_VERIFY_CODE_TEMPLATE } from "src/config";
import * as fs from 'fs';
import * as nodemailer from 'nodemailer';
import * as path from "path";
import * as handlebars from 'handlebars';


type Email = {
    client_email: string,
    client_name: string,
    // template: "TemplateWithBtn" | "TemplateVerifyCode" | "TemplateTaskExpired",
    template: string,
    subject: string,
    personalizations: any,
    file?: string,
    fileName?: string,
    verifyUrl?: string,
}

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);
    private _transporter: nodemailer.Transporter;
    private _emailerSendFrom: string;

    constructor() {
        this.initialize();
    }

    async initialize(): Promise<void> {
        try {
            this.logger.log('Initializing MailerService...');
            this._emailerSendFrom = 'SmartTask';
            this._transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: E_MAILER_SENDER,
                    pass: E_MAILER_SENDER_PASS,
                },
            });
        } catch (error) {
            this.logger.error('Failed to initialize MailerService:', error);
            throw error;
        }
    }

    // private get mailer() {
    //     if (!this._mailer) {
    //         this._mailer = new MailerSend({ apiKey: E_MAILER_SENDER_API_KEY });
    //     }
    //     return this._mailer;
    // }

    // private get sentFrom() {
    //     if (!this._sentFrom) {
    //         this._sentFrom = new Sender(E_MAILER_SENDER, this._senderName);
    //     }
    //     return this._sentFrom;
    // }

    public async send(email: Email) {
        try {
            const mailOptions = this.compose(email);

            const info = await this._transporter.sendMail(mailOptions);
            this.logger.debug(`Sent email to [${email.client_email}]`);
            console.log('Message sent: %s', info.messageId);
        } catch (err: any) {
            console.log(err);
            this.logger.error(`Failed sending email to [${email.client_email}]: ${err.message}`, err.stack);
        }
    }

    private compose(email: Email): nodemailer.SendMailOptions {
        if (!email.personalizations || typeof email.personalizations !== 'object') {
            throw new Error("Email personalizations data is missing or invalid.");
        }

        const templateFilePath = path.join(DIR_TPLT, `${email.template}.hbs`);

        if (!fs.existsSync(templateFilePath)) {
            throw new Error(`Template file not found: ${templateFilePath}`);
        }

        const templateSource = fs.readFileSync(templateFilePath, 'utf-8');
        const template = handlebars.compile(templateSource);
        const htmlContent = template(email.personalizations);

        let mailOptions: nodemailer.SendMailOptions = {
            from: E_MAILER_SENDER,
            to: email.client_email,
            subject: email.subject,
            html: htmlContent,
        };

        if (email.file && email.fileName) {
            mailOptions.attachments = [
                {
                    filename: email.fileName,
                    content: fs.readFileSync(email.file),
                    encoding: 'base64',
                },
            ];
        }

        return mailOptions;
    }

    // public async send(email: Email) {
    //     try {
    //         await this.mailer.email.send(this.compose(email));
    //         this.logger.debug(`Sent email to [${email.client_email}]`);
    //     } catch (err: any) {
    //         console.log(err)
    //         this.logger.error(`Failed sending email to [${email.client_email}]: ${err.message}`, err.stack);
    //     }
    // }

    // private compose(email: Email): EmailParams {
    //     const recipients = [new Recipient(
    //         email.client_email,
    //         email.client_name
    //     )];

    //     const personalization = [
    //         {
    //             email: email.client_email,
    //             data: email.personalizations,

    //         }
    //     ];

    //     let template = ""
    //     switch (email.template) {
    //         case "TemplateVerifyCode": template = E_MAILER_VERIFY_CODE_TEMPLATE; break;
    //         case "TemplateWithBtn": template = E_MAILER_BLANK_WITH_BTN_TEMPLATE; break;
    //         case "TemplateTaskExpired": template = E_MAILER_TASK_EXPIRED_TEMPLATE; break;
    //         default: template = E_MAILER_BLANK_WITH_BTN_TEMPLATE; break
    //     }

    //     const thisEmail = new EmailParams()
    //         .setFrom(this.sentFrom)
    //         .setTo(recipients)
    //         .setReplyTo(this.sentFrom)
    //         .setSubject(email.subject)
    //         .setTemplateId(template)
    //         .setPersonalization(personalization);

    //     if (email.personalizations.file) {
    //         const attachments = [
    //             new Attachment(
    //                 fs.readFileSync(email.personalizations.file, { encoding: 'base64' }),
    //                 email.personalizations.fileName,
    //                 'attachment'
    //             )
    //         ]
    //         thisEmail.setAttachments(attachments)
    //     }

    //     return thisEmail
    // }

}