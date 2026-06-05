-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES categories(id),
    description TEXT,
    unit VARCHAR(50) NOT NULL, -- kg, litre, piece, packet
    unit_price DECIMAL(10,2) NOT NULL,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    low_stock_threshold DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'mpesa')),
    sale_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sale items table
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

-- Stock movements table
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('sale', 'restock', 'damage', 'correction')),
    quantity_change DECIMAL(10,2) NOT NULL,
    new_quantity DECIMAL(10,2) NOT NULL,
    reference VARCHAR(200), -- receipt number or note
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shop settings table
CREATE TABLE shop_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_name VARCHAR(200) DEFAULT 'Bashan Animal Feeds',
    phone VARCHAR(20),
    address TEXT,
    owner_email VARCHAR(200),
    email_alerts BOOLEAN DEFAULT false,
    receipt_prefix VARCHAR(20) DEFAULT 'BASH-',
    next_receipt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Owner account table
CREATE TABLE owner_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    business_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
('Animal Feeds', 'Livestock and poultry feeds'),
('Pesticides', 'Crop protection chemicals'),
('Herbicides', 'Weed control products'),
('Seeds', 'Agricultural seeds'),
('Fertilizers', 'Soil nutrients and fertilizers'),
('Other', 'Miscellaneous products');

-- Insert default shop settings
INSERT INTO shop_settings (shop_name, receipt_prefix, next_receipt_number) 
VALUES ('Bashan Animal Feeds', 'BASH-', 1);