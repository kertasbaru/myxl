const winston = require('winston');
require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Tentukan direktori log (Absolute Path agar aman)
const logDir = path.isAbsolute(config.log.dir)
  ? config.log.dir
  : path.join(process.cwd(), config.log.dir);

// Buat direktori jika belum ada
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.error(`[Logger] Failed to create log directory: ${error.message}`);
  }
}

// Format Custom untuk Console
const consoleFormat = winston.format.printf(({ timestamp, level, message, stack }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
});

// Definisi Transports
const transports = [
  // 1. Console Log (Tampil di Terminal)
  new winston.transports.Console({
    level: config.log.level,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    ),
    silent: config.app.env === 'test', // Matikan log saat testing
  }),

  // 2. Combined Log (Semua level info ke atas masuk sini - Rotasi Harian)
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, '%DATE%-' + config.log.filename),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: config.log.maxSize,
    maxFiles: config.log.maxFiles,
    level: config.log.level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json() // Format JSON untuk kemudahan parsing tools
    ),
  }),

  // 3. Error Log (Hanya level error yang masuk sini - Rotasi Harian)
  // Memudahkan debugging karena terpisah dari log info biasa
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, '%DATE%-error.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Inisialisasi Logger
const logger = winston.createLogger({
  level: config.log.level,
  transports: transports,
  // Handle unhandled exceptions/rejections agar tercatat di log sebelum crash
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
  ]
});

// Stream untuk Morgan (HTTP Request Logger)
// Menghilangkan newline di akhir message agar rapi di log
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
