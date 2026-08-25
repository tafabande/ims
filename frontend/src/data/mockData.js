export const INITIAL_USERS = [
  { id: 1, name: 'Alice Admin', email: 'admin@ims.com', role: 'ADMIN', active: true, department: 'Executive Management' },
  { id: 2, name: 'Bob Manager', email: 'manager@ims.com', role: 'MANAGER', active: true, department: 'Inventory Operations' },
  { id: 3, name: 'Charlie Staff', email: 'staff@ims.com', role: 'STAFF', active: true, department: 'Warehouse & Sales' },
];

export const INITIAL_CATEGORIES = [
  { id: 1, name: 'Laptops & Computers', description: 'High-performance workstations & laptops', code: 'CAT-LAP' },
  { id: 2, name: 'Peripherals & Accessories', description: 'Mice, keyboards, headsets and adapters', code: 'CAT-ACC' },
  { id: 3, name: 'Monitors & Displays', description: '4K IPS and Gaming Monitors', code: 'CAT-MON' },
  { id: 4, name: 'Networking & Storage', description: 'Routers, switches, and NAS drives', code: 'CAT-NET' },
  { id: 5, name: 'Office Supplies', description: 'Printers, paper, and stationary', code: 'CAT-OFF' },
];

export const INITIAL_SUPPLIERS = [
  { id: 1, name: 'TechDistro Global Inc', contact_person: 'David Miller', email: 'sales@techdistro.com', phone: '+1 800-555-0199', address: '100 Silicon Way, San Jose, CA' },
  { id: 2, name: 'OmniHardware Supply Ltd', contact_person: 'Sarah Connor', email: 'orders@omnihardware.io', phone: '+1 800-555-0288', address: '450 Industrial Pkwy, Chicago, IL' },
  { id: 3, name: 'ElectroCorp Wholesale', contact_person: 'Michael Chang', email: 'support@electrocorp.com', phone: '+1 800-555-0377', address: '78 Logistics Blvd, Dallas, TX' },
];

export const INITIAL_CUSTOMERS = [
  { id: 1, name: 'Apex Retail Stores', contact_person: 'John Wick', email: 'procurement@apexretail.com', phone: '+1 555-0123', total_orders: 24, total_spent: 18450.00 },
  { id: 2, name: 'Metro Supermarkets', contact_person: 'Emma Watson', email: 'buying@metrosuper.com', phone: '+1 555-0198', total_orders: 12, total_spent: 9800.00 },
  { id: 3, name: 'Cyber Solutions Ltd', contact_person: 'Robert Downey', email: 'it@cybersolutions.org', phone: '+1 555-0245', total_orders: 8, total_spent: 14200.00 },
  { id: 4, name: 'Acme Enterprise', contact_person: 'Bruce Wayne', email: 'accounts@acme.com', phone: '+1 555-0312', total_orders: 15, total_spent: 22100.00 },
];

export const INITIAL_PRODUCTS = [
  {
    id: 1,
    sku: 'LAP-001',
    name: 'Lenovo ThinkPad X1 Carbon Gen 11',
    description: '14" FHD+, Intel Core i7, 16GB RAM, 512GB SSD',
    category_id: 1,
    supplier_id: 1,
    purchase_price: 1100.00,
    selling_price: 1450.00,
    stock_quantity: 18,
    reorder_level: 5,
    unit: 'Units',
    barcode: '883920194821',
    active: true,
    created_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 2,
    sku: 'LAP-002',
    name: 'Dell XPS 15 9530',
    description: '15.6" 3.5K OLED Touch, i9, 32GB RAM, 1TB SSD',
    category_id: 1,
    supplier_id: 1,
    purchase_price: 1600.00,
    selling_price: 2100.00,
    stock_quantity: 4,
    reorder_level: 6,
    unit: 'Units',
    barcode: '883920194822',
    active: true,
    created_at: '2026-01-16T11:30:00Z'
  },
  {
    id: 3,
    sku: 'ACC-001',
    name: 'Logitech MX Master 3S Wireless Mouse',
    description: '8K DPI, Quiet Clicks, Ergonomic Bluetooth Mouse',
    category_id: 2,
    supplier_id: 2,
    purchase_price: 65.00,
    selling_price: 99.00,
    stock_quantity: 42,
    reorder_level: 10,
    unit: 'Units',
    barcode: '883920194823',
    active: true,
    created_at: '2026-01-20T09:15:00Z'
  },
  {
    id: 4,
    sku: 'ACC-002',
    name: 'Keychron K2 Wireless Mechanical Keyboard',
    description: '75% Layout, Gateron G Pro Red Switches, RGB',
    category_id: 2,
    supplier_id: 2,
    purchase_price: 55.00,
    selling_price: 89.00,
    stock_quantity: 3,
    reorder_level: 8,
    unit: 'Units',
    barcode: '883920194824',
    active: true,
    created_at: '2026-01-22T14:20:00Z'
  },
  {
    id: 5,
    sku: 'MON-001',
    name: 'Dell UltraSharp U2723QE 27" 4K Monitor',
    description: 'IPS Black Technology, USB-C Hub Monitor, HDR400',
    category_id: 3,
    supplier_id: 3,
    purchase_price: 380.00,
    selling_price: 520.00,
    stock_quantity: 12,
    reorder_level: 4,
    unit: 'Units',
    barcode: '883920194825',
    active: true,
    created_at: '2026-02-01T08:00:00Z'
  },
  {
    id: 6,
    sku: 'NET-001',
    name: 'Ubiquiti UniFi Dream Router (UDR)',
    description: 'All-in-one Wi-Fi 6 Router with PoE Ports',
    category_id: 4,
    supplier_id: 3,
    purchase_price: 140.00,
    selling_price: 199.00,
    stock_quantity: 2,
    reorder_level: 5,
    unit: 'Units',
    barcode: '883920194826',
    active: true,
    created_at: '2026-02-05T16:45:00Z'
  }
];

export const INITIAL_TRANSACTIONS = [
  { id: 101, product_id: 1, product_name: 'Lenovo ThinkPad X1 Carbon Gen 11', type: 'PURCHASE', quantity: 20, reference: 'PO-2026-001', user_name: 'Bob Manager', timestamp: '2026-08-20T09:30:00Z', notes: 'Initial stock intake from TechDistro' },
  { id: 102, product_id: 1, product_name: 'Lenovo ThinkPad X1 Carbon Gen 11', type: 'SALE', quantity: -2, reference: 'INV-2026-101', user_name: 'Charlie Staff', timestamp: '2026-08-21T14:15:00Z', notes: 'Sale to Apex Retail' },
  { id: 103, product_id: 2, product_name: 'Dell XPS 15 9530', type: 'PURCHASE', quantity: 10, reference: 'PO-2026-002', user_name: 'Bob Manager', timestamp: '2026-08-22T10:00:00Z', notes: 'Order arrival' },
  { id: 104, product_id: 2, product_name: 'Dell XPS 15 9530', type: 'SALE', quantity: -6, reference: 'INV-2026-102', user_name: 'Charlie Staff', timestamp: '2026-08-23T11:45:00Z', notes: 'Sale to Acme Enterprise' },
  { id: 105, product_id: 4, product_name: 'Keychron K2 Wireless Mechanical Keyboard', type: 'ADJUSTMENT', quantity: -2, reference: 'ADJ-2026-004', user_name: 'Alice Admin', timestamp: '2026-08-24T16:20:00Z', notes: 'Damaged during transit' },
  { id: 106, product_id: 6, product_name: 'Ubiquiti UniFi Dream Router (UDR)', type: 'SALE', quantity: -3, reference: 'INV-2026-103', user_name: 'Charlie Staff', timestamp: '2026-08-25T09:10:00Z', notes: 'Sale to Cyber Solutions' },
];

export const INITIAL_PURCHASES = [
  {
    id: 1,
    po_number: 'PO-2026-001',
    supplier_id: 1,
    supplier_name: 'TechDistro Global Inc',
    status: 'RECEIVED',
    total_amount: 22000.00,
    created_at: '2026-08-18T10:00:00Z',
    received_at: '2026-08-20T09:30:00Z',
    items: [
      { product_id: 1, product_name: 'Lenovo ThinkPad X1 Carbon Gen 11', quantity: 20, unit_price: 1100.00 }
    ]
  },
  {
    id: 2,
    po_number: 'PO-2026-002',
    supplier_id: 2,
    supplier_name: 'OmniHardware Supply Ltd',
    status: 'PENDING',
    total_amount: 3250.00,
    created_at: '2026-08-24T14:30:00Z',
    received_at: null,
    items: [
      { product_id: 3, product_name: 'Logitech MX Master 3S Wireless Mouse', quantity: 50, unit_price: 65.00 }
    ]
  }
];

export const INITIAL_SALES = [
  {
    id: 1,
    invoice_number: 'INV-2026-101',
    customer_id: 1,
    customer_name: 'Apex Retail Stores',
    total_amount: 2900.00,
    payment_status: 'PAID',
    payment_method: 'Bank Transfer',
    created_at: '2026-08-21T14:15:00Z',
    created_by: 'Charlie Staff',
    items: [
      { product_id: 1, product_name: 'Lenovo ThinkPad X1 Carbon Gen 11', quantity: 2, unit_price: 1450.00 }
    ]
  },
  {
    id: 2,
    invoice_number: 'INV-2026-102',
    customer_id: 4,
    customer_name: 'Acme Enterprise',
    total_amount: 12600.00,
    payment_status: 'PAID',
    payment_method: 'Credit Card',
    created_at: '2026-08-23T11:45:00Z',
    created_by: 'Charlie Staff',
    items: [
      { product_id: 2, product_name: 'Dell XPS 15 9530', quantity: 6, unit_price: 2100.00 }
    ]
  }
];
