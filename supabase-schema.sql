-- Complete database schema for inventory management
-- Tables: materials, suppliers, issue_records, purchase_entries
-- With proper relationships, constraints, and indexes

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Raw Material', 'Consumable', 'Tool', 'Safety Equipment')),
  unit VARCHAR(20) NOT NULL CHECK (unit IN ('Kg', 'Liters', 'Pieces', 'Meters', 'Boxes', 'Pairs', 'Sets')),
  opening_stock DECIMAL(10,2) DEFAULT 0,
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock DECIMAL(10,2) DEFAULT 0,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  contact_person VARCHAR(100),
  gst VARCHAR(20),
  relationship_start DATE,
  total_purchase_value DECIMAL(15,2) DEFAULT 0,
  materials_supplied JSONB DEFAULT '[]',
  last_purchase_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create issue_records table
CREATE TABLE IF NOT EXISTS issue_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  team VARCHAR(50) NOT NULL CHECK (team IN ('Tooling', 'Production', 'Assembly', 'Quality', 'Maintenance', 'R&D')),
  project VARCHAR(100) NOT NULL CHECK (project IN ('Project Alpha', 'Project Beta', 'Project Gamma', 'Maintenance', 'General')),
  entered_by VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued', 'in_progress', 'completed', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_entries table
CREATE TABLE IF NOT EXISTS purchase_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  invoice_number VARCHAR(50),
  notes TEXT,
  entered_by VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(code);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_issue_records_date ON issue_records(date);
CREATE INDEX IF NOT EXISTS idx_issue_records_team ON issue_records(team);
CREATE INDEX IF NOT EXISTS idx_purchase_entries_date ON purchase_entries(date);
CREATE INDEX IF NOT EXISTS idx_purchase_entries_supplier ON purchase_entries(supplier_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_entries ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication setup)
-- For now, allow all operations (you should restrict these based on user roles)
CREATE POLICY "Allow all operations on materials" ON materials FOR ALL USING (true);
CREATE POLICY "Allow all operations on suppliers" ON suppliers FOR ALL USING (true);
CREATE POLICY "Allow all operations on issue_records" ON issue_records FOR ALL USING (true);
CREATE POLICY "Allow all operations on purchase_entries" ON purchase_entries FOR ALL USING (true);

-- Insert some sample data
INSERT INTO suppliers (name, email, phone, address, contact_person, gst) VALUES
('ABC Suppliers', 'contact@abc.com', '+91-9876543210', '123 Industrial Area, Mumbai', 'John Doe', 'GST123456'),
('XYZ Materials', 'sales@xyz.com', '+91-9876543211', '456 Business Park, Delhi', 'Jane Smith', 'GST654321')
ON CONFLICT DO NOTHING;

INSERT INTO materials (code, name, category, unit, opening_stock, current_stock, min_stock, supplier_id, purchase_price) VALUES
('MAT-AL-001', 'Aluminum Sheet 2mm', 'Raw Material', 'Kg', 100, 100, 20, (SELECT id FROM suppliers WHERE name = 'ABC Suppliers' LIMIT 1), 250.00),
('MAT-ST-001', 'Steel Rod 10mm', 'Raw Material', 'Kg', 50, 50, 10, (SELECT id FROM suppliers WHERE name = 'XYZ Materials' LIMIT 1), 180.00),
('MAT-GL-001', 'Safety Gloves', 'Safety Equipment', 'Pairs', 200, 200, 50, (SELECT id FROM suppliers WHERE name = 'ABC Suppliers' LIMIT 1), 15.00)
ON CONFLICT (code) DO NOTHING;