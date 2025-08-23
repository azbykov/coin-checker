// TODO: Задача 15 - Форматирование отчётов
// Назначение: Создание красивых HTML отчётов для Telegram
// Вход: Данные крипто-проектов
// Выход: Отформатированный HTML текст
// Ошибки: Нет

import { CryptoProjectData, ProcessingResult } from '../types';

export class ReportFormatter {
  static formatSingleProject(data: CryptoProjectData): string {
    return `
<b>📊 Анализ крипто-проекта</b>

🔗 <b>URL:</b> <a href="${data.url}">${data.url}</a>
⏰ <b>Время анализа:</b> ${data.timestamp.toLocaleString('ru-RU')}

💰 <b>Текущая цена:</b> ${data.currentPrice}
📈 <b>Цена при листинге:</b> ${data.listingPrice}
💵 <b>Собрано средств:</b> ${data.raised}
    `.trim();
  }

  static formatMultipleProjects(results: ProcessingResult[]): string {
    const successfulResults = results.filter(r => r.success && r.data);
    const failedResults = results.filter(r => !r.success);

    let report = `
<b>📊 Отчёт по анализу крипто-проектов</b>

📈 <b>Успешно обработано:</b> ${successfulResults.length}
❌ <b>Ошибок:</b> ${failedResults.length}
⏱️ <b>Общее время:</b> ${this.calculateTotalTime(results)}мс

`;

    if (successfulResults.length > 0) {
      report += '\n<b>✅ Успешные результаты:</b>\n\n';
      
      successfulResults.forEach((result, index) => {
        const data = result.data!;
        report += `
<b>${index + 1}. Проект</b>
🔗 ${data.url}
💰 Текущая цена: ${data.currentPrice}
📈 Цена листинга: ${data.listingPrice}
💵 Собрано: ${data.raised}
⏱️ Время обработки: ${result.processingTime}мс

`;
      });
    }

    if (failedResults.length > 0) {
      report += '\n<b>❌ Ошибки:</b>\n\n';
      
      failedResults.forEach((result, index) => {
        report += `
<b>${index + 1}. ${result.url}</b>
❌ ${result.error}
⏱️ Время обработки: ${result.processingTime}мс

`;
      });
    }

    return report.trim();
  }

  static formatSummary(results: ProcessingResult[]): string {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalTime = this.calculateTotalTime(results);

    return `
<b>📊 Краткий отчёт</b>

✅ Успешно: ${successful}
❌ Ошибок: ${failed}
⏱️ Общее время: ${totalTime}мс
📊 Среднее время: ${Math.round(totalTime / results.length)}мс
    `.trim();
  }

  private static calculateTotalTime(results: ProcessingResult[]): number {
    return results.reduce((sum, result) => sum + result.processingTime, 0);
  }
} 