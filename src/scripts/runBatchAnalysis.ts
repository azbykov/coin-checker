// TODO: Задача - Запуск анализа массива сайтов
// Назначение: Точка входа для запуска анализа списка сайтов
// Вход: Нет
// Выход: Результаты анализа в Telegram
// Ошибки: Ошибки конфигурации, сети, парсинга

import { batchSiteAnalyzer } from './batchSiteAnalyzer';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { browserService } from '../services/browserService';
import { setupSignalHandlers } from '../utils/signalHandler';

async function main(): Promise<void> {
  try {
    logger.info('Starting batch site analysis script');
    
    // Настраиваем обработчики сигналов для graceful shutdown
    setupSignalHandlers();
    
    // Проверяем конфигурацию
    if (!config.telegram.botToken || !config.telegram.chatId) {
      throw new Error('Telegram configuration is missing');
    }

    // Запускаем анализ
    await batchSiteAnalyzer.run();
    
    logger.info('Batch site analysis script completed successfully');
    
  } catch (error) {
    logger.error('Failed to run batch site analysis script', error as Error);
    process.exit(1);
  } finally {
    // Очищаем ресурсы браузера
    try {
      await browserService.close();
      logger.info('Browser service cleaned up');
    } catch (error) {
      logger.warn('Failed to cleanup browser service');
    }
    
    // Принудительно завершаем процесс
    logger.info('Exiting process...');
    process.exit(0);
  }
}

// Запускаем скрипт
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in batch site analysis script', error as Error);
    process.exit(1);
  });
}
