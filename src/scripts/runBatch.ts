#!/usr/bin/env tsx

/**
 * CLI скрипт для пакетной обработки URL
 * 
 * Использование:
 * npx tsx src/scripts/runBatch.ts [опции] <url1> <url2> ...
 * 
 * Опции:
 * --telegram - отправлять результаты в Telegram
 * --no-save - не сохранять результаты в файл
 * --max-concurrent <число> - максимальное количество параллельных запросов
 * --json - выводить результат в JSON формате
 * --help - показать справку
 */

import { batchProcessor } from './batchProcessor';
import { logger } from '../utils/logger';
import { readFileSync } from 'fs';

interface CliOptions {
  telegram: boolean;
  saveToFile: boolean;
  maxConcurrent: number;
  jsonOutput: boolean;
  help: boolean;
}

function parseArguments(): { urls: string[]; options: CliOptions } {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    telegram: false,
    saveToFile: true,
    maxConcurrent: 3,
    jsonOutput: false,
    help: false
  };
  
  const urls: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--telegram':
        options.telegram = true;
        break;
      case '--no-save':
        options.saveToFile = false;
        break;
      case '--max-concurrent':
        const maxConcurrentValue = args[i + 1];
        if (!maxConcurrentValue) {
          throw new Error('--max-concurrent требует значение');
        }
        const maxConcurrent = parseInt(maxConcurrentValue, 10);
        if (isNaN(maxConcurrent) || maxConcurrent < 1) {
          throw new Error('--max-concurrent требует положительное число');
        }
        options.maxConcurrent = maxConcurrent;
        i++; // пропускаем следующий аргумент
        break;
      case '--json':
        options.jsonOutput = true;
        break;
      case '--help':
        options.help = true;
        break;
      case '--file':
        // Читаем URL из файла
        const filename = args[i + 1];
        if (!filename) {
          throw new Error('--file требует имя файла');
        }
        try {
          const fileContent = readFileSync(filename, 'utf8');
          const fileUrls = fileContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
          urls.push(...fileUrls);
        } catch (error) {
          throw new Error(`Не удалось прочитать файл ${filename}: ${error}`);
        }
        i++; // пропускаем следующий аргумент
        break;
      default:
        if (arg && arg.startsWith('--')) {
          throw new Error(`Неизвестная опция: ${arg}`);
        }
        if (arg) {
          urls.push(arg);
        }
        break;
    }
  }
  
  return { urls, options };
}

function showHelp(): void {
  console.log(`
🪙 Crypto Checker - Пакетная обработка URL

Использование:
  npx tsx src/scripts/runBatch.ts [опции] <url1> <url2> ...

Опции:
  --telegram              Отправлять результаты в Telegram
  --no-save              Не сохранять результаты в файл
  --max-concurrent <N>   Максимальное количество параллельных запросов (по умолчанию: 3)
  --json                 Выводить результат в JSON формате
  --file <filename>      Читать URL из файла (по одному на строку)
  --help                 Показать эту справку

Примеры:
  # Обработать несколько URL
  npx tsx src/scripts/runBatch.ts https://example-ico.com https://test-launchpad.io

  # Обработать URL из файла
  npx tsx src/scripts/runBatch.ts --file examples/sample-urls.txt

  # Отправить результаты в Telegram
  npx tsx src/scripts/runBatch.ts --telegram https://example-ico.com

  # Вывести результат в JSON
  npx tsx src/scripts/runBatch.ts --json https://example-ico.com

  # Настроить параллелизм
  npx tsx src/scripts/runBatch.ts --max-concurrent 5 https://example-ico.com
`);
}

async function main(): Promise<void> {
  try {
    const { urls, options } = parseArguments();
    
    if (options.help) {
      showHelp();
      return;
    }
    
    if (urls.length === 0) {
      console.error('❌ Ошибка: Не указаны URL для обработки');
      console.log('Используйте --help для получения справки');
      process.exit(1);
    }
    
    logger.info(`🚀 Запуск пакетной обработки ${urls.length} URL`);
    logger.info(`📊 Опции: Telegram=${options.telegram}, Сохранение=${options.saveToFile}, Параллелизм=${options.maxConcurrent}`);
    
    // Обработка URL
    const results = await batchProcessor.processUrls(urls, {
      sendToTelegram: options.telegram,
      saveToFile: options.saveToFile,
      maxConcurrent: options.maxConcurrent
    });
    
    // Вывод результатов
    if (options.jsonOutput) {
      const jsonResult = batchProcessor.formatResultsAsJson(results);
      console.log(jsonResult);
    } else {
      // Человекочитаемый вывод
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log('\n📊 Результаты обработки:');
      console.log(`✅ Успешно: ${successful.length}`);
      console.log(`❌ Ошибок: ${failed.length}`);
      console.log(`📈 Процент успеха: ${results.length > 0 ? ((successful.length / results.length) * 100).toFixed(1) : 0}%`);
      
      if (successful.length > 0) {
        console.log('\n✅ Успешные результаты:');
        successful.forEach((result, index) => {
          const data = result.data!;
          console.log(`  ${index + 1}. ${result.url}`);
          console.log(`     💰 Текущая цена: ${data.currentPrice}`);
          console.log(`     📈 Цена листинга: ${data.listingPrice}`);
          console.log(`     💵 Собрано: ${data.raised}`);
          console.log(`     ⏱️ Время: ${result.processingTime}мс`);
          console.log('');
        });
      }
      
      if (failed.length > 0) {
        console.log('\n❌ Ошибки:');
        failed.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.url}: ${result.error}`);
        });
      }
    }
    
    logger.info('✅ Пакетная обработка завершена');
    
  } catch (error) {
    logger.error('❌ Ошибка при выполнении скрипта', error as Error);
    console.error(`❌ Ошибка: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
} 