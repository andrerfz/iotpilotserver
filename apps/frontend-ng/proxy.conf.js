module.exports = [
  {
    context: ['/api'],
    target: process.env['NG_API_URL'] || 'http://localhost:3100',
    secure: false,
    changeOrigin: true,
  },
];
