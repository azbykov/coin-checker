#!/usr/bin/env tsx

import 'dotenv/config';
import { BatchSiteAnalyzer } from './batchSiteAnalyzer';
import { logger } from '../utils/logger';

async function example(): Promise<void> {
  try {
    logger.info('🚀 Пример использования BatchSiteAnalyzer с сохранением скриншотов');
    
    // Пример 1: Использование с настройками по умолчанию
    logger.info('📁 Пример 1: Использование с папкой по умолчанию (screenshots/)');
    const analyzer1 = new BatchSiteAnalyzer();
    await analyzer1.run();
    
    // Пример 2: Использование с кастомной папкой
    logger.info('📁 Пример 2: Использование с кастомной папкой (output/my-screenshots/)');
    const analyzer2 = new BatchSiteAnalyzer('output/my-screenshots');
    await analyzer2.run();
    
    logger.info('✅ Все примеры выполнены успешно!');
    
  } catch (error) {
    logger.error('❌ Ошибка в примере', error as Error);
    process.exit(1);
  }
}

// Запуск примера
if (require.main === module) {
  example().catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
}
