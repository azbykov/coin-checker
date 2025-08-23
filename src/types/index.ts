// TODO: Задача 16 - Модели данных
// Назначение: Определение всех типов данных для приложения
// Вход: Нет
// Выход: TypeScript интерфейсы и типы
// Ошибки: Нет

export interface CryptoProjectData {
  currentPrice: string;
  nextPrice: string;
  listingPrice: string;
  raised: string;
  url: string;
  timestamp: Date;
}

export interface ScreenshotResult {
  url: string;
  screenshot: Buffer;
  success: boolean;
  error?: string;
}

export interface VisionApiResponse {
  currentPrice: string;
  nextPrice: string;
  listingPrice: string;
  raised: string;
}

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
  replyMarkup?: any;
}

export interface Config {
  openai: {
    apiKey: string;
  };
  telegram: {
    botToken: string;
    chatId: string;
  };
  browser: {
    headless: boolean;
    timeout: number;
  };
  app: {
    logLevel: string;
    maxConcurrentRequests: number;
    screenshotsDir: string;
  };
}

export interface ProcessingResult {
  url: string;
  success: boolean;
  data?: CryptoProjectData;
  error?: string;
  processingTime: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SiteConfig {
  url: string;
  selector?: string;
  skip?: boolean;
} 