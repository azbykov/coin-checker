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

    // Парсим аргументы командной строки
    const args = process.argv.slice(2);
    let limit: number | undefined;
    let sitesConfig: { source: 'sites.json' | 'googleSheets' | 'file'; filePath?: string } | undefined;

    // Обрабатываем аргументы
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--limit' && i + 1 < args.length) {
        const limitValueStr = args[i + 1];
        if (limitValueStr) {
          const limitValue = parseInt(limitValueStr, 10);
          if (!isNaN(limitValue) && limitValue > 0) {
            limit = limitValue;
            logger.info(`Setting limit to ${limit} sites`);
          } else {
            logger.warn(`Invalid limit value: ${limitValueStr}, ignoring`);
          }
        }
        i++; // Пропускаем следующий аргумент (значение лимита)
      } else if (arg === '--source' && i + 1 < args.length) {
        const source = args[i + 1];
        if (source && (source === 'sites.json' || source === 'googleSheets')) {
          sitesConfig = { source };
          logger.info(`Setting sites source to: ${source}`);
        } else {
          logger.warn(`Invalid source: ${source}, ignoring`);
        }
        i++; // Пропускаем следующий аргумент (значение источника)
      } else if (arg === '--config' && i + 1 < args.length) {
        const configPath = args[i + 1];
        if (configPath) {
          sitesConfig = { source: 'file', filePath: configPath };
          logger.info(`Setting config file path to: ${configPath}`);
        }
        i++; // Пропускаем следующий аргумент (путь к файлу)
      } else if (arg === '--help') {
        console.log(`
Использование: npm run analyze [опции]

Опции:
  --limit <число>     Ограничить количество анализируемых сайтов
  --source <источник> Источник конфигурации сайтов (sites.json | googleSheets)
  --config <путь>     Путь к файлу конфигурации сайтов
  --help              Показать эту справку

Примеры:
  npm run analyze
  npm run analyze -- --limit 5
  npm run analyze -- --source googleSheets
  npm run analyze -- --config src/config/dev-sites.json
  npm run analyze -- --limit 10 --config src/config/dev-sites.json
  npm run analyze -- --limit 10 --source sites.json
        `);
        process.exit(0);
      }
    }

    // Запускаем анализ с параметрами
    await batchSiteAnalyzer.run(limit, sitesConfig);
    
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
