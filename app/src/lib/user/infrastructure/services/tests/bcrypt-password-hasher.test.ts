import {beforeEach, describe, expect, it, vi} from 'vitest';
import {BcryptPasswordHasher} from '../bcrypt-password-hasher';
import {Password} from '../../../domain/value-objects/password.vo';
import bcrypt from 'bcryptjs';

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('BcryptPasswordHasher', () => {
  let passwordHasher: BcryptPasswordHasher;
  let password: Password;

  beforeEach(() => {
    passwordHasher = new BcryptPasswordHasher();
    password = Password.create('StrongPass123!@#');
    vi.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash password using bcrypt with correct parameters', async () => {
      const hashedPassword = '$2a$12$mockedHashedPassword';
      (bcrypt.hash as any).mockResolvedValue(hashedPassword);

      const result = await passwordHasher.hash(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass123!@#', 12);
    });

    it('should use Password object value for hashing', async () => {
      const hashedPassword = '$2a$12$mockedHashedPassword';
      (bcrypt.hash as any).mockResolvedValue(hashedPassword);

      await passwordHasher.hash(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password.getValue(), 12);
    });

    it('should handle bcrypt errors', async () => {
      const error = new Error('Hashing failed');
      (bcrypt.hash as any).mockRejectedValue(error);

      await expect(passwordHasher.hash(password)).rejects.toThrow('Hashing failed');
    });
  });

  describe('verify', () => {
    it('should return true when password matches hash', async () => {
      const hashedPassword = '$2a$12$mockedHashedPassword';
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await passwordHasher.verify(password, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('StrongPass123!@#', hashedPassword);
    });

    it('should return false when password does not match hash', async () => {
      const hashedPassword = '$2a$12$mockedHashedPassword';
      (bcrypt.compare as any).mockResolvedValue(false);

      const result = await passwordHasher.verify(password, hashedPassword);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password.getValue(), hashedPassword);
    });

    it('should handle bcrypt errors during verification', async () => {
      const hashedPassword = '$2a$12$mockedHashedPassword';
      const error = new Error('Verification failed');
      (bcrypt.compare as any).mockRejectedValue(error);

      await expect(passwordHasher.verify(password, hashedPassword)).rejects.toThrow('Verification failed');
    });
  });

  describe('salt rounds configuration', () => {
    it('should use 12 salt rounds for hashing', async () => {
      const hashedPassword = '$2a$12$mockedHashedPassword';
      (bcrypt.hash as any).mockResolvedValue(hashedPassword);

      await passwordHasher.hash(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12);
    });
  });
});
