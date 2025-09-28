// TODO: Задача - Сервис для работы с Google Sheets API
// Назначение: Управление данными крипто-проектов в Google Таблицах
// Вход: Конфигурация Google Sheets, данные крипто-проектов
// Выход: Результаты операций с таблицами
// Ошибки: Ошибки авторизации, API ошибки

import { google, sheets_v4 } from 'googleapis';
import fs from 'fs';
import { logger } from '../utils/logger';
import { 
  GoogleSheetsConfig, 
  CryptoProjectData,
  CustomDataResult 
} from '../types';

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets | null = null;
  private auth: any = null; // Используем any для совместимости с googleapis
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  /**
   * Инициализация подключения к Google Sheets API
   */
  async initialize(): Promise<void> {
    try {
      let auth: any;

      // Проверяем способ аутентификации
      if (this.config.credentialsPath) {
        // Используем JSON файл с credentials
        logger.info(`Using JSON credentials file: ${this.config.credentialsPath}`);
        
        if (!fs.existsSync(this.config.credentialsPath)) {
          throw new Error(`Credentials file not found: ${this.config.credentialsPath}`);
        }

        const credentials = JSON.parse(fs.readFileSync(this.config.credentialsPath, 'utf8'));
        
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else if (this.config.clientEmail && this.config.privateKey) {
        // Используем отдельные переменные окружения
        logger.info('Using individual environment variables for credentials');
        
        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: this.config.clientEmail,
            private_key: this.config.privateKey.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else {
        throw new Error('No valid Google Sheets credentials provided');
      }

      // Получаем клиент авторизации
      this.auth = await auth.getClient();

      // Создаем клиент Google Sheets API
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });

      // Проверяем подключение и создаем таблицы если нужно
      await this.ensureSheetsExist();
      
      logger.info('Google Sheets connection initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets connection', error as Error);
      throw error;
    }
  }

  /**
   * Проверяем существование листов и создаем их при необходимости
   */
  private async ensureSheetsExist(): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      // Получаем информацию о таблице
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });

      const existingSheets = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title) || [];

      // Создаем лист для основных данных если не существует
      if (!existingSheets.includes('CryptoProjects')) {
        await this.createProjectsSheet();
      }

      // Создаем лист для дополнительных данных если не существует
      if (!existingSheets.includes('CustomData')) {
        await this.createCustomDataSheet();
      }

      // Создаем лист для истории цен если не существует
      if (!existingSheets.includes('PriceHistory')) {
        await this.createPriceHistorySheet();
      }

      // Создаем лист для конфигурации сайтов если не существует
      if (!existingSheets.includes('SitesConfig')) {
        await this.createSitesConfigSheet();
      }

      logger.info('Google Sheets structure verified');
    } catch (error) {
      logger.error('Failed to ensure sheets exist', error as Error);
      throw error;
    }
  }

  /**
   * Создание листа для основных данных крипто-проектов
   */
  private async createProjectsSheet(): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    const headers = [
      'ID', 'URL', 'Current Price', 'Next Price', 'Listing Price', 
      'Raised', 'Custom Data', 'Created At', 'Updated At', 
      'Manual Overrides', 'Last Manager Edit', 'Last Bot Run'
    ];

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.config.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'CryptoProjects',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: headers.length,
                },
              },
            },
          },
        ],
      },
    });

      // Добавляем заголовки
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: 'CryptoProjects!A1:L1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    logger.info('Created CryptoProjects sheet with headers');
  }

  /**
   * Создание листа для дополнительных данных
   */
  private async createCustomDataSheet(): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    const headers = [
      'ID', 'Project ID', 'Label', 'Data', 'Success', 'Error', 'Created At'
    ];

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.config.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'CustomData',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: headers.length,
                },
              },
            },
          },
        ],
      },
    });

    // Добавляем заголовки
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.config.spreadsheetId,
      range: 'CustomData!A1:G1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    logger.info('Created CustomData sheet with headers');
  }

  /**
   * Создание листа для истории цен
   */
  private async createPriceHistorySheet(): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    const headers = [
      'ID', 'Project ID', 'URL', 'Current Price', 'Raised', 'Created At'
    ];

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.config.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'PriceHistory',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: headers.length,
                },
              },
            },
          },
        ],
      },
    });

    // Добавляем заголовки
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.config.spreadsheetId,
      range: 'PriceHistory!A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    logger.info('Created PriceHistory sheet with headers');
  }

  /**
   * Создание листа для конфигурации сайтов
   */
  private async createSitesConfigSheet(): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    const headers = [
      'ID', 'URL', 'Selector', 'Selectors (JSON)', 'Skip', 'Data Source', 
      'JSON API Config (JSON)', 'Custom Data (JSON)', 'Wallet', 'Notes'
    ];

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.config.spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'SitesConfig',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: headers.length,
                },
              },
            },
          },
        ],
      },
    });

    // Добавляем заголовки
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.config.spreadsheetId,
      range: 'SitesConfig!A1:J1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    });

    logger.info('Created SitesConfig sheet with headers');
  }

  /**
   * Сохранение данных крипто-проекта с учетом ручных правок менеджера
   */
  async saveCryptoProject(data: CryptoProjectData): Promise<number> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const customDataJson = data.customData ? JSON.stringify(data.customData) : '';
      const timestamp = new Date().toISOString();

      // Получаем существующие данные для сравнения
      const existingProject = await this.getProjectByUrl(data.url);
      let projectId: number;

      if (existingProject) {
        // Применяем умное слияние данных с приоритетом ручных правок
        const mergedData = this.mergeWithManagerOverrides(data, existingProject);
        
        // Обновляем существующий проект
        projectId = existingProject.id;
        await this.updateProjectWithOverrides(
          existingProject.rowIndex, 
          mergedData, 
          customDataJson, 
          timestamp,
          existingProject.manualOverrides,
          existingProject.lastManagerEdit
        );

        // Сохраняем историю только если данные действительно изменились
        await this.savePriceHistory(projectId, mergedData, existingProject.data);
      } else {
        // Создаем новый проект
        projectId = await this.createNewProject(data, customDataJson, timestamp);
        
        // Сохраняем первую запись в историю
        await this.savePriceHistory(projectId, data, null);
      }

      // Сохраняем дополнительные данные
      if (data.customData && data.customData.length > 0) {
        await this.saveCustomData(projectId, data.customData);
      }

      logger.info(`Crypto project saved successfully: ${data.url} (ID: ${projectId})`);
      return projectId;
    } catch (error) {
      logger.error(`Failed to save crypto project: ${data.url}`, error as Error);
      throw error;
    }
  }

  /**
   * Получение проекта по URL с информацией о ручных правках
   */
  private async getProjectByUrl(url: string): Promise<{ 
    id: number; 
    rowIndex: number; 
    data: CryptoProjectData;
    manualOverrides?: any;
    lastManagerEdit?: string;
  } | null> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'CryptoProjects!A:L', // Расширили до колонки L
      });

      const rows = response.data.values || [];
      
      for (let i = 1; i < rows.length; i++) { // Пропускаем заголовок
        const row = rows[i];
        if (row && row[1] === url) { // URL в колонке B (индекс 1)
          let manualOverrides = null;
          try {
            manualOverrides = row[9] ? JSON.parse(row[9]) : null; // Manual Overrides в колонке J (индекс 9)
          } catch (error) {
            logger.warn(`Failed to parse manual overrides for ${url}: ${row[9]}`);
          }

          return {
            id: parseInt(row[0] || '0'),
            rowIndex: i + 1, // +1 для правильной индексации в Google Sheets
            data: {
              url: row[1] || '',
              currentPrice: row[2] || '',
              nextPrice: row[3] || '',
              listingPrice: row[4] || '',
              raised: row[5] || '',
              timestamp: new Date(row[7] || Date.now()),
              customData: row[6] ? JSON.parse(row[6]) : undefined,
            },
            manualOverrides,
            lastManagerEdit: row[10] || undefined // Last Manager Edit в колонке K (индекс 10)
          };
        }
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get project by URL: ${url}`, error as Error);
      throw error;
    }
  }

  /**
   * Умное слияние данных с приоритетом ручных правок менеджера
   */
  private mergeWithManagerOverrides(
    newData: CryptoProjectData, 
    existingProject: { data: CryptoProjectData; manualOverrides?: any }
  ): CryptoProjectData {
    const merged = { ...newData };
    const overrides = existingProject.manualOverrides || {};

    // Проверяем каждое поле на наличие ручных правок
    const fields = ['currentPrice', 'nextPrice', 'listingPrice', 'raised'];
    
    for (const field of fields) {
      if (overrides[field]) {
        // Если менеджер задал значение вручную
        const manualValue = existingProject.data[field as keyof CryptoProjectData] as string;
        
        // Если из источника пришли данные (не N/A), обновляем
        const newValue = newData[field as keyof CryptoProjectData];
        if (typeof newValue === 'string' && newValue && newValue !== 'N/A' && newValue !== '') {
          (merged as any)[field] = newValue;
          logger.info(`Updated ${field} from source: ${manualValue} -> ${newValue} for ${newData.url}`);
        } else {
          // Если из источника данные не пришли, оставляем ручное значение
          (merged as any)[field] = manualValue;
          logger.debug(`Keeping manual override for ${field}: ${manualValue} for ${newData.url}`);
        }
      }
    }

    return merged;
  }

  /**
   * Обновление существующего проекта с учетом ручных правок
   */
  private async updateProjectWithOverrides(
    rowIndex: number, 
    data: CryptoProjectData, 
    customDataJson: string, 
    timestamp: string,
    existingOverrides?: any,
    lastManagerEdit?: string
  ): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    const values = [
      [
        data.url,                                                    // B
        data.currentPrice,                                           // C
        data.nextPrice,                                              // D
        data.listingPrice,                                           // E
        data.raised,                                                 // F
        customDataJson,                                              // G
        '', // Created At остается прежним                          // H
        timestamp, // Updated At                                     // I
        existingOverrides ? JSON.stringify(existingOverrides) : '', // J - Manual Overrides
        lastManagerEdit || '',                                       // K - Last Manager Edit
        timestamp // Last Bot Run                                    // L
      ]
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.config.spreadsheetId,
      range: `CryptoProjects!B${rowIndex}:L${rowIndex}`, // Обновляем B-L (11 колонок)
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }


  /**
   * Создание нового проекта
   */
  private async createNewProject(data: CryptoProjectData, customDataJson: string, timestamp: string): Promise<number> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    // Получаем следующий ID
    const nextId = await this.getNextProjectId();

    const values = [
      [
        nextId,                  // A - ID
        data.url,                // B - URL
        data.currentPrice,       // C - Current Price
        data.nextPrice,          // D - Next Price
        data.listingPrice,       // E - Listing Price
        data.raised,             // F - Raised
        customDataJson,          // G - Custom Data
        timestamp,               // H - Created At
        timestamp,               // I - Updated At
        '',                      // J - Manual Overrides (пустое для нового проекта)
        '',                      // K - Last Manager Edit (пустое для нового проекта)
        timestamp                // L - Last Bot Run
      ]
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.config.spreadsheetId,
      range: 'CryptoProjects!A:L', // Колонки A-L (12 колонок)
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return nextId;
  }

  /**
   * Получение следующего ID для проекта
   */
  private async getNextProjectId(): Promise<number> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'CryptoProjects!A:A',
      });

      const rows = response.data.values || [];
      let maxId = 0;

      for (let i = 1; i < rows.length; i++) { // Пропускаем заголовок
        const id = parseInt(rows[i]?.[0] || '0');
        if (id > maxId) {
          maxId = id;
        }
      }

      return maxId + 1;
    } catch (error) {
      logger.error('Failed to get next project ID', error as Error);
      return 1; // Начинаем с 1 если ошибка
    }
  }

  /**
   * Сохранение истории изменений цен
   */
  private async savePriceHistory(
    projectId: number, 
    newData: CryptoProjectData, 
    existingData: CryptoProjectData | null
  ): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      // Если это новый проект, сохраняем первую запись
      if (!existingData) {
        await this.addPriceHistoryRecord(projectId, newData);
        logger.debug(`Initial price history saved for project ID: ${projectId}`);
        return;
      }

      // Проверяем, изменились ли данные (только currentPrice и raised)
      const hasChanges = 
        existingData.currentPrice !== newData.currentPrice ||
        existingData.raised !== newData.raised;

      // Сохраняем в историю только если есть изменения
      if (hasChanges) {
        await this.addPriceHistoryRecord(projectId, newData);
        logger.info(`Price history updated for project ID: ${projectId}`);
      } else {
        logger.debug(`No price changes detected for project ID: ${projectId}`);
      }
    } catch (error) {
      logger.error(`Failed to save price history for project ID: ${projectId}`, error as Error);
      // Не прерываем основной процесс сохранения при ошибке истории
    }
  }

  /**
   * Добавление записи в историю цен
   */
  private async addPriceHistoryRecord(projectId: number, data: CryptoProjectData): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    const nextId = await this.getNextHistoryId();
    const timestamp = new Date().toISOString();

    const values = [
      [
        nextId,
        projectId,
        data.url,
        data.currentPrice,
        data.raised,
        timestamp
      ]
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.config.spreadsheetId,
      range: 'PriceHistory!A:F',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  /**
   * Получение следующего ID для истории
   */
  private async getNextHistoryId(): Promise<number> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'PriceHistory!A:A',
      });

      const rows = response.data.values || [];
      let maxId = 0;

      for (let i = 1; i < rows.length; i++) { // Пропускаем заголовок
        const id = parseInt(rows[i]?.[0] || '0');
        if (id > maxId) {
          maxId = id;
        }
      }

      return maxId + 1;
    } catch (error) {
      logger.error('Failed to get next history ID', error as Error);
      return 1;
    }
  }

  /**
   * Сохранение дополнительных данных
   */
  private async saveCustomData(projectId: number, customData: CustomDataResult[]): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      // Удаляем старые данные для этого проекта
      await this.deleteCustomDataForProject(projectId);

      // Добавляем новые данные
      const values = [];
      const timestamp = new Date().toISOString();

      for (const data of customData) {
        const nextId = await this.getNextCustomDataId();
        values.push([
          nextId,
          projectId,
          data.label,
          data.data,
          data.success,
          data.error || '',
          timestamp
        ]);
      }

      if (values.length > 0) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.config.spreadsheetId,
          range: 'CustomData!A:G',
          valueInputOption: 'RAW',
          requestBody: { values },
        });
      }

      logger.debug(`Custom data saved for project ID: ${projectId}`);
    } catch (error) {
      logger.error(`Failed to save custom data for project ID: ${projectId}`, error as Error);
      throw error;
    }
  }

  /**
   * Удаление дополнительных данных для проекта
   */
  private async deleteCustomDataForProject(projectId: number): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'CustomData!A:G',
      });

      const rows = response.data.values || [];
      const rowsToDelete = [];

      // Находим строки для удаления
      for (let i = 1; i < rows.length; i++) { // Пропускаем заголовок
        const row = rows[i];
        if (row && parseInt(row[1] || '0') === projectId) {
          rowsToDelete.push(i);
        }
      }

      // Удаляем строки (в обратном порядке, чтобы индексы не сбились)
      for (const rowIndex of rowsToDelete.reverse()) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.config.spreadsheetId,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: await this.getSheetId('CustomData'),
                    dimension: 'ROWS',
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1,
                  },
                },
              },
            ],
          },
        });
      }
    } catch (error) {
      logger.error(`Failed to delete custom data for project ID: ${projectId}`, error as Error);
      // Не прерываем процесс, если не удалось удалить старые данные
    }
  }

  /**
   * Получение ID листа по названию
   */
  private async getSheetId(sheetName: string): Promise<number> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    const spreadsheet = await this.sheets.spreadsheets.get({
      spreadsheetId: this.config.spreadsheetId,
    });

    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    return sheet?.properties?.sheetId || 0;
  }

  /**
   * Получение следующего ID для дополнительных данных
   */
  private async getNextCustomDataId(): Promise<number> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'CustomData!A:A',
      });

      const rows = response.data.values || [];
      let maxId = 0;

      for (let i = 1; i < rows.length; i++) { // Пропускаем заголовок
        const id = parseInt(rows[i]?.[0] || '0');
        if (id > maxId) {
          maxId = id;
        }
      }

      return maxId + 1;
    } catch (error) {
      logger.error('Failed to get next custom data ID', error as Error);
      return 1;
    }
  }

  /**
   * Простое добавление данных в конец таблицы (как в документации)
   */
  async appendData(sheetName: string, values: any[][]): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: `${sheetName}!A:Z`, // Автоматически найдет следующую пустую строку
        valueInputOption: 'RAW',
        requestBody: { values },
      });

      logger.debug(`Data appended to ${sheetName} sheet`);
    } catch (error) {
      logger.error(`Failed to append data to ${sheetName}`, error as Error);
      throw error;
    }
  }

  /**
   * Получение всех данных из листа
   */
  async getData(sheetName: string, range?: string): Promise<any[][]> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: range || `${sheetName}!A:Z`,
      });

      return response.data.values || [];
    } catch (error) {
      logger.error(`Failed to get data from ${sheetName}`, error as Error);
      throw error;
    }
  }

  /**
   * Очистка листа
   */
  async clearSheet(sheetName: string): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.config.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });

      logger.info(`Sheet ${sheetName} cleared`);
    } catch (error) {
      logger.error(`Failed to clear ${sheetName}`, error as Error);
      throw error;
    }
  }

  /**
   * Загрузка конфигурации сайтов из Google Sheets
   */
  async loadSitesConfig(): Promise<any[]> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'SitesConfig!A2:J1000', // Пропускаем заголовки
      });

      const rows = response.data.values || [];
      const sitesConfig = [];

      for (const row of rows) {
        // Пропускаем пустые строки
        if (!row[1]) continue; // URL обязателен

        const config: any = {
          url: row[1] || '',
        };

        // Добавляем selector если есть
        if (row[2]) config.selector = row[2];

        // Парсим selectors из JSON если есть
        if (row[3]) {
          try {
            config.selectors = JSON.parse(row[3]);
          } catch (error) {
            logger.warn(`Failed to parse selectors for ${config.url}: ${row[3]}`);
          }
        }

        // Добавляем skip флаг
        if (row[4] && (row[4].toLowerCase() === 'true' || row[4] === '1')) {
          config.skip = true;
        }

        // Добавляем dataSource
        if (row[5]) config.dataSource = row[5];

        // Парсим JSON API config если есть
        if (row[6]) {
          try {
            config.jsonApi = JSON.parse(row[6]);
          } catch (error) {
            logger.warn(`Failed to parse JSON API config for ${config.url}: ${row[6]}`);
          }
        }

        // Парсим customData если есть
        if (row[7]) {
          try {
            config.customData = JSON.parse(row[7]);
          } catch (error) {
            logger.warn(`Failed to parse custom data for ${config.url}: ${row[7]}`);
          }
        }

        // Добавляем wallet флаг
        if (row[8] && (row[8].toLowerCase() === 'true' || row[8] === '1')) {
          config.wallet = true;
        }

        sitesConfig.push(config);
      }

      logger.info(`Loaded ${sitesConfig.length} sites from Google Sheets config`);
      return sitesConfig;
    } catch (error) {
      logger.error('Failed to load sites config from Google Sheets', error as Error);
      throw error;
    }
  }

  /**
   * Сохранение конфигурации сайтов в Google Sheets
   */
  async saveSitesConfig(sitesConfig: any[]): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      // Очищаем существующие данные (кроме заголовков)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.config.spreadsheetId,
        range: 'SitesConfig!A2:J1000',
      });

      // Подготавливаем данные для записи
      const values = sitesConfig.map((config, index) => [
        index + 1, // ID
        config.url || '',
        config.selector || '',
        config.selectors ? JSON.stringify(config.selectors) : '',
        config.skip ? 'TRUE' : 'FALSE',
        config.dataSource || '',
        config.jsonApi ? JSON.stringify(config.jsonApi) : '',
        config.customData ? JSON.stringify(config.customData) : '',
        config.wallet ? 'TRUE' : 'FALSE',
        '' // Notes - пустое поле для заметок менеджера
      ]);

      if (values.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.config.spreadsheetId,
          range: `SitesConfig!A2:J${values.length + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values },
        });
      }

      logger.info(`Saved ${sitesConfig.length} sites to Google Sheets config`);
    } catch (error) {
      logger.error('Failed to save sites config to Google Sheets', error as Error);
      throw error;
    }
  }

  /**
   * Обнаружение ручных правок менеджера в CryptoProjects листе
   */
  async detectManagerOverrides(): Promise<void> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'CryptoProjects!A:L',
      });

      const rows = response.data.values || [];
      
      for (let i = 1; i < rows.length; i++) { // Пропускаем заголовок
        const row = rows[i];
        if (!row || !row[1]) continue; // Пропускаем пустые строки

        const url = row[1];
        const currentData = {
          currentPrice: row[2] || '',
          nextPrice: row[3] || '',
          listingPrice: row[4] || '',
          raised: row[5] || '',
        };

        // Загружаем последние данные из истории для сравнения
        const lastHistoryData = await this.getLastHistoryRecord(parseInt(row[0] || '0'));
        
        if (lastHistoryData) {
          const overrides: any = {};
          let hasOverrides = false;

          // Проверяем каждое поле на изменения
          if (currentData.currentPrice !== lastHistoryData.currentPrice && 
              currentData.currentPrice !== '' && currentData.currentPrice !== 'N/A') {
            overrides.currentPrice = true;
            hasOverrides = true;
          }
          
          if (currentData.nextPrice !== lastHistoryData.nextPrice && 
              currentData.nextPrice !== '' && currentData.nextPrice !== 'N/A') {
            overrides.nextPrice = true;
            hasOverrides = true;
          }
          
          if (currentData.listingPrice !== lastHistoryData.listingPrice && 
              currentData.listingPrice !== '' && currentData.listingPrice !== 'N/A') {
            overrides.listingPrice = true;
            hasOverrides = true;
          }
          
          if (currentData.raised !== lastHistoryData.raised && 
              currentData.raised !== '' && currentData.raised !== 'N/A') {
            overrides.raised = true;
            hasOverrides = true;
          }

          // Если обнаружены ручные правки, обновляем метаданные
          if (hasOverrides) {
            const timestamp = new Date().toISOString();
            
            await this.sheets.spreadsheets.values.update({
              spreadsheetId: this.config.spreadsheetId,
              range: `CryptoProjects!J${i + 1}:K${i + 1}`, // Manual Overrides и Last Manager Edit
              valueInputOption: 'RAW',
              requestBody: {
                values: [[JSON.stringify(overrides), timestamp]]
              },
            });

            logger.info(`Detected manual overrides for ${url}: ${Object.keys(overrides).join(', ')}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to detect manager overrides', error as Error);
    }
  }

  /**
   * Получение последней записи из истории для проекта
   */
  private async getLastHistoryRecord(projectId: number): Promise<any> {
    if (!this.sheets) {
      throw new Error('Google Sheets client not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: 'PriceHistory!A:F',
      });

      const rows = response.data.values || [];
      let lastRecord = null;

      // Ищем последнюю запись для данного проекта
      for (let i = rows.length - 1; i >= 1; i--) { // Идем с конца, пропускаем заголовок
        const row = rows[i];
        if (row && parseInt(row[1] || '0') === projectId) {
          lastRecord = {
            currentPrice: row[3] || '',
            raised: row[4] || '',
            // Для совместимости добавляем пустые значения
            nextPrice: '',
            listingPrice: ''
          };
          break;
        }
      }

      return lastRecord;
    } catch (error) {
      logger.error(`Failed to get last history record for project ${projectId}`, error as Error);
      return null;
    }
  }

  /**
   * Закрытие подключения (очистка ресурсов)
   */
  async close(): Promise<void> {
    try {
      this.sheets = null;
      this.auth = null;
      logger.info('Google Sheets connection closed');
    } catch (error) {
      logger.error('Error closing Google Sheets connection', error as Error);
    }
  }
}
