import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const loggerLevels = (
    process.env.LOG_LEVELS ?? 'log,error,warn,debug,verbose'
  )
    .split(',')
    .map((level) => level.trim())
    .filter(Boolean) as Array<'log' | 'error' | 'warn' | 'debug' | 'verbose'>;

  const app = await NestFactory.create(AppModule, {
    logger: loggerLevels,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
