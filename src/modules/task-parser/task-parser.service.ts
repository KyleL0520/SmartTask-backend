import { Injectable, Logger } from "@nestjs/common";
import { DateTime } from 'luxon';
import * as chrono from 'chrono-node';
import { DatabaseService } from "src/imports/database/service/database.service";

const logger = new Logger("TaskParserService");

function extractCleanJson(text: string): string | null {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    let rawJson = match[0];

    rawJson = rawJson.replace(/\/\/.*$/gm, '');
    rawJson = rawJson.replace(/\/\*[\s\S]*?\*\//gm, '');

    return rawJson.trim();
}

function formatDate(d: Date): string {
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}

function formatTime(d: Date): string {
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
        .replace(':', ' : ')
        .toUpperCase();
}

@Injectable()
export class TaskParserService {

    constructor(
        private database: DatabaseService
    ) { }


    async parseTaskFromText(text: string, userId: string, categories: string[]): Promise<any> {
        const res = await fetch('http://localhost:11434/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                messages: [
                    {
                        role: 'system',
                        content: `You are a strict JSON producer. 
                            Return **only** a single JSON object with these fields:
                            - title (string, required, strictly no more than 20 words — reject or truncate longer titles)
                            - description (string, optional, strictly no more than 130 words)
                            - deadline (string, required, must be future date and time, like "2025-07-16 18:00")
                            - reminder (string, optional, must be future date-time before deadline)
                            - priority (string, one of: null, "important and urgent", "important but not urgent", "not important but urgent", "not important and not urgent")
                            - category (string, exactly one of: ${categories.join(', ')})

                            ⚠️ Do NOT return category as an object.
                            ⚠️ Do NOT wrap in markdown.
                            ⚠️ Do NOT include comments.
                            ⚠️ Do NOT include ObjectId or other MongoDB-specific fields.
                            Make sure the title does not exceed 20 words and the description does not exceed 130 words. If the input causes longer values, summarize or truncate.
                            Return valid JSON only.`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ]
            })
        });

        const json = await res.json();
        if (!json.choices?.length) {
            logger.error(`Bad Ollama response: ${JSON.stringify(json)}`);
            throw new Error('Ollama did not return choices');
        }

        const content = json.choices[0].message.content?.trim() ?? '';
        const jsonStr = extractCleanJson(content);

        if (!jsonStr) {
            logger.error('No JSON block found in model response:\n' + content);
            return null;
        }

        let parsed: any;
        try {
            const cleaned = jsonStr.replace(/,\s*(\}|])/g, '$1');
            parsed = JSON.parse(cleaned);
        } catch (err) {
            logger.error(`Invalid JSON response: ${jsonStr}`, err);
            throw new Error('Failed to parse JSON response');
        }

        if (!parsed.title || typeof parsed.title !== 'string') {
            logger.error(`Missing or invalid title in parsed response: ${JSON.stringify(parsed)}`);
            throw new Error('Task must include a valid title');
        }

        if (!parsed.deadline || typeof parsed.deadline !== 'string') {
            logger.error(`Missing or invalid deadline in parsed response: ${JSON.stringify(parsed)}`);
            throw new Error('Task must include a valid deadline');
        }

        if (!parsed.description || parsed.description.trim() === '') {
            parsed.description = parsed.title;
        }

        const titleWordCount = parsed.title?.trim().split(/\s+/).length ?? 0;
        const descriptionWordCount = parsed.description?.trim().split(/\s+/).length ?? 0;

        if (titleWordCount > 20) {
            logger.error(`Title too long: ${titleWordCount} words (max 20)`);
            throw new Error('Title must not exceed 20 words.');
        }

        if (descriptionWordCount > 130) {
            logger.error(
                `Description too long: ${descriptionWordCount} words (max 130)`,
            );
            throw new Error('Description must not exceed 130 words.');
        }

        const now = new Date();
        let deadlineDate: Date | null = null;
        if (parsed.deadline) {
            const chronoResult = chrono.parse(parsed.deadline, now, { forwardDate: true });

            if (chronoResult.length === 0 || !chronoResult[0].start) {
                logger.error(`Failed to parse deadline: ${parsed.deadline}`);
                throw new Error('Invalid deadline format');
            }

            deadlineDate = chronoResult[0].start.date();


            if (!chronoResult[0].start.isCertain('hour')) {
                logger.debug('No specific time in deadline. Defaulting to 23:59.');
                deadlineDate.setHours(23, 59, 0, 0);
            }

            if (deadlineDate.getTime() <= now.getTime()) {
                logger.error(
                    `Parsed deadline ${deadlineDate.toISOString()} is not in the future.`,
                );
                throw new Error('Deadline must be later than the current time.');
            }

            deadlineDate = DateTime.fromJSDate(deadlineDate)
                .setZone('Asia/Singapore')
                .toJSDate();

            parsed.deadlinesDate = formatDate(deadlineDate);
            parsed.deadlinesTime = formatTime(deadlineDate);
        }

        if (typeof parsed.reminder !== 'string') {
            parsed.reminder = null;
        }

        if (parsed.reminder && deadlineDate) {
            const reminderDate = chrono.parseDate(parsed.reminder, deadlineDate);
            if (reminderDate) {
                if (
                    reminderDate.getTime() <= now.getTime() ||
                    reminderDate.getTime() >= deadlineDate.getTime()
                ) {
                    logger.error(
                        `Reminder ${reminderDate.toISOString()} is outside allowed window.`,
                    );
                    throw new Error(
                        'Reminder must be after now and before the deadline.',
                    );
                }

                parsed.reminderDate = formatDate(reminderDate);
                parsed.reminderTime = formatTime(reminderDate);
            } else {
                logger.warn(`Failed to parse reminder: ${parsed.reminder}`);
                parsed.reminderDate = null;
                parsed.reminderTime = null;
            }
        } else {
            parsed.reminderDate = null;
            parsed.reminderTime = null;
        }

        const userCategories = await this.database.Category.find({ user: userId }).exec();
        let categoryName = parsed.category;
        if (typeof categoryName === 'object' && categoryName?.name) {
            logger.warn(`Received category as object: ${JSON.stringify(categoryName)}. Using name: ${categoryName.name}`);
            categoryName = categoryName.name;
        }

        const match = userCategories.find(c => c.name.toLowerCase() === categoryName?.toLowerCase());
        let categoryDoc;
        if (match) {
            categoryDoc = match;
        } else {
            categoryDoc = await this.database.Category.findOne({ name: 'Others', user: userId });
            if (!categoryDoc) {
                categoryDoc = await this.database.Category.create({
                    name: 'Others',
                    user: userId
                });
            }
        }
        parsed.category = categoryDoc._id;

        const PRIORITY_LIST = [
            'important and urgent',
            'important but not urgent',
            'not important but urgent',
            'not important and not urgent',
        ];


        if (parsed.priority) {
            const matchedPriority = PRIORITY_LIST.find(p =>
                p.toLowerCase() === parsed.priority.trim().toLowerCase()
            );

            parsed.priority = matchedPriority ?? null;
        }

        if (!parsed.description || parsed.description.trim() === '') {
            parsed.description = parsed.title;
        }

        delete parsed.deadline;
        delete parsed.reminder;

        return parsed;
    }
}