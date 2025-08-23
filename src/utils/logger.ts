// TODO: Задача 5 - Логирование
// Назначение: Централизованное логирование с разными уровнями
// Вход: Сообщения и уровень логирования
// Выход: Логи в консоль
// Ошибки: Нет

import { LogLevel } from '../types';

class Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message));
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message));
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog('error')) {
      const errorMessage = error ? `${message}: ${error.message}` : message;
      console.error(this.formatMessage('error', errorMessage));
      if (error?.stack) {
        console.error(error.stack);
      }
    }
  }
}

export const logger = new Logger(); 