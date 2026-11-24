// Adds our own property to Express's Request type.
// `requireAuth` sets it, so protected routes know who is calling.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
