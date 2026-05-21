/**
 * Configuration for PDF Generation (pdfgen)
 * Used to control PDF generation options in the system.
 */
export class PDFGenConfig {
    /**
     * Enable verbose Chrome logging during PDF generation.
     * Set to 'true' to enable logging.
     *
     * @title Enable Chrome Logging
     * 
     * 
     */
    enableChromeLogging: boolean = false;

    /**
     * Override the base application URL for PDF generation.
     * If set, this URL will be used instead of the default appUrl.
     *
     * @title App URL Override
     * @type string
     * @default ""
     */
    appUrlOverride: string = "";

    /**
     * API token for PDF generation. Required for authentication.
     *
     * @title API Token
     * @type string
     * @default ""
     */
    token: string = "";

    /**
     * Base path for the source URL used to generate the PDF.
     *
     * @title Source URL Base
     * 
     * @default "/default/rdmp/record/view"
     */
    sourceUrlBase: string = "/default/rdmp/record/view";

    /**
     * CSS selector to wait for before generating the PDF (page readiness).
     *
     * @title Wait For Selector
     * @type string
     * @default ""
     */
    waitForSelector: string = "";

    /**
     * Prefix for the generated PDF file name.
     *
     * @title PDF Prefix
     * @type string
     * @default "pdf"
     */
    pdfPrefix: string = "pdf";


    /**
     * Strategy to use to determine if the page is ready for PDF generation.
     *
     * @title Readiness Strategy
     * @default "networkIdle"
     */
    readinessStrategy: 'networkIdle' | 'selector' | 'jsFlag' | 'networkIdle+selector' = 'networkIdle';

    /**
     * Timeout in milliseconds to wait for the page to be ready.
     *
     * @title Readiness Timeout
     * @default 60000
     */
    readinessTimeout: number = 60000;

    /**
     * Time in milliseconds to wait for network idle if strategy is networkIdle.
     *
     * @title Network Idle Time
     * @default 2000
     */
    networkIdleTime: number = 2000;

    /**
     * JS function to evaluate to check if the page is ready if strategy is jsFlag.
     *
     * @title Wait For Function
     * @default ""
     */
    waitForFunction: string = "";

    /**
     * Maximum number of retries for PDF generation.
     *
     * @title Max Retries
     * @default 2
     */
    maxRetries: number = 2;

    /**
     * Delay in milliseconds before retrying PDF generation.
     *
     * @title Retry Delay (ms)
     * @default 5000
     */
    retryDelayMs: number = 5000;

    /**
     * Multiplier for retry delay (exponential backoff).
     *
     * @title Retry Backoff Multiplier
     * @default 2
     */
    retryBackoffMultiplier: number = 2;

    /**
     * Puppeteer PDF options.
     *
     * @title PDF Options
     */
    PDFOptions?: any;

    public static getFieldOrder(): string[] {
        return [
            "token",
            "appUrlOverride",
            "sourceUrlBase",
            "readinessStrategy",
            "readinessTimeout",
            "networkIdleTime",
            "waitForSelector",
            "waitForFunction",
            "pdfPrefix",
            "enableChromeLogging",
            "maxRetries",
            "retryDelayMs",
            "retryBackoffMultiplier",
            "PDFOptions"
        ];
    }
}

export const PDFGEN_CONFIG_SCHEMA = {
    type: 'object',
    title: 'PDF Generation Config',
    description: 'Configuration for PDF generation using Puppeteer.',
    properties: {
        token: {
            type: 'string',
            title: 'API Token',
            description: 'API token for PDF generation. Required for authentication.',
            default: ''
        },
        appUrlOverride: {
            type: 'string',
            title: 'App URL Override',
            description: 'Override the base application URL for PDF generation.',
            default: ''
        },
        sourceUrlBase: {
            type: 'string',
            title: 'Source URL Base',
            description: 'Base path for the source URL used to generate the PDF.',
            default: '/default/rdmp/record/view'
        },
        readinessStrategy: {
            type: 'string',
            title: 'Readiness Strategy',
            description: 'Strategy to use to determine if the page is ready for PDF generation.',
            default: 'networkIdle',
            enum: ['networkIdle', 'selector', 'jsFlag', 'networkIdle+selector']
        },
        readinessTimeout: {
            type: 'number',
            title: 'Readiness Timeout',
            description: 'Timeout in milliseconds to wait for the page to be ready.',
            default: 60000
        },
        networkIdleTime: {
            type: 'number',
            title: 'Network Idle Time',
            description: 'Time in milliseconds to wait for network idle if strategy is networkIdle.',
            default: 2000
        },
        waitForSelector: {
            type: 'string',
            title: 'Wait For Selector',
            description: 'CSS selector to wait for before generating the PDF.',
            default: ''
        },
        waitForFunction: {
            type: 'string',
            title: 'Wait For Function',
            description: 'JS function to evaluate if strategy is jsFlag.',
            default: ''
        },
        pdfPrefix: {
            type: 'string',
            title: 'PDF Prefix',
            description: 'Prefix for the generated PDF file name.',
            default: 'pdf'
        },
        enableChromeLogging: {
            type: 'boolean',
            title: 'Enable Chrome Logging',
            description: 'Enable verbose Chrome logging during PDF generation.',
            default: false
        },
        maxRetries: {
            type: 'number',
            title: 'Max Retries',
            description: 'Maximum number of retries for PDF generation.',
            default: 2
        },
        retryDelayMs: {
            type: 'number',
            title: 'Retry Delay (ms)',
            description: 'Delay in milliseconds before retrying PDF generation.',
            default: 5000
        },
        retryBackoffMultiplier: {
            type: 'number',
            title: 'Retry Backoff Multiplier',
            description: 'Multiplier for retry delay (exponential backoff).',
            default: 2
        },
        PDFOptions: {
            type: 'object',
            title: 'PDF Options',
            description: 'Additional Puppeteer PDF options.',
            default: {},
            additionalProperties: true
        }
    }
};

export const PDFGEN_CONFIG_MODEL = {
    key: 'pdfgen',
    modelName: 'PDFGenConfig',
    title: 'PDF Generation Config',
    class: PDFGenConfig,
    schema: PDFGEN_CONFIG_SCHEMA,
    secretFields: ['token']
};
