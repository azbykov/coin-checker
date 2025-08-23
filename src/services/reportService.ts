// TODO: Задача 21 - Создание отчётов
// Назначение: Генерация различных типов отчётов
// Вход: Результаты обработки
// Выход: Форматированные отчёты
// Ошибки: Нет

import { ProcessingResult } from '../types';
import { ReportFormatter } from '../utils/reportFormatter';
import { storageService } from './storageService';
import { logger } from '../utils/logger';

export class ReportService {
  async generateFullReport(results: ProcessingResult[]): Promise<string> {
    logger.info('Generating full report');
    return ReportFormatter.formatMultipleProjects(results);
  }

  async generateSummaryReport(results: ProcessingResult[]): Promise<string> {
    logger.info('Generating summary report');
    return ReportFormatter.formatSummary(results);
  }

  async generateIndividualReports(results: ProcessingResult[]): Promise<string[]> {
    logger.info('Generating individual reports');
    
    return results
      .filter(result => result.success && result.data)
      .map(result => ReportFormatter.formatSingleProject(result.data!));
  }

  async saveReportData(results: ProcessingResult[]): Promise<string> {
    logger.info('Saving report data to file');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const averageTime = Math.round(totalTime / results.length);
    
    // Сохранение полных результатов
    const resultsPath = storageService.saveResults(results);
    
    // Сохранение сводки
    const summaryPath = storageService.saveSummary({
      totalProcessed: results.length,
      successful,
      failed,
      totalTime,
      averageTime,
    });
    
    logger.info(`Reports saved: ${resultsPath}, ${summaryPath}`);
    return resultsPath;
  }

  async generateStatistics(results: ProcessingResult[]): Promise<{
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    averageTime: number;
    totalTime: number;
  }> {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    const averageTime = total > 0 ? Math.round(totalTime / total) : 0;
    
    return {
      total,
      successful,
      failed,
      successRate,
      averageTime,
      totalTime,
    };
  }
}

export const reportService = new ReportService(); 