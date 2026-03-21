import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { HttpExceptionLoggingFilter } from './common/filters/http-exception-logging.filter';

@Module({
  imports: [ConfigModule.forRoot(), CommonModule, WhatsappModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionLoggingFilter,
    },
  ],
})
export class AppModule {}
