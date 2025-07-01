import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiModule } from './modules/api/api.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from "path";

@Module({
  imports: [
    ApiModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'storage', 'data'),
      serveRoot: '/files/'
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
