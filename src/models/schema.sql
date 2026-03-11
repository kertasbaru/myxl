-- ==========================================
-- 1. AUTHENTICATION & SESSIONS
-- ==========================================
-- Menyimpan sesi login, token, dan device fingerprint
CREATE TABLE IF NOT EXISTS myxl_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number VARCHAR(20) NOT NULL UNIQUE, -- Nomor MSISDN (Format: 628xxx)
    
    -- Auth Tokens
    access_token TEXT,                  -- JWT Access Token dari MyXL
    refresh_token TEXT,                 -- Refresh Token untuk perpanjang sesi
    id_token TEXT,                      -- Identity Token
    
    -- User Info
    subscriber_id VARCHAR(100),         -- Internal ID User MyXL
    subscription_type VARCHAR(50),      -- PREPAID (Prabayar) / POSTPAID (Pascabayar)
    
    -- Expiry Management
    expires_in INT DEFAULT 0,           -- Durasi token dalam detik
    refresh_expires_in INT DEFAULT 0,   -- Durasi refresh token dalam detik
    expired_token BIGINT DEFAULT 0,     -- Timestamp (Epoch ms) kapan token hangus
    
    -- Device Security
    ax_fp TEXT,                         -- Encrypted Device Fingerprint
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes untuk performa pencarian
    INDEX idx_number (number),
    INDEX idx_expired (expired_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 2. PRODUCT CATALOG
-- ==========================================
-- Menyimpan cache daftar paket agar tidak perlu selalu request ke MyXL
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL,         -- Kode Unik Paket (productCode)
    name VARCHAR(255) NOT NULL,         -- Nama Paket yang tampil di user
    price DECIMAL(15, 2) DEFAULT 0,     -- Harga Paket
    description TEXT,                   -- Deskripsi lengkap
    
    -- Categorization
    family_name VARCHAR(100),           -- Kategori Utama (Internet, Voice, SMS)
    family_code VARCHAR(100),
    is_enterprise BOOLEAN DEFAULT false,
    
    -- Variant Details
    variant_name VARCHAR(100),
    option_name VARCHAR(100),
    sort_order INT DEFAULT 0,           -- Untuk pengurutan tampilan
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_code (code),
    INDEX idx_family_code (family_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 3. TRANSACTION LOGS (NEW)
-- ==========================================
-- Mencatat riwayat pembelian paket via API ini
CREATE TABLE IF NOT EXISTS transaction_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ref_id VARCHAR(100) NOT NULL UNIQUE, -- Request ID unik dari sistem kita (UUID)
    msisdn VARCHAR(20) NOT NULL,         -- Nomor yang ditransaksikan
    product_code VARCHAR(100) NOT NULL,  -- Paket yang dibeli
    
    -- Status Transaksi
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED
    status_message TEXT,                  -- Pesan error atau sukses dari MyXL
    
    -- External Reference
    xl_transaction_id VARCHAR(100),       -- ID Transaksi balikan dari sistem MyXL
    
    -- Payment Info
    price_amount DECIMAL(15, 2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'PULSA', -- PULSA, DOMPET_PULSA, OVO, GOPAY
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_msisdn (msisdn),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
