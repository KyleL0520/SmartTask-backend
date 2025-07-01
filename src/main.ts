import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { APP_PORT } from './config';
import { createWebApp } from './starter';

const logger = new Logger("MAIN");

async function bootstrap() {
  const app = await createWebApp(AppModule);
  await app.listen(APP_PORT, '0.0.0.0');

  logger.verbose(`application is running on: ${await app.getUrl()}`)
}

(async () => bootstrap())();
