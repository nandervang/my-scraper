import { useState } from 'react';

// Data types for export
interface JobExecution {
  id: string;
  jobId: string;
  jobName?: string;
  status: 'completed' | 'failed' | 'running' | 'cancelled';
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  itemsScraped?: number;
  errorMessage?: string;
}

interface AnalyticsData {
  trends: {
    dailyExecutions: Array<{
      date: string;
      executions: number;
      successRate: number;
      averageDuration: number;
      itemsScraped: number;
      failures: number;
      errorRate: number;
    }>;
  };
  dateRange: {
    start: string;
    end: string;
  };
  overview: {
    totalExecutions: number;
    successRate: number;
  };
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeFields?: string[];
  filename?: string;
}

export interface ExportData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
  metadata?: Record<string, unknown>;
}

export function useDataExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const generateCSV = (data: ExportData): string => {
    const { headers, rows } = data;
    
    // Escape CSV values properly
    const escapeCSV = (value: string | number | boolean | null): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvHeaders = headers.map(escapeCSV).join(',');
    const csvRows = rows.map(row => 
      row.map(escapeCSV).join(',')
    ).join('\n');

    return `${csvHeaders}\n${csvRows}`;
  };

  const generateJSON = (data: ExportData): string => {
    const { headers, rows, metadata } = data;
    
    const jsonData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: rows.length,
        ...metadata
      },
      headers,
      data: rows.map(row => {
        const obj: Record<string, string | number | boolean | null> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      })
    };

    return JSON.stringify(jsonData, null, 2);
  };

  const downloadFile = (content: string, filename: string, mimeType: string): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  const exportToFile = async (data: ExportData, options: ExportOptions): Promise<void> => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress for large datasets
      setExportProgress(25);

      let content: string;
      let mimeType: string;
      let fileExtension: string;

      switch (options.format) {
        case 'csv':
          content = generateCSV(data);
          mimeType = 'text/csv;charset=utf-8';
          fileExtension = 'csv';
          break;
        case 'json':
          content = generateJSON(data);
          mimeType = 'application/json;charset=utf-8';
          fileExtension = 'json';
          break;
        case 'xlsx':
          // For now, export as CSV with xlsx extension (could be enhanced with a proper XLSX library)
          content = generateCSV(data);
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'csv'; // Would be 'xlsx' with proper library
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      setExportProgress(75);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = options.filename || `export_${timestamp}.${fileExtension}`;

      setExportProgress(90);

      downloadFile(content, filename, mimeType);

      setExportProgress(100);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  // Analytics-specific export function
  const exportAnalyticsData = async (analyticsData: AnalyticsData, options: Partial<ExportOptions> = {}): Promise<void> => {
    const exportOptions: ExportOptions = {
      format: 'csv',
      filename: `analytics_${new Date().toISOString().split('T')[0]}`,
      ...options
    };

    // Transform analytics data into exportable format
    const exportDataForFile: ExportData = {
      headers: [
        'Date', 'Total Executions', 'Success Rate (%)', 'Average Duration (s)', 
        'Total Items Scraped', 'Failed Executions', 'Error Rate (%)'
      ],
      rows: analyticsData.trends.dailyExecutions.map((day) => [
        day.date,
        day.executions,
        day.successRate.toFixed(1),
        day.averageDuration,
        day.itemsScraped,
        day.failures,
        day.errorRate.toFixed(1)
      ]),
      metadata: {
        dateRange: analyticsData.dateRange,
        totalJobs: analyticsData.overview.totalExecutions,
        overallSuccessRate: analyticsData.overview.successRate
      }
    };

    await exportToFile(exportDataForFile, exportOptions);
  };

    // Job executions export function
  const exportJobExecutions = async (jobExecutions: JobExecution[], options: Partial<ExportOptions> = {}): Promise<void> => {
    const exportOptions: ExportOptions = {
      format: 'csv',
      filename: `job_executions_${new Date().toISOString().split('T')[0]}`,
      ...options
    };

    // Transform job executions into exportable format
    const exportDataForFile: ExportData = {
      headers: [
        'Job ID', 'Job Name', 'Status', 'Start Time', 'End Time', 
        'Duration (s)', 'Items Scraped', 'Error Message'
      ],
      rows: jobExecutions.map((execution) => [
        execution.jobId,
        execution.jobName || 'Unknown',
        execution.status,
        execution.startTime,
        execution.endTime || '',
        execution.durationSeconds || 0,
        execution.itemsScraped || 0,
        execution.errorMessage || ''
      ]),
      metadata: {
        totalExecutions: jobExecutions.length,
        successfulExecutions: jobExecutions.filter(ex => ex.status === 'completed').length,
        failedExecutions: jobExecutions.filter(ex => ex.status === 'failed').length
      }
    };

    await exportToFile(exportDataForFile, exportOptions);
  };

  return {
    isExporting,
    exportProgress,
    exportAnalyticsData,
    exportJobExecutions
  };
}