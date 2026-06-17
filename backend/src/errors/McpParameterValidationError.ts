export class McpParameterValidationError extends Error {
  readonly statusCode = 422;

  constructor(message: string) {
    super(message);
    this.name = 'McpParameterValidationError';
  }
}
