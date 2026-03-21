import { Injectable, Logger } from '@nestjs/common';
import { appendFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

interface ErrorLogEntry {
  timestamp: string;
  type: 'exception' | 'operational';
  context: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger(ErrorLogService.name);
  private readonly logDirectory = join(process.cwd(), 'logs');
  private readonly retentionDays = 3;

  async logException(
    context: string,
    error: unknown,
    details?: Record<string, unknown>,
  ) {
    await this.writeEntry({
      timestamp: new Date().toISOString(),
      type: 'exception',
      context,
      message: this.extractMessage(error),
      stack: this.extractStack(error),
      details,
    });
  }

  async logOperationalError(
    context: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    await this.writeEntry({
      timestamp: new Date().toISOString(),
      type: 'operational',
      context,
      message,
      details,
    });
  }

  private async writeEntry(entry: ErrorLogEntry) {
    try {
      await mkdir(this.logDirectory, { recursive: true });
      await this.cleanupOldLogs();
      await appendFile(
        this.resolveDailyLogFile(entry.timestamp),
        `${JSON.stringify(entry)}\n`,
        'utf8',
      );
    } catch (writeError) {
      this.logger.error(
        `Failed to write error log: ${this.extractMessage(writeError)}`,
      );
    }
  }

  private resolveDailyLogFile(timestamp: string) {
    const date = timestamp.slice(0, 10);
    return join(this.logDirectory, `errors-${date}.log`);
  }

  private async cleanupOldLogs() {
    const files = await readdir(this.logDirectory);
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;

    await Promise.all(
      files.map(async (file) => {
        if (!file.startsWith('errors-') || extname(file) !== '.log') {
          return;
        }

        const filePath = join(this.logDirectory, file);
        const fileStats = await stat(filePath);

        if (fileStats.mtimeMs < cutoff) {
          await rm(filePath, { force: true });
        }
      }),
    );
  }

  private extractMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return JSON.stringify(error);
  }

  private extractStack(error: unknown) {
    if (error instanceof Error) {
      return error.stack;
    }

    return undefined;
  }
}
