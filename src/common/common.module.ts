import { Module } from '@nestjs/common';
import { ErrorLogService } from './services/error-log.service';

@Module({
  providers: [ErrorLogService],
  exports: [ErrorLogService],
})
export class CommonModule {}
