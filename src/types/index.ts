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
  customData?: CustomDataResult[];
}

export interface ScreenshotResult {
  url: string;
  screenshot: Buffer;
  success: boolean;
  error?: string;
}

export interface JsonApiResult {
  url: string;
  data: any;
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

export interface JsonApiConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  dataMapping: {
    currentPrice?: string;
    nextPrice?: string;
    listingPrice?: string;
    raised?: string;
    [key: string]: string | undefined;
  };
}

export interface CustomDataConfig {
  source: 'selector' | 'json' | 'text';
  selector?: string; // для source: 'selector'
  jsonApi?: JsonApiConfig; // для source: 'json'
  text?: string; // для source: 'text'
  label: string; // название для идентификации данных
  url?: string; // URL для сбора данных (если не указан, используется основной URL сайта)
}

export interface CustomDataResult {
  label: string;
  data: string;
  success: boolean;
  error?: string;
}

export interface SiteConfig {
  url: string;
  selector?: string;
  selectors?: string[];
  skip?: boolean;
  dataSource?: 'screenshot' | 'json';
  jsonApi?: JsonApiConfig;
  customData?: CustomDataConfig[];
} 