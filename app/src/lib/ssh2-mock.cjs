// This is a mock version of the ssh2 library for webpack to use during the build process
// It provides empty implementations of the classes and methods used by the SSH executor

module.exports = {
  Client: class Client {
    constructor() {}
    connect() {}
    on() {}
    exec() {}
    end() {}
  }
};