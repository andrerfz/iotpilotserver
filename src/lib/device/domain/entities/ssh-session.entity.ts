import {SSHCredentials} from '../value-objects/ssh-credentials.vo';

class SSHSession {
  constructor(
    public readonly credentials: SSHCredentials,
    public readonly active: boolean,
  ) {}
}

export {SSHSession};