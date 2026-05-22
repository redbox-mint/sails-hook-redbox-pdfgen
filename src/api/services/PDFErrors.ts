import { Data } from 'effect';
export class MissingTokenError extends Data.TaggedError('MissingTokenError')<{
  oid: string;
}> {}

export class BrowserError extends Data.TaggedError('BrowserError')<{
  oid: string;
  url: string;
  cause: unknown;
}> {}

export class PDFRenderError extends Data.TaggedError('PDFRenderError')<{
  oid: string;
  cause: unknown;
}> {}

export class DatastreamSaveError extends Data.TaggedError('DatastreamSaveError')<{
  oid: string;
  cause: unknown;
}> {}

export class InvalidReadinessOptionError extends Data.TaggedError('InvalidReadinessOptionError')<{
  oid: string;
  strategy: string;
  option: string;
}> {}

export type PDFError =
  | MissingTokenError
  | BrowserError
  | PDFRenderError
  | DatastreamSaveError
  | InvalidReadinessOptionError;
