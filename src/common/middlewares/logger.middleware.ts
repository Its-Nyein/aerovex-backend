import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization'];

function maskSensitiveData(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = { ...obj };
  for (const key of Object.keys(masked)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      masked[key] = '***REDACTED***';
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key] as Record<string, unknown>);
    }
  }
  return masked;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, query, params } = req;
    const time = Date.now();

    const safeBody = maskSensitiveData(req.body as Record<string, unknown>);

    this.logger.log(
      `Request -> ${method} ${originalUrl} | Params: ${JSON.stringify(params)} | Query: ${JSON.stringify(query)} | Body: ${JSON.stringify(safeBody)}`,
    );

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const duration = Date.now() - time;
      this.logger.log(
        `Response -> ${method} ${originalUrl} | Status: ${statusCode} | Content-Length: ${contentLength ?? 0} | Duration: ${duration}ms`,
      );
    });
    next();
  }
}
