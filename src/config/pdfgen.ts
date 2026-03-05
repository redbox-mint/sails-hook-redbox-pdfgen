/**
 * PdfGen Config Interface
 * (sails.config.pdfgen)
 *
 * Configuration for PDF generation via Puppeteer.
 */
export type PdfgenReadinessStrategy =
  | 'networkIdle'
  | 'selector'
  | 'jsFlag'
  | 'networkIdle+selector';

export interface PdfgenConfig {
  token: string;
  appUrlOverride: string;
  sourceUrlBase: string;
  pdfPrefix: string;
  readinessStrategy: PdfgenReadinessStrategy;
  readinessTimeout: number;
  networkIdleTime: number;
  waitForSelector: string;
  waitForFunction: string;
  enableChromeLogging: boolean;
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  PDFOptions?: Record<string, any>;
}

export const pdfgen: PdfgenConfig = {
  token: '',
  appUrlOverride: '',
  sourceUrlBase: '/default/rdmp/record/view',
  pdfPrefix: 'pdf',
  readinessStrategy: 'networkIdle',
  readinessTimeout: 60000,
  networkIdleTime: 2000,
  waitForSelector: '',
  waitForFunction: '',
  enableChromeLogging: false,
  maxRetries: 2,
  retryDelayMs: 5000,
  retryBackoffMultiplier: 2,
  PDFOptions: {}
};
