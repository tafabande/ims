// Default Pre-Populated Sample Dataset for IMS Frontend Standalone & Offline Mode

export const INITIAL_USERS = [
  { id: 1, user_code: 'USR-000001', email: 'admin@ims.co.zw', full_name: 'System Administrator', role: 'APP_ADMIN', department: 'IT Governance', active: true },
  { id: 2, user_code: 'USR-000002', email: 'manager@ims.co.zw', full_name: 'Store Operations Manager', role: 'MANAGER', department: 'Store Operations', active: true },
  { id: 3, user_code: 'USR-000003', email: 'staff@ims.co.zw', full_name: 'Front-Desk Cashier', role: 'STAFF', department: 'Front Desk Sales', active: true },
  { id: 4, user_code: 'USR-000004', email: 'warehouse@ims.co.zw', full_name: 'Warehouse Specialist', role: 'WAREHOUSE', department: 'Logistics & Stock Control', active: true },
  { id: 5, user_code: 'USR-000005', email: 'auditor@ims.co.zw', full_name: 'Financial Compliance Auditor', role: 'AUDITOR', department: 'Audit & Compliance', active: true }
];

export const INITIAL_CATEGORIES = [
  { id: 1, category_code: 'CAT-000001', name: 'Computers & Laptops', code: 'COMP', description: 'Laptops, Desktop Workstations & Servers' },
  { id: 2, category_code: 'CAT-000002', name: 'Peripherals & Input', code: 'PERIPH', description: 'Mice, Keyboards, Monitors & Accessories' },
  { id: 3, category_code: 'CAT-000003', name: 'Audio & Media', code: 'AUDIO', description: 'Cassettes, Reels, Vinyl Records & Players' },
  { id: 4, category_code: 'CAT-000004', name: 'Digital Storage', code: 'STOR', description: 'Flash Drives, Hard Disks, Floppy Disks, CDs & DVDs' },
  { id: 5, category_code: 'CAT-000005', name: 'Accessories & Cables', code: 'ACC', description: 'Power Chargers, Ethernet Cables & Hubs' },
  { id: 6, category_code: 'CAT-000006', name: 'Office Equipment', code: 'OFFICE', description: 'Typewriters, Printers & Scanners' }
];

export const INITIAL_SUPPLIERS = [
  { id: 1, name: 'TechCorp International', contact_person: 'David Miller', email: 'orders@techcorp.com', phone: '+263 242 700900', address: '10 Tech Way, Harare CBD' },
  { id: 2, name: 'Global Hardware Distributors', contact_person: 'Sarah Jenkins', email: 'sales@globalhd.co.zw', phone: '+263 292 881020', address: '45 Industrial Park, Bulawayo' },
  { id: 3, name: 'Apex Digital Supply Ltd', contact_person: 'Michael Moyo', email: 'supply@apexdigital.co.zw', phone: '+263 202 611200', address: '12 Commercial Rd, Mutare' }
];

export const INITIAL_CUSTOMERS = [
  { id: 1, name: 'Walk-in Customer', contact_person: 'General Public', email: 'walkin@ims.co.zw', phone: '+263 000 000000' },
  { id: 2, name: 'Harare Commercial Bank', contact_person: 'Tafadzwa Chitepo', email: 'procurement@hcb.co.zw', phone: '+263 242 889001' },
  { id: 3, name: 'Bulawayo Retailers Association', contact_person: 'Grace Ndlovu', email: 'info@byoretail.co.zw', phone: '+263 292 667800' }
];

export const INITIAL_PRODUCTS = [
  { id: 1, product_code: 'PRD-000001', sku: 'SKU-DELL-XPS15', name: 'Dell XPS 15 Workstation Laptop 32GB RAM', category: 'Computers & Laptops', purchase_price: 1100.00, selling_price: 1450.00, stock_quantity: 143, reorder_level: 20, unit: 'Units', barcode: '202000000012' },
  { id: 2, product_code: 'PRD-000002', sku: 'SKU-LOGI-MX3S', name: 'Logitech MX Master 3S Wireless Mouse', category: 'Peripherals & Input', purchase_price: 65.00, selling_price: 99.00, stock_quantity: 55, reorder_level: 15, unit: 'Units', barcode: '202000000013' },
  { id: 3, product_code: 'PRD-000003', sku: 'SKU-PWR-65W', name: 'USB-C 65W Universal Power Adapter', category: 'Accessories & Cables', purchase_price: 14.00, selling_price: 29.99, stock_quantity: 12, reorder_level: 20, unit: 'Units', barcode: '202000000014' },
  { id: 4, product_code: 'PRD-000004', sku: 'SKU-2014-FLASH', name: '32GB USB 3.0 Flash Drive', category: 'Digital Storage', purchase_price: 7.50, selling_price: 15.00, stock_quantity: 140, reorder_level: 30, unit: 'Units', barcode: '201400000011' },
  { id: 5, product_code: 'PRD-000005', sku: 'SKU-NET-CAT6', name: 'CAT6 Ethernet Cable 100m Roll', category: 'Accessories & Cables', purchase_price: 35.00, selling_price: 65.00, stock_quantity: 28, reorder_level: 10, unit: 'Rolls', barcode: '202000000015' },
  { id: 6, product_code: 'PRD-000006', sku: 'SKU-1972-CASSETTE', name: 'C-90 Compact Audio Cassette Tape', category: 'Audio & Media', purchase_price: 1.20, selling_price: 2.99, stock_quantity: 120, reorder_level: 25, unit: 'Units', barcode: '197200000003' },
  { id: 7, product_code: 'PRD-000007', sku: 'SKU-1975-TYPEWRITER', name: 'Manual Mechanical Typewriter - Steel Frame', category: 'Office Equipment', purchase_price: 85.00, selling_price: 150.00, stock_quantity: 4, reorder_level: 2, unit: 'Units', barcode: '197500000004' },
  { id: 8, product_code: 'PRD-000008', sku: 'SKU-LOGI-K860', name: 'Logitech ERGO K860 Wireless Split Keyboard', category: 'Peripherals & Input', purchase_price: 75.00, selling_price: 125.00, stock_quantity: 0, reorder_level: 5, unit: 'Units', barcode: '202000000016' }
];

export const INITIAL_TRANSACTIONS = [
  { id: 1, product_id: 1, type: 'RECEIVE', quantity: 50, quantity_before: 93, quantity_after: 143, reason_category: 'GOODS_RECEIVE', reference: 'PO-2026-000057', user_name: 'warehouse@ims.co.zw', created_at: '2026-08-26 10:15:00' },
  { id: 2, product_id: 2, type: 'SALE', quantity: -2, quantity_before: 57, quantity_after: 55, reason_category: 'CUSTOMER_SALE', reference: 'SAL-2026-000184', user_name: 'staff@ims.co.zw', created_at: '2026-08-26 11:42:00' }
];

export const INITIAL_PURCHASES = [
  { id: 1, po_number: 'PO-2026-000057', supplier_name: 'TechCorp International', status: 'RECEIVED', total_amount: 11000.00, created_at: '2026-08-25', items: [{ product_id: 1, quantity: 10, unit_price: 1100.00 }] },
  { id: 2, po_number: 'PO-2026-000058', supplier_name: 'Global Hardware Distributors', status: 'PENDING', total_amount: 1800.00, created_at: '2026-08-26', items: [{ product_id: 3, quantity: 60, unit_price: 14.00 }] }
];

export const INITIAL_SALES = [
  { id: 1, receipt_no: 'REC-2026-001048', invoice_no: 'SAL-2026-000184', customer_name: 'Walk-in Customer', items: [{ name: 'Dell XPS 15 Workstation', qty: 1, price: 1450.00 }], total_amount: 1450.00, payment_method: 'CASH', created_at: '2026-08-26 11:42:00' },
  { id: 2, receipt_no: 'REC-2026-001049', invoice_no: 'SAL-2026-000185', customer_name: 'Harare Commercial Bank', items: [{ name: 'Logitech MX Master 3S', qty: 1, price: 99.00 }], total_amount: 99.00, payment_method: 'EcoCash Mobile Money', created_at: '2026-08-26 12:10:00' }
];

export const INITIAL_AUDIT_LOGS = [
  { id: 1, event_id: 'EVT-900481', operator: 'Manager (USR-000002)', action: 'REFUND_APPROVE', details: 'Approved REF-2026-0039 ($120.00 USD)', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  { id: 2, event_id: 'EVT-900480', operator: 'Warehouse (USR-000004)', action: 'GOODS_RECEIVE', details: 'GRN PO-00428 (20 units Dell XPS)', hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4' }
];
