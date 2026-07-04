import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StructuredLogger } from '../structured-logger';

describe('StructuredLogger level gating', () => {
  const originalLevel = StructuredLogger.getLevel();

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StructuredLogger.setLevel(originalLevel);
  });

  it('defaults to a valid level', () => {
    expect(['debug', 'info', 'warn', 'error']).toContain(StructuredLogger.getLevel());
  });

  it('setLevel updates the shared runtime level', () => {
    StructuredLogger.setLevel('warn');
    expect(StructuredLogger.getLevel()).toBe('warn');
  });

  it('ignores an invalid level', () => {
    StructuredLogger.setLevel('warn');
    StructuredLogger.setLevel('not-a-level');
    expect(StructuredLogger.getLevel()).toBe('warn');
  });

  it('at level "warn", suppresses debug/info but logs warn/error', () => {
    StructuredLogger.setLevel('warn');
    const logger = StructuredLogger.forService('test');

    logger.debug('should not log');
    logger.info('should not log');
    logger.warn('should log');
    logger.error('should log');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('at level "debug", logs everything', () => {
    StructuredLogger.setLevel('debug');
    const logger = StructuredLogger.forService('test');

    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');

    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('at level "error", only logs error', () => {
    StructuredLogger.setLevel('error');
    const logger = StructuredLogger.forService('test');

    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
