import { Data } from 'effect';

export class MissingServiceError extends Data.TaggedError('MissingServiceError')<{
  oid: string;
  service: string;
}> {}

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

export type PDFError =
  | MissingServiceError
  | MissingTokenError
  | BrowserError
  | PDFRenderError
  | DatastreamSaveError;
