// TODO: Задача - Миграция конфигурации сайтов в Google Sheets
// Назначение: Перенос данных из sites.json в Google Sheets для удобного управления
// Вход: sites.json файл
// Выход: Данные в Google Sheets на листе SitesConfig
// Ошибки: Ошибки чтения файла, записи в Google Sheets

import fs from 'fs';
import path from 'path';
import { config } from '../config/config';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { logger } from '../utils/logger';

async function migrateSitesToSheets(): Promise<void> {
  try {
    logger.info('Starting migration of sites configuration to Google Sheets...');

    // Инициализируем Google Sheets сервис
    const googleSheetsService = new GoogleSheetsService(config.googleSheets);
    await googleSheetsService.initialize();

    // Читаем sites.json
    const sitesJsonPath = path.join(__dirname, '../config/sites.json');
    const sitesData = JSON.parse(fs.readFileSync(sitesJsonPath, 'utf-8'));

    logger.info(`Found ${sitesData.length} sites in sites.json`);

    // Сохраняем в Google Sheets
    await googleSheetsService.saveSitesConfig(sitesData);

    // Проверяем что данные загрузились корректно
    const loadedConfig = await googleSheetsService.loadSitesConfig();
    logger.info(`Verification: loaded ${loadedConfig.length} sites from Google Sheets`);

    // Закрываем соединение
    await googleSheetsService.close();

    logger.info('Migration completed successfully! 🎉');
    logger.info('');
    logger.info('📋 Next steps for managers:');
    logger.info('1. Open your Google Sheets document');
    logger.info('2. Go to the "SitesConfig" tab');
    logger.info('3. Edit configurations directly in the spreadsheet');
    logger.info('4. Use TRUE/FALSE for Skip and Wallet columns');
    logger.info('5. Use JSON format for complex fields (Selectors, JSON API Config, Custom Data)');
    logger.info('');
    logger.info('💡 The application will now read configuration from Google Sheets instead of sites.json');

  } catch (error) {
    logger.error('Migration failed', error as Error);
    process.exit(1);
  }
}

// Запускаем миграцию если скрипт вызван напрямую
if (require.main === module) {
  migrateSitesToSheets().catch(console.error);
}

export { migrateSitesToSheets };
