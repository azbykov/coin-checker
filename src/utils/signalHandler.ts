// TODO: Задача 23 - Обработка сигналов
// Назначение: Graceful shutdown при получении сигналов завершения
// Вход: Сигналы процесса
// Выход: Корректное завершение
// Ошибки: Нет

import { logger } from './logger';
import { browserService } from '../services/browserService';

let isShuttingDown = false;

export function setupSignalHandlers(): void {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      if (isShuttingDown) {
        logger.warn('Shutdown already in progress, forcing exit');
        process.exit(1);
      }
      
      isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Очищаем ресурсы браузера
        await browserService.close();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    });
  });
  
  // Обработка необработанных исключений
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection at ${promise}: ${reason}`);
    process.exit(1);
  });
  
  logger.info('Signal handlers setup completed');
} 