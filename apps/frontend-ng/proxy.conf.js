module.exports = [
  {
    context: ['/api'],
    target: process.env['NG_API_URL'] || 'http://localhost:3100',
    secure: false,
    changeOrigin: true,
  },
  {
    // Socket.IO runs on the backend origin under /socket.io; proxy it with ws.
    context: ['/socket.io'],
    target: process.env['NG_API_URL'] || 'http://localhost:3100',
    secure: false,
    changeOrigin: true,
    ws: true,
  },
];
