import {ValueObject} from '../base.value-object';

export interface RateLimitConfigProps {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export class RateLimitConfig extends ValueObject<RateLimitConfigProps> {
  constructor(props: RateLimitConfigProps) {
    super(props);
  }

  static create(props: RateLimitConfigProps): RateLimitConfig {
    return new RateLimitConfig(props);
  }

  static default(): RateLimitConfig {
    return new RateLimitConfig({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    });
  }

  get windowMs(): number {
    return this.props.windowMs;
  }

  get maxRequests(): number {
    return this.props.maxRequests;
  }

  get skipSuccessfulRequests(): boolean {
    return this.props.skipSuccessfulRequests || false;
  }

  get skipFailedRequests(): boolean {
    return this.props.skipFailedRequests || false;
  }

  get keyGenerator(): ((req: any) => string) | undefined {
    return this.props.keyGenerator;
  }

  toJSON(): RateLimitConfigProps {
    return this.props;
  }
}
