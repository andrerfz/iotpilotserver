/**
 * SSHCredentials Value Object
 * 
 * Represents SSH credentials for connecting to a device.
 * Ensures the credentials are valid and provides immutability.
 */
class SSHCredentials {
  private constructor(
    private readonly _username: string,
    private readonly _password: string,
    private readonly _privateKey?: string,
    private readonly _passphrase?: string
  ) {
    this.validate();
  }

  /**
   * Factory method to create new SSHCredentials with username and password
   * @param username The SSH username
   * @param password The SSH password
   * @returns A new SSHCredentials instance
   * @throws Error if the credentials are invalid
   */
  static create(username: string, password: string): SSHCredentials {
    return new SSHCredentials(username, password);
  }

  /**
   * Factory method to create new SSHCredentials with username and private key
   * @param username The SSH username
   * @param privateKey The SSH private key
   * @param passphrase Optional passphrase for the private key
   * @returns A new SSHCredentials instance
   * @throws Error if the credentials are invalid
   */
  static createWithKey(username: string, privateKey: string, passphrase?: string): SSHCredentials {
    return new SSHCredentials(username, '', privateKey, passphrase);
  }

  /**
   * Validates that the SSH credentials are valid
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this._username) {
      throw new Error('SSH username cannot be empty');
    }

    if (this._username.length < 1) {
      throw new Error('SSH username must be at least 1 character long');
    }

    // If no private key is provided, password is required
    if (!this._privateKey && !this._password) {
      throw new Error('Either SSH password or private key must be provided');
    }

    // If private key is provided and has a passphrase, the passphrase must not be empty
    if (this._privateKey && this._passphrase === '') {
      throw new Error('SSH key passphrase cannot be empty if specified');
    }
  }

  /**
   * Gets the SSH username
   */
  get username(): string {
    return this._username;
  }

  /**
   * Gets the SSH password
   */
  get password(): string {
    return this._password;
  }

  /**
   * Gets the SSH private key if available
   */
  get privateKey(): string | undefined {
    return this._privateKey;
  }

  /**
   * Gets the SSH key passphrase if available
   */
  get passphrase(): string | undefined {
    return this._passphrase;
  }

  /**
   * Checks if this SSHCredentials uses key-based authentication
   * @returns True if key-based authentication is used, false otherwise
   */
  isKeyBased(): boolean {
    return !!this._privateKey;
  }

  /**
   * Checks if this SSHCredentials uses password-based authentication
   * @returns True if password-based authentication is used, false otherwise
   */
  isPasswordBased(): boolean {
    return !!this._password;
  }

  /**
   * Checks if this SSHCredentials is equal to another SSHCredentials
   * @param other The other SSHCredentials to compare with
   * @returns True if the credentials are equal, false otherwise
   */
  equals(other: SSHCredentials): boolean {
    return (
      this._username === other.username &&
      this._password === other.password &&
      this._privateKey === other.privateKey &&
      this._passphrase === other.passphrase
    );
  }

  /**
   * Returns a masked version of the credentials for logging purposes
   * @returns An object with the username and masked password/key
   */
  toMasked(): { username: string; password?: string; hasKey: boolean } {
    return {
      username: this._username,
      password: this._password ? '********' : undefined,
      hasKey: !!this._privateKey
    };
  }
}

export { SSHCredentials };