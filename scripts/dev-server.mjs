if (process.env.NODE_ENV === 'production') throw new Error('Utilisez npm start en production.');
process.env.NODE_ENV = 'development';
process.env.APP_ORIGIN = 'http://127.0.0.1:5173';
process.env.PORT = '3040';
process.env.HOST = '127.0.0.1';
await import('../server/index.mjs');
