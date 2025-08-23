// TODO: Задача 18 - Сохранение результатов
// Назначение: Сохранение данных в файл для последующего анализа
// Вход: Результаты обработки
// Выход: Путь к сохранённому файлу
// Ошибки: Ошибки записи файла, недостаток места

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { ProcessingResult } from '../types';
import { logger } from '../utils/logger';

export class StorageService {
  private outputDir: string;

  constructor(outputDir = 'output') {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
      logger.info(`Created output directory: ${this.outputDir}`);
    }
  }

  saveResults(results: ProcessingResult[]): string {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `crypto-analysis-${timestamp}.json`;
      const filepath = join(this.outputDir, filename);

      const dataToSave = {
        timestamp: new Date().toISOString(),
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results,
      };

      writeFileSync(filepath, JSON.stringify(dataToSave, null, 2), 'utf8');
      
      logger.info(`Results saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      logger.error('Failed to save results', error as Error);
      throw new Error(`Failed to save results: ${(error as Error).message}`);
    }
  }

  saveSummary(summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    totalTime: number;
    averageTime: number;
  }): string {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `summary-${timestamp}.json`;
      const filepath = join(this.outputDir, filename);

      const dataToSave = {
        timestamp: new Date().toISOString(),
        ...summary,
      };

      writeFileSync(filepath, JSON.stringify(dataToSave, null, 2), 'utf8');
      
      logger.info(`Summary saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      logger.error('Failed to save summary', error as Error);
      throw new Error(`Failed to save summary: ${(error as Error).message}`);
    }
  }
}

export const storageService = new StorageService(); 