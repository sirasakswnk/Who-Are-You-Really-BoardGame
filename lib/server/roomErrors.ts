export class RoomServiceError extends Error {
  constructor(message: string, readonly status: number, readonly retryable = false) { super(message); }
}
