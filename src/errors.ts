import { Data } from 'effect';

interface ErrorOptions {
  cause?: unknown;
}

class FetchError extends Data.TaggedError('FetchError') {
  constructor(message: string, opts?: ErrorOptions) {
    super();
    this.message = message;
    this.name = 'FetchError';
    if (opts?.cause) this.cause = opts.cause;
  }
}

class StatusError extends Data.TaggedError('StatusError') {
  constructor(message: string, opts?: ErrorOptions) {
    super();
    this.message = message;
    this.name = 'StatusError';
    if (opts?.cause) this.cause = opts.cause;
  }
}

class CommandLineError extends Data.TaggedError('CommandLineError') {
  constructor(message: string, opts?: ErrorOptions) {
    super();
    this.message = message;
    this.name = 'CommandLineError';
    if (opts?.cause) this.cause = opts.cause;
  }
}

class PromptError extends Data.TaggedError('PromptError') {
  constructor(message: string, opts?: ErrorOptions) {
    super();
    this.message = message;
    this.name = 'PromptError';
    if (opts?.cause) this.cause = opts.cause;
  }
}

class ParametersError extends Data.TaggedError('ParametersError') {
  constructor(message: string, opts?: ErrorOptions) {
    super();
    this.message = message;
    this.name = 'ParametersError';
    if (opts?.cause) this.cause = opts.cause;
  }
}

export {
  FetchError,
  StatusError,
  CommandLineError,
  PromptError,
  ParametersError,
};
