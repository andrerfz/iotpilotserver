/**
 * Mock SSH2 module for webpack bundling
 * This prevents webpack from trying to bundle the native .node files
 */

module.exports = {
  Client: class MockSSHClient {
    on() { return this; }
    connect() { throw new Error('SSH not available in this context'); }
    exec() { throw new Error('SSH not available in this context'); }
    end() {}
  },
  Server: class MockSSHServer {
    on() { return this; }
    listen() { throw new Error('SSH not available in this context'); }
    close() {}
  },
};
