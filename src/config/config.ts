// TODO: Задача 4 - Загрузка конфигурации
// Назначение: Загрузка и валидация переменных окружения
// Вход: Переменные окружения
// Выход: Объект конфигурации
// Ошибки: Отсутствующие обязательные переменные

import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

function validateConfig(): Config {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    openai: {
      apiKey: process.env['OPENAI_API_KEY']!,
    },
    telegram: {
      botToken: process.env['TELEGRAM_BOT_TOKEN']!,
      chatId: process.env['TELEGRAM_CHAT_ID']!,
    },
    browser: {
      headless: process.env['BROWSER_HEADLESS'] === 'true',
      timeout: parseInt(process.env['BROWSER_TIMEOUT'] || '30000', 10),
    },
    app: {
      logLevel: process.env['LOG_LEVEL'] || 'info',
      maxConcurrentRequests: parseInt(
        process.env['MAX_CONCURRENT_REQUESTS'] || '3',
        10,
      ),
      screenshotsDir: process.env['SCREENSHOTS_DIR'] || 'screenshots',
    },
  };
}

export const config = validateConfig(); 