const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');
const $RefParser = require('@apidevtools/json-schema-ref-parser');

// Import Konfigurasi & Utils
const config = require('./config/config');
const logger = require('./utils/logger');

// const { syncDatabase } = require('./models');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const storeRoutes = require('./routes/storeRoutes');
const famplanRoutes = require('./routes/famplanRoutes');
const circleRoutes = require('./routes/circleRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');

// Inisialisasi App
const app = express();
const PORT = config.app.port || 5000;

// ==========================================
// 1. SECURITY & UTILS MIDDLEWARES
// ==========================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY']
}));

const limiter = rateLimit({
  windowMs: parseInt(config.security.rateLimitWindow) || 60 * 1000,
  max: parseInt(config.security.rateLimitMax) || 100,
  message: { success: false, message: 'Too many requests.' }
});
app.use(limiter);

app.use(morgan('combined', { stream: logger.stream }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 2. DOCUMENTATION (FIXED UI & PARSER)
// ==========================================
let cachedSpec = null;

const buildOpenApiSpec = async () => {
  try {
    const docsDir = path.join(__dirname, '../docs');
    const mainDocPath = path.join(docsDir, 'openapi.yaml');

    // 1. Load Kerangka Utama
    const mainDoc = YAML.load(mainDocPath);
    mainDoc.paths = mainDoc.paths || {};
    mainDoc.components = mainDoc.components || {};
    mainDoc.components.schemas = mainDoc.components.schemas || {};

    // 2. Auto Merge File *Docs.yaml
    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir).filter(file => file.endsWith('Docs.yaml'));
      files.forEach(file => {
        try {
          const doc = YAML.load(path.join(docsDir, file));
          if (doc.paths) Object.assign(mainDoc.paths, doc.paths);
          if (doc.components && doc.components.schemas) {
             Object.assign(mainDoc.components.schemas, doc.components.schemas);
          }
        } catch (e) {
          logger.warn(`Skip ${file}: ${e.message}`);
        }
      });
    }

    // 3. FULL DEREFERENCE
    // Fix untuk error ENOENT: Kita kirim mainDocPath sebagai argumen pertama
    const fullSpec = await $RefParser.dereference(mainDocPath, mainDoc, {
      dereference: { circular: false }
    });

    return fullSpec;

  } catch (error) {
    logger.error(`Gagal build OpenAPI Spec: ${error.message}`);
    return null;
  }
};

// Build saat start
buildOpenApiSpec().then(spec => {
  if (spec) {
    cachedSpec = spec;
    logger.info('OpenAPI Spec successfully built and cached.');
  } else {
    logger.warn('OpenAPI Spec failed to build. Docs may be incomplete.');
  }
});

// A. Endpoint JSON
app.get('/api-docs/openapi.json', async (req, res) => {
  if (!cachedSpec) {
    cachedSpec = await buildOpenApiSpec();
  }
  res.json(cachedSpec || {});
});

// B. Render Scalar UI (Tampilan Ringan & Flat)
app.get('/api-docs', (req, res) => {
  res.send(`
    <!doctype html>
    <html>
      <head>
        <title>MyXL API Reference</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          /* RESET CSS: Menghilangkan Background Berat */
          body { 
            margin: 0; 
            background-color: #111111 !important; /* Hitam Solid */
            background-image: none !important;     /* Hapus gambar aurora/cahaya */
          }
          
          /* Kustomisasi Variabel Warna Scalar agar lebih Flat */
          :root {
            --scalar-background-1: #111111 !important;
            --scalar-background-2: #1a1a1a !important;
            --scalar-background-3: #222222 !important;
            --scalar-border-color: #333333 !important;
          }
          
          /* Menyembunyikan elemen dekoratif bawaan tema jika ada */
          .scalar-card-bg, .t-doc__page {
            background: none !important;
            background-color: #111111 !important;
          }
        </style>
      </head>
      <body>
        <script
          id="api-reference"
          data-url="/api-docs/openapi.json"
          data-configuration='{
            "theme": "default", 
            "layout": "modern",
            "showSidebar": true,
            "darkMode": true,
            "defaultHttpClient": {
              "targetKey": "javascript",
              "clientKey": "axios"
            }
          }'
        ></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
  `);
});

// ==========================================
// 3. API ROUTES
// ==========================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: `Welcome to ${config.app.name || 'MyXL API'}`,
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/store', storeRoutes);
app.use('/famplan', famplanRoutes);
app.use('/circle', circleRoutes);
app.use('/purchase', purchaseRoutes);

// ==========================================
// 4. ERROR HANDLING
// ==========================================

app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

app.use((err, req, res, next) => {
  logger.error(`[Error] ${err.message}`);
  
  if (err.isJoi) {
    return res.status(400).json({
      success: false, 
      message: 'Validation Error', 
      errors: err.details.map(d => d.message)
    });
  }

  if (err.message && err.message.includes(' - ')) {
    const [code, msg] = err.message.split(' - ');
    if (!isNaN(code)) return res.status(parseInt(code)).json({ success: false, message: msg });
  }

  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

// ==========================================
// 5. START
// ==========================================

const startServer = async () => {
  app.listen(PORT, () => {
    const host = config.app.host === '0.0.0.0' ? 'localhost' : config.app.host;
    logger.info(`Server running on http://${host}:${PORT}`);
    logger.info(`Docs available at http://${host}:${PORT}/api-docs`);
  });
};

startServer();

module.exports = app;
