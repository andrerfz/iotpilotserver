import {SSHSession} from '../ssh-session.entity';
import {SSHCredentials} from '../../value-objects/ssh-credentials.vo';

describe('SSHSession Entity', () => {
  it('should create a open SSH session with valid credentials', () => {
    const credentials = SSHCredentials.create('username', 'password');
    const session = new SSHSession(credentials, true);

    expect(session.credentials instanceof SSHCredentials).toBeTruthy();
    expect(session.active).toBeTruthy();
  });
});