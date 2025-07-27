import {SSHCredentials} from '../ssh-credentials.vo';

describe('SSHCredentials Value Object', () => {
  it('should create valid SSH credentials with username and password', () => {
    const username = 'admin';
    const password = 'password123';
    const credentials = SSHCredentials.create(username, password);
    
    expect(credentials).toBeDefined();
    expect(credentials.username).toBe(username);
    expect(credentials.password).toBe(password);
    expect(credentials.privateKey).toBeUndefined();
    expect(credentials.passphrase).toBeUndefined();
  });

  it('should create valid SSH credentials with username and private key', () => {
    const username = 'admin';
    const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890\n-----END RSA PRIVATE KEY-----';
    const credentials = SSHCredentials.createWithKey(username, privateKey);
    
    expect(credentials).toBeDefined();
    expect(credentials.username).toBe(username);
    expect(credentials.privateKey).toBe(privateKey);
    expect(credentials.password).toBe('');
    expect(credentials.passphrase).toBeUndefined();
  });

  it('should create valid SSH credentials with username, private key, and passphrase', () => {
    const username = 'admin';
    const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890\n-----END RSA PRIVATE KEY-----';
    const passphrase = 'keypassword';
    const credentials = SSHCredentials.createWithKey(username, privateKey, passphrase);
    
    expect(credentials).toBeDefined();
    expect(credentials.username).toBe(username);
    expect(credentials.privateKey).toBe(privateKey);
    expect(credentials.passphrase).toBe(passphrase);
    expect(credentials.password).toBe('');
  });

  it('should throw an error when creating with an empty username', () => {
    expect(() => {
      SSHCredentials.create('', 'password123');
    }).toThrow('SSH username cannot be empty');
  });

  it('should throw an error when creating with no password or private key', () => {
    expect(() => {
      SSHCredentials.create('admin', '');
    }).toThrow('Either SSH password or private key must be provided');
  });

  it('should throw an error when creating with an empty passphrase', () => {
    const username = 'admin';
    const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890\n-----END RSA PRIVATE KEY-----';
    
    expect(() => {
      SSHCredentials.createWithKey(username, privateKey, '');
    }).toThrow('SSH key passphrase cannot be empty if specified');
  });

  it('should compare two SSHCredentials correctly', () => {
    const cred1 = SSHCredentials.create('admin', 'password123');
    const cred2 = SSHCredentials.create('admin', 'password123');
    const cred3 = SSHCredentials.create('admin', 'differentpassword');
    
    expect(cred1.equals(cred2)).toBe(true);
    expect(cred1.equals(cred3)).toBe(false);
  });

  it('should identify password-based authentication correctly', () => {
    const passwordCred = SSHCredentials.create('admin', 'password123');
    const keyCred = SSHCredentials.createWithKey('admin', 'some-key-data');
    
    expect(passwordCred.isPasswordBased()).toBe(true);
    expect(keyCred.isPasswordBased()).toBe(false);
  });

  it('should identify key-based authentication correctly', () => {
    const passwordCred = SSHCredentials.create('admin', 'password123');
    const keyCred = SSHCredentials.createWithKey('admin', 'some-key-data');
    
    expect(passwordCred.isKeyBased()).toBe(false);
    expect(keyCred.isKeyBased()).toBe(true);
  });

  it('should mask sensitive information correctly', () => {
    const passwordCred = SSHCredentials.create('admin', 'password123');
    const keyCred = SSHCredentials.createWithKey('admin', 'some-key-data');
    
    const maskedPassword = passwordCred.toMasked();
    expect(maskedPassword.username).toBe('admin');
    expect(maskedPassword.password).toBe('********');
    expect(maskedPassword.hasKey).toBe(false);
    
    const maskedKey = keyCred.toMasked();
    expect(maskedKey.username).toBe('admin');
    expect(maskedKey.password).toBeUndefined();
    expect(maskedKey.hasKey).toBe(true);
  });

  it('should handle usernames with special characters', () => {
    const username = 'admin.user-123';
    const credentials = SSHCredentials.create(username, 'password123');
    
    expect(credentials.username).toBe(username);
  });

  it('should handle complex passwords', () => {
    const password = 'P@$$w0rd!123';
    const credentials = SSHCredentials.create('admin', password);
    
    expect(credentials.password).toBe(password);
  });
});