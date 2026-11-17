declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId: string;
        role: 'user' | 'admin';
      };
    }
  }
}

export {};