// TODO: Задача 22 - Главный файл
// Назначение: Точка входа в приложение, координация всех компонентов
// Вход: Аргументы командной строки
// Выход: Результаты анализа крипто-проектов
// Ошибки: Ошибки инициализации, ошибки обработки

import { orchestrator } from './services/orchestrator';
import { urlProcessor } from './services/urlProcessor';
import { reportService } from './services/reportService';
import { logger } from './utils/logger';
import { setupSignalHandlers } from './utils/signalHandler';
// import { config } from './config/config';

// Пример URL для тестирования
const SAMPLE_URLS = [
  'https://example-ico.com',
  'https://test-launchpad.io',
  'https://crypto-presale.net',
];

async function main(): Promise<void> {
  try {
    logger.info('Starting Crypto Checker application...');
    
    // Настройка обработчиков сигналов
    setupSignalHandlers();
    
    // Инициализация оркестратора
    await orchestrator.initialize();
    
    // Получение URL из аргументов командной строки или использование примеров
    const urls = process.argv.length > 2 
      ? process.argv.slice(2) 
      : SAMPLE_URLS;
    
    logger.info(`Processing ${urls.length} URLs: ${urls.join(', ')}`);
    
    // Обработка URL
    const results = await urlProcessor.processUrlList(urls);
    
    // Генерация статистики
    const stats = await reportService.generateStatistics(results);
    logger.info(`Processing completed. Success rate: ${stats.successRate.toFixed(1)}%`);
    
    // Создание и отправка отчётов
    await orchestrator.generateAndSendReport(results);
    
    // Сохранение данных
    await reportService.saveReportData(results);
    
    logger.info('Application completed successfully');
    
  } catch (error) {
    logger.error('Application failed', error as Error);
    
    // Отправка ошибки в Telegram
    try {
      await orchestrator.generateAndSendReport([]);
    } catch (telegramError) {
      logger.error('Failed to send error to Telegram', telegramError as Error);
    }
    
    process.exit(1);
  } finally {
    // Очистка ресурсов
    await orchestrator.cleanup();
  }
}

// Запуск приложения
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main', error);
    process.exit(1);
  });
} 