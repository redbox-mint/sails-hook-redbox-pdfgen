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
