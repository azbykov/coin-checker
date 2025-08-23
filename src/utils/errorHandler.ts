// TODO: Задача 6 - Обработка ошибок
// Назначение: Централизованная обработка и классификация ошибок
// Вход: Ошибки разных типов
// Выход: Обработанные ошибки с контекстом
// Ошибки: Нет

import { logger } from './logger';

export class AppError extends Error {
  public readonly isOperational: boolean;

  constructor(message: string, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, true);
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, true);
  }
}

export class ApiError extends AppError {
  constructor(message: string) {
    super(message, true);
  }
}

export function handleError(error: Error): void {
  if (error instanceof AppError && error.isOperational) {
    logger.warn(`Operational error: ${error.message}`);
  } else {
    logger.error('Unexpected error occurred', error);
  }
}

export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
} 