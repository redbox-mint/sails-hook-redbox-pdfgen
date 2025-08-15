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


    public static getFieldOrder(): string[] {
        return [
            "token",
            "appUrlOverride",
            "sourceUrlBase",
            "waitForSelector",
            "pdfPrefix",
            "enableChromeLogging"
        ];
    }
}
