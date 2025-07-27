/**
 * Mock node-ssh module for webpack bundling
 * This prevents webpack from trying to bundle SSH2 native .node files
 */

class MockNodeSSH {
  connect() {
    return Promise.reject(new Error('SSH not available in this context'));
  }
  
  execCommand() {
    return Promise.reject(new Error('SSH not available in this context'));
  }
  
  dispose() {
    return Promise.resolve();
  }
}

module.exports = {
  NodeSSH: MockNodeSSH,
  default: MockNodeSSH,
};
