// An error we throw on purpose (wrong input, not found, forbidden...).
// `code` is a stable machine-readable string that the frontend translates (FR-82).
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}
