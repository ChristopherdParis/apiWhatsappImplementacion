import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ConfigModule } from '@nestjs/config';
import { HttpExceptionLoggingFilter } from './common/filters/http-exception-logging.filter';
import { ErrorLogService } from './common/services/error-log.service';

@Module({
  imports: [ConfigModule.forRoot(), WhatsappModule],
  controllers: [AppController],
  providers: [
    AppService,
    ErrorLogService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionLoggingFilter,
    },
  ],
})
export class AppModule {}
