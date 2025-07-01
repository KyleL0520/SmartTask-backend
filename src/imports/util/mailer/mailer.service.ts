import { Injectable, Logger } from "@nestjs/common"
import { Attachment, EmailParams, MailerSend, Recipient, Sender } from "mailersend"
import { E_MAILER_BLANK_WITH_BTN_TEMPLATE, E_MAILER_SENDER, E_MAILER_SENDER_API_KEY, E_MAILER_VERIFY_CODE_TEMPLATE } from "src/config";
import * as fs from 'fs';

type Email = {
    client_email: string,
    client_name: string,
    template: "TemplateWithBtn" | "TemplateVerifyCode",
    subject: string,
    personalizations: any,
    file?: string,
    fileName?: string,
    verifyUrl?: string,
}

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);
    private _mailer: MailerSend;
    private _sentFrom: Sender;
    private _senderName: string;

    constructor() { }

    async initialize(): Promise<void> {
        this.logger.log('Fetching organize name...');
        this._senderName = 'Smart Task'
    } catch(error) {
        this.logger.error('Failed to initialize MailerService:', error);
        throw error;
    }

    private get mailer() {
        if (!this._mailer) {
            this._mailer = new MailerSend({ apiKey: E_MAILER_SENDER_API_KEY });
        }
        return this._mailer;
    }

    private get sentFrom() {
        if (!this._sentFrom) {
            this._sentFrom = new Sender(E_MAILER_SENDER, this._senderName);
        }
        return this._sentFrom;
    }

    public async send(email: Email) {
        console.log(this.compose(email));
        try {
            await this.mailer.email.send(this.compose(email));
            this.logger.debug(`Sent email to [${email.client_email}]`);
        } catch (err: any) {
            console.log(err)
            this.logger.error(`Failed sending email to [${email.client_email}]: ${err.message}`, err.stack);
        }
    }

    private compose(email: Email): EmailParams {
        const recipients = [new Recipient(
            email.client_email,
            email.client_name
        )];

        const personalization = [
            {
                email: email.client_email,
                data: email.personalizations,

            }
        ];

        let template = ""
        switch (email.template) {
            case "TemplateVerifyCode": template = E_MAILER_VERIFY_CODE_TEMPLATE; break;
            case "TemplateWithBtn": template = E_MAILER_BLANK_WITH_BTN_TEMPLATE; break;
            default: template = E_MAILER_BLANK_WITH_BTN_TEMPLATE; break
        }

        const thisEmail = new EmailParams()
            .setFrom(this.sentFrom)
            .setTo(recipients)
            .setReplyTo(this.sentFrom)
            .setSubject(email.subject)
            .setTemplateId(template)
            .setPersonalization(personalization);

        if (email.personalizations.file) {
            const attachments = [
                new Attachment(
                    fs.readFileSync(email.personalizations.file, { encoding: 'base64' }),
                    email.personalizations.fileName,
                    'attachment'
                )
            ]
            thisEmail.setAttachments(attachments)
        }

        return thisEmail
    }


}