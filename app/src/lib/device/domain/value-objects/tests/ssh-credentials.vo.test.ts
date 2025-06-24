import { describe, it, expect } from 'vitest';
import { SshCredentials, SshCredentialsProps } from '../ssh-credentials.vo';

describe('SshCredentials Value Object', () => {
  it('should create SshCredentials with password', () => {
    const props: SshCredentialsProps = {
      username: 'user',
      password: 'pass',
      port: 22
    };
    const credentials = SshCredentials.create(props);
    
    expect(credentials.username).toBe(props.username);
    expect(credentials.password).toBe(props.password);
    expect(credentials.privateKey).toBeUndefined();
    expect(credentials.port).toBe(props.port);
    expect(credentials.hasPassword()).toBe(true);
    expect(credentials.hasPrivateKey()).toBe(false);
  });

  it('should create SshCredentials with private key', () => {
    const props: SshCredentialsProps = {
      username: 'user',
      privateKey: 'ssh-rsa AAAAB3NzaC1yc2E...',
      port: 22
    };
    const credentials = SshCredentials.create(props);
    
    expect(credentials.username).toBe(props.username);
    expect(credentials.password).toBeUndefined();
    expect(credentials.privateKey).toBe(props.privateKey);
    expect(credentials.port).toBe(props.port);
    expect(credentials.hasPassword()).toBe(false);
    expect(credentials.hasPrivateKey()).toBe(true);
  });

  it('should create SshCredentials with both password and private key', () => {
    const props: SshCredentialsProps = {
      username: 'user',
      password: 'pass',
      privateKey: 'ssh-rsa AAAAB3NzaC1yc2E...',
      port: 22
    };
    const credentials = SshCredentials.create(props);
    
    expect(credentials.username).toBe(props.username);
    expect(credentials.password).toBe(props.password);
    expect(credentials.privateKey).toBe(props.privateKey);
    expect(credentials.port).toBe(props.port);
    expect(credentials.hasPassword()).toBe(true);
    expect(credentials.hasPrivateKey()).toBe(true);
  });

  it('should create SshCredentials with non-standard port', () => {
    const props: SshCredentialsProps = {
      username: 'user',
      password: 'pass',
      port: 2222
    };
    const credentials = SshCredentials.create(props);
    
    expect(credentials.port).toBe(2222);
  });

  it('should throw an error when username is empty', () => {
    const props: SshCredentialsProps = {
      username: '',
      password: 'pass',
      port: 22
    };
    
    expect(() => SshCredentials.create(props)).toThrow('SSH username cannot be empty');
  });

  it('should throw an error when both password and private key are missing', () => {
    const props: SshCredentialsProps = {
      username: 'user',
      port: 22
    };
    
    expect(() => SshCredentials.create(props)).toThrow('Either password or private key must be provided');
  });

  it('should throw an error when port is invalid', () => {
    // Port too low
    expect(() => SshCredentials.create({
      username: 'user',
      password: 'pass',
      port: 0
    })).toThrow('SSH port must be between 1 and 65535');

    // Port too high
    expect(() => SshCredentials.create({
      username: 'user',
      password: 'pass',
      port: 65536
    })).toThrow('SSH port must be between 1 and 65535');

    // Negative port
    expect(() => SshCredentials.create({
      username: 'user',
      password: 'pass',
      port: -1
    })).toThrow('SSH port must be between 1 and 65535');
  });

  it('should correctly compare two SshCredentials for equality', () => {
    const props1: SshCredentialsProps = {
      username: 'user',
      password: 'pass',
      port: 22
    };
    
    const props2: SshCredentialsProps = {
      username: 'user',
      password: 'pass',
      port: 22
    };
    
    const props3: SshCredentialsProps = {
      username: 'otheruser',
      password: 'pass',
      port: 22
    };
    
    const credentials1 = SshCredentials.create(props1);
    const credentials2 = SshCredentials.create(props2);
    const credentials3 = SshCredentials.create(props3);
    
    expect(credentials1.equals(credentials2)).toBe(true);
    expect(credentials1.equals(credentials3)).toBe(false);
    expect(credentials2.equals(credentials3)).toBe(false);
  });
});