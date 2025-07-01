import { Logger } from "@nestjs/common";
import { CliModule } from "src/modules/cli/cli.module";
import { SeederService } from "src/modules/cli/seeder.service";
import { createApp } from "src/starter";

const logger = new Logger("CLI-INIT");

async function bootstrap() {
    const app = await createApp(CliModule);
    const seeder = app.get(SeederService);

    try {
        await seeder.data();
    } catch (e) {
        logger.error(e.stack);
    } finally {
        await app.close();
    }
}

bootstrap().then(() => logger.verbose("finished")).finally(() => process.exit(0));