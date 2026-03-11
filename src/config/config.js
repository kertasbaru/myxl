const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load environment variables dari file .env di root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Schema Validasi Environment Variables
const envVarsSchema = Joi.object()
  .keys({
    // 1. App Core
    NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
    APP_NAME: Joi.string().default('MyXL API'),
    HOST: Joi.string().default('0.0.0.0'),
    PORT: Joi.number().default(5000),
    TZ: Joi.string().default('Asia/Jakarta'),

    // 2. Security & Limits
    RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
    RATE_LIMIT_MAX: Joi.number().default(100),
    CORS_ORIGIN: Joi.string().default('*'),
    CORS_METHODS: Joi.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),

    // 3. Database
    DATABASE_URL: Joi.string().required().description('Database Connection URL'),
    DB_CONNECTION: Joi.string().default('mysql'),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(3306),
    DB_DATABASE: Joi.string().required(),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().allow('').default(''),

    // 4. Logging
    LOG_LEVEL: Joi.string().default('info'),
    LOG_DIR: Joi.string().default('logs'),
    LOG_FILENAME: Joi.string().default('app.log'),
    LOG_MAX_SIZE: Joi.string().default('10m'),
    LOG_MAX_FILES: Joi.string().default('14d'),

    // 5. MyXL External Service
    BASE_API_URL: Joi.string().required(),
    BASE_CIAM_URL: Joi.string().required(),
    UA: Joi.string().required(),
    BASIC_AUTH: Joi.string().required(),
    
    // 6. Keys & Secrets
    API_KEY: Joi.string().required(),
    AX_FP_KEY: Joi.string().required(),
    AX_API_SIG_KEY: Joi.string().required(),
    XDATA_KEY: Joi.string().required(),
    X_API_BASE_SECRET: Joi.string().required(),
    X_SECRET: Joi.string().required(),
    CIRCLE_MSISDN_KEY: Joi.string().required(),
  })
  .unknown(); // Mengizinkan variabel lain yang tidak didefinisikan di schema

// Eksekusi Validasi
const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Susun Object Config
const config = {
  app: {
    env: envVars.NODE_ENV,
    name: envVars.APP_NAME,
    host: envVars.HOST,
    port: envVars.PORT,
    timezone: envVars.TZ,
  },
  security: {
    rateLimitWindow: envVars.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: envVars.RATE_LIMIT_MAX,
  },
  cors: {
    origin: envVars.CORS_ORIGIN,
    methods: envVars.CORS_METHODS.split(','), // Convert string to array
  },
  db: {
    url: envVars.DATABASE_URL,
    connection: envVars.DB_CONNECTION,
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    database: envVars.DB_DATABASE,
    username: envVars.DB_USERNAME,
    password: envVars.DB_PASSWORD,
  },
  log: {
    level: envVars.LOG_LEVEL,
    dir: envVars.LOG_DIR,
    filename: envVars.LOG_FILENAME,
    maxSize: envVars.LOG_MAX_SIZE,
    maxFiles: envVars.LOG_MAX_FILES,
  },
  myxl: {
    urls: {
      baseApi: envVars.BASE_API_URL,
      baseCiam: envVars.BASE_CIAM_URL,
    },
    headers: {
      userAgent: envVars.UA,
      basicAuth: envVars.BASIC_AUTH,
    },
    security: {
      apiKey: envVars.API_KEY,
      axFpKey: envVars.AX_FP_KEY,
      axApiSigKey: envVars.AX_API_SIG_KEY,
      xDataKey: envVars.XDATA_KEY,
      xApiBaseSecret: envVars.X_API_BASE_SECRET,
      xSecret: envVars.X_SECRET,
      circleMsisdnKey: envVars.CIRCLE_MSISDN_KEY,
    },
  },
};

module.exports = config;
