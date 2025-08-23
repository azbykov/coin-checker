// TODO: Задача - Запуск анализа массива сайтов
// Назначение: Точка входа для запуска анализа списка сайтов
// Вход: Нет
// Выход: Результаты анализа в Telegram
// Ошибки: Ошибки конфигурации, сети, парсинга

import { batchSiteAnalyzer } from './batchSiteAnalyzer';
import { logger } from '../utils/logger';
import { config } from '../config/config';

async function main(): Promise<void> {
  try {
    logger.info('Starting batch site analysis script');
    
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
  }
}

// Запускаем скрипт
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in batch site analysis script', error as Error);
    process.exit(1);
  });
}
