// app/src/lib/shared/infrastructure/middleware/cors.middleware.ts
import {NextFunction, Request, Response} from 'express';
import {TenantContext} from '../../domain/tenant-context';
import {StructuredLogger} from '../logging/structured-logger';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      corsOrigin?: string;
    }
  }
}

export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
}

export class CorsMiddleware {
  private readonly options: CorsOptions;

  constructor(
    private readonly logger: StructuredLogger,
    options: CorsOptions = {}
  ) {
    this.options = {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'X-CSRF-Token',
        'X-Tenant-Id',
        'X-User-Id',
        'X-API-Key'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
      maxAge: 86400, // 24 hours
      ...options
    };
  }

  handle = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get('Origin');
    const method = req.method;
    const requestedHeaders = req.get('Access-Control-Request-Headers');

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      this.handlePreflight(req, res, next);
      return;
    }

    // Validate origin
    if (origin && !this.isAllowedOrigin(origin)) {
      this.logger.warn('CORS origin not allowed', {
        origin,
        method,
        path: req.path,
        ip: this.getClientIp(req),
        userAgent: req.get('User-Agent')
      });

      if (this.options.origin !== '*') {
        res.status(403).json({
          error: 'CORS origin not allowed',
          origin,
          allowed: Array.isArray(this.options.origin) ? this.options.origin : 'configured origins'
        });
        return;
      }
    }

    // Set CORS headers for simple requests
    this.setCorsHeaders(req, res);
    
    // Log CORS access
    this.logger.debug('CORS access granted', {
      origin: origin || 'direct',
      method,
      path: req.path,
      ip: this.getClientIp(req),
      tenantId: req.tenantContext?.getTenantId(),
      userId: req.tenantContext?.getUserId()?.getValue()
    });

    next();
  };

  private handlePreflight(req: Request, res: Response, next: NextFunction): void {
    const origin = req.get('Origin');
    const method = req.get('Access-Control-Request-Method');
    const headers = req.get('Access-Control-Request-Headers');

    // Validate preflight origin
    if (origin && !this.isAllowedOrigin(origin)) {
      this.logger.warn('CORS preflight origin not allowed', {
        origin,
        method,
        requestedHeaders: headers,
        ip: this.getClientIp(req)
      });
      
      res.status(403).json({
        error: 'CORS preflight origin not allowed'
      });
      return;
    }

    // Validate preflight method
    if (method && !this.isAllowedMethod(method)) {
      this.logger.warn('CORS preflight method not allowed', {
        origin,
        method,
        allowedMethods: this.options.methods,
        ip: this.getClientIp(req)
      });
      
      res.status(405).json({
        error: 'Method not allowed',
        method,
        allowed: this.options.methods
      });
      return;
    }

    // Validate preflight headers
    if (headers) {
      const requestedHeaders = headers.split(',').map(h => h.trim().toLowerCase());
      const allowedHeaders = this.options.allowedHeaders || [];
      
      const invalidHeaders = requestedHeaders.filter(h => !allowedHeaders.includes(h));
      
      if (invalidHeaders.length > 0) {
        this.logger.warn('CORS preflight headers not allowed', {
          origin,
          method,
          invalidHeaders,
          allowedHeaders: allowedHeaders.slice(0, 10), // Limit logged headers
          ip: this.getClientIp(req)
        });
      }
    }

    // Set preflight response headers
    res.header('Access-Control-Allow-Origin', this.getCorsOrigin(req));
    res.header('Access-Control-Allow-Methods', this.options.methods?.join(',') || '');
    res.header('Access-Control-Allow-Headers', this.options.allowedHeaders?.join(',') || '');
    res.header('Access-Control-Max-Age', this.options.maxAge?.toString() || '86400');
    res.header('Access-Control-Allow-Credentials', this.options.credentials ? 'true' : 'false');

    // Log preflight request
    this.logger.debug('CORS preflight handled', {
      origin: origin || 'unknown',
      method: method || 'unknown',
      requestedHeaders: headers || 'none',
      ip: this.getClientIp(req),
      responseTime: Date.now()
    });

    // Respond immediately for preflight
    res.status(204).end();
  }

  private setCorsHeaders(req: Request, res: Response): void {
    const origin = this.getCorsOrigin(req);
    
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', this.options.credentials ? 'true' : 'false');
    
    if (this.options.exposedHeaders) {
      res.header('Access-Control-Expose-Headers', this.options.exposedHeaders.join(','));
    }
  }

  private getCorsOrigin(req: Request): string {
    const origin = req.get('Origin') || req.get('Referer') || '';
    const allowedOrigin = this.isAllowedOrigin(origin) ? origin : '*';
    
    req.corsOrigin = allowedOrigin;
    return allowedOrigin;
  }

  private isAllowedOrigin(origin: string): boolean {
    if (!origin) return true;

    // Handle function-based origin validation first
    if (typeof this.options.origin === 'function') {
      return this.options.origin(origin);
    }
    
    const allowedOrigins: string[] = Array.isArray(this.options.origin) 
      ? this.options.origin 
      : typeof this.options.origin === 'string' ? [this.options.origin] : ['*'];

    // Handle wildcard
    if (allowedOrigins.includes('*')) {
      return true;
    }

    // Handle array of origins
    return allowedOrigins.some(allowed => {
      if (allowed === '*') return true;
      
      // Exact match
      if (allowed === origin) return true;
      
      // Subdomain matching (e.g., *.example.com)
      if (allowed.startsWith('*.') && origin.endsWith(allowed.slice(1))) {
        const allowedDomain = allowed.slice(2); // Remove *.
        const originDomain = origin.split('.').slice(-2).join('.');
        return originDomain === allowedDomain;
      }
      
      return false;
    });
  }

  private isAllowedMethod(method: string): boolean {
    const methods = this.options.methods || ['GET', 'POST', 'PUT', 'DELETE'];
    return methods.includes(method.toUpperCase());
  }

  private getClientIp(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection as any).socket.remoteAddress ||
           'unknown';
  }

  // Get CORS configuration for current request
  getCurrentCorsConfig(req: Request): CorsOptions {
    return {
      origin: req.corsOrigin,
      credentials: this.options.credentials,
      methods: this.options.methods,
      allowedHeaders: this.options.allowedHeaders,
      exposedHeaders: this.options.exposedHeaders,
      maxAge: this.options.maxAge
    };
  }

  // Update CORS configuration dynamically
  updateOptions(newOptions: Partial<CorsOptions>): void {
    this.options.origin = newOptions.origin || this.options.origin;
    this.options.credentials = newOptions.credentials ?? this.options.credentials;
    this.options.methods = newOptions.methods || this.options.methods;
    this.options.allowedHeaders = newOptions.allowedHeaders || this.options.allowedHeaders;
    this.options.exposedHeaders = newOptions.exposedHeaders || this.options.exposedHeaders;
    this.options.maxAge = newOptions.maxAge ?? this.options.maxAge;

    this.logger.info('CORS configuration updated', {
      origin: Array.isArray(this.options.origin) ? 
        `${this.options.origin.length} origins` : this.options.origin,
      methods: this.options.methods?.length,
      allowedHeaders: this.options.allowedHeaders?.length
    });
  }
}

// Factory function for creating CORS middleware
export function createCorsMiddleware(
  logger: StructuredLogger,
  options?: CorsOptions
): (req: Request, res: Response, next: NextFunction) => void {
  const middleware = new CorsMiddleware(logger, options);
  return middleware.handle.bind(middleware);
}

// Environment-based configuration
export function getDefaultCorsOptions(): CorsOptions {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || 
                        (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000']);
  
  return {
    origin: (allowedOrigins.length > 0 ? allowedOrigins : '*') as any,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-CSRF-Token',
      'X-Tenant-Id',
      'X-User-Id',
      'X-API-Key',
      'X-Forwarded-For'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining', 'X-Tenant-Id'],
    maxAge: process.env.NODE_ENV === 'production' ? 86400 : 600
  };
}