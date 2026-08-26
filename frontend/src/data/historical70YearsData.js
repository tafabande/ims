// DEV SERVER ONLY: 70-Year Company Historical Dataset (1956 - 2026)
// Spans 14 Branches, Macroeconomic Eras, Technology Transitions, Employee Lifecycles, and Messages

export const DEV_14_BRANCHES = [
  { id: 1, store_code: 'STR-HRE-01', name: 'Harare Flagship Store (Established 1956)', address: '102 Sam Nujoma St, Harare CBD', phone: '+263 242 700112', city: 'Harare', manager_id: 'EMP-1984-00012', status: 'ACTIVE' },
  { id: 2, store_code: 'STR-BYO-02', name: 'Bulawayo Commercial Branch (Established 1962)', address: '45 Jason Moyo St, Bulawayo', phone: '+263 292 884019', city: 'Bulawayo', manager_id: 'EMP-1991-00045', status: 'ACTIVE' },
  { id: 3, store_code: 'STR-MTR-03', name: 'Mutare Border Outlet (Established 1971)', address: '12 Herbert Chitepo St, Mutare', phone: '+263 202 612099', city: 'Mutare', manager_id: 'EMP-2002-00088', status: 'ACTIVE' },
  { id: 4, store_code: 'STR-GWR-04', name: 'Gweru Central Branch (Established 1978)', address: '88 Main Street, Gweru', phone: '+263 254 221045', city: 'Gweru', manager_id: 'EMP-2005-00102', status: 'ACTIVE' },
  { id: 5, store_code: 'STR-MSV-05', name: 'Masvingo Heritage Branch (Established 1982)', address: '34 Robert Mugabe Ave, Masvingo', phone: '+263 239 264011', city: 'Masvingo', manager_id: 'EMP-2010-00140', status: 'ACTIVE' },
  { id: 6, store_code: 'STR-KWK-06', name: 'Kwekwe Industrial Branch (Established 1988)', address: '15 Industrial Rd, Kwekwe', phone: '+263 255 233901', city: 'Kwekwe', manager_id: 'EMP-2012-00165', status: 'ACTIVE' },
  { id: 7, store_code: 'STR-KDM-07', name: 'Kadoma Retail Branch (Established 1994)', address: '67 Commercial Way, Kadoma', phone: '+263 268 214509', city: 'Kadoma', manager_id: 'EMP-2015-00188', status: 'ACTIVE' },
  { id: 8, store_code: 'STR-VFA-08', name: 'Victoria Falls Tourism Outlet (Established 1999)', address: '20 Livingstone Way, Victoria Falls', phone: '+263 213 284451', city: 'Victoria Falls', manager_id: 'EMP-2018-00210', status: 'ACTIVE' },
  { id: 9, store_code: 'STR-CNH-09', name: 'Chinhoyi Branch (Established 2004)', address: '14 Magamba Way, Chinhoyi', phone: '+263 267 212890', city: 'Chinhoyi', manager_id: 'EMP-2019-00234', status: 'ACTIVE' },
  { id: 10, store_code: 'STR-MRD-10', name: 'Marondera Depot (Established 2008)', address: '5 The Chase, Marondera', phone: '+263 279 230911', city: 'Marondera', manager_id: 'EMP-2020-00255', status: 'ACTIVE' },
  { id: 11, store_code: 'STR-ZVS-11', name: 'Zvishavane Mining Outlet (Established 2012)', address: '8 Mining Hub Rd, Zvishavane', phone: '+263 251 220944', city: 'Zvishavane', manager_id: 'EMP-2021-00280', status: 'ACTIVE' },
  { id: 12, store_code: 'STR-BND-12', name: 'Bindura Branch (Established 2016)', address: '33 University Way, Bindura', phone: '+263 271 200433', city: 'Bindura', manager_id: 'EMP-2022-00301', status: 'ACTIVE' },
  { id: 13, store_code: 'STR-BGB-13', name: 'Beitbridge Border Hub (Established 2020)', address: '1 Customs Way, Beitbridge', phone: '+263 286 225910', city: 'Beitbridge', manager_id: 'EMP-2024-00340', status: 'ACTIVE' },
  { id: 14, store_code: 'STR-GWD-14', name: 'Gwanda Branch (Established 2024)', address: '7 Rainbow Street, Gwanda', phone: '+263 284 201988', city: 'Gwanda', manager_id: 'EMP-2025-00366', status: 'ACTIVE' }
];

export const DEV_ECONOMIC_ERAS = [
  { era: '1956 - 1979', currency: 'Rhodesian Pound / R$', notes: 'Post-WWII British Commonwealth Trading System. Physical ledgers & paper receipts.' },
  { era: '1980 - 1999', currency: 'Zimbabwean Dollar (ZWD)', notes: 'Independence era growth followed by ESAP Structural Adjustment.' },
  { era: '2000 - 2008', currency: 'ZWD Hyperinflation Era', notes: 'Rapid monetary expansion. Price re-denominations (Trillion dollar notes era).' },
  { era: '2009 - 2018', currency: 'Multi-Currency Regime (USD / ZAR)', notes: 'Official dollarization. Cash transactions in USD and South African Rand.' },
  { era: '2019 - 2023', currency: 'RTGS / ZWL Dollar', notes: 'Electronic RTGS currency and bond notes system.' },
  { era: '2024 - 2026', currency: 'Zimbabwe Gold (ZiG) & Dual USD', notes: 'Gold-backed ZiG national currency operating alongside USD and EcoCash.' }
];

export const DEV_70_YEAR_PRODUCTS = [
  // 1950s - 1970s ERA
  { id: 1, era: '1950s - 1970s', sku: 'SKU-1956-VINYL', name: 'Vinyl LP Record - High Fidelity Mono', category: 'Audio Media', purchase_price: 2.50, selling_price: 4.99, stock_quantity: 15, reorder_level: 5, unit: 'Units', barcode: '195600000001' },
  { id: 2, era: '1950s - 1970s', sku: 'SKU-1965-REEL', name: '1/4-inch Reel-to-Reel Audio Tape 1200ft', category: 'Audio Media', purchase_price: 8.00, selling_price: 14.50, stock_quantity: 8, reorder_level: 4, unit: 'Reels', barcode: '196500000002' },
  { id: 3, era: '1950s - 1970s', sku: 'SKU-1972-CASSETTE', name: 'C-90 Compact Audio Cassette Tape', category: 'Audio Media', purchase_price: 1.20, selling_price: 2.99, stock_quantity: 120, reorder_level: 25, unit: 'Units', barcode: '197200000003' },
  { id: 4, era: '1950s - 1970s', sku: 'SKU-1975-TYPEWRITER', name: 'Manual Mechanical Typewriter - Steel Frame', category: 'Office Equipment', purchase_price: 85.00, selling_price: 150.00, stock_quantity: 4, reorder_level: 2, unit: 'Units', barcode: '197500000004' },
  
  // 1980s - 1990s ERA
  { id: 5, era: '1980s - 1990s', sku: 'SKU-1983-VHS', name: 'VHS Blank Video Cassette E-180 (3 Hours)', category: 'Video Media', purchase_price: 4.50, selling_price: 8.99, stock_quantity: 45, reorder_level: 10, unit: 'Units', barcode: '198300000005' },
  { id: 6, era: '1980s - 1990s', sku: 'SKU-1988-CD', name: '700MB Compact Disc Recordable (CD-R 10-Pack)', category: 'Digital Storage', purchase_price: 6.00, selling_price: 12.00, stock_quantity: 80, reorder_level: 20, unit: 'Packs', barcode: '198800000006' },
  { id: 7, era: '1980s - 1990s', sku: 'SKU-1992-FLOPPY', name: '3.5-inch 1.44MB Floppy Diskette Box of 10', category: 'Digital Storage', purchase_price: 5.00, selling_price: 9.99, stock_quantity: 60, reorder_level: 15, unit: 'Boxes', barcode: '199200000007' },
  { id: 8, era: '1980s - 1990s', sku: 'SKU-1996-CRT', name: '15-inch SVGA Color CRT Monitor', category: 'Computer Hardware', purchase_price: 110.00, selling_price: 180.00, stock_quantity: 6, reorder_level: 3, unit: 'Units', barcode: '199600000008' },

  // 2000s - 2010s ERA
  { id: 9, era: '2000s - 2010s', sku: 'SKU-2003-DVD', name: '4.7GB DVD+R Blank Disc Spindle (50-Pack)', category: 'Digital Storage', purchase_price: 12.00, selling_price: 24.99, stock_quantity: 35, reorder_level: 8, unit: 'Spindles', barcode: '200300000009' },
  { id: 10, era: '2000s - 2010s', sku: 'SKU-2007-MP3', name: '2GB Portable MP3 Player with OLED Display', category: 'Personal Electronics', purchase_price: 22.00, selling_price: 45.00, stock_quantity: 18, reorder_level: 5, unit: 'Units', barcode: '200700000010' },
  { id: 11, era: '2000s - 2010s', sku: 'SKU-2014-FLASH', name: '32GB USB 3.0 Flash Drive', category: 'Digital Storage', purchase_price: 7.50, selling_price: 15.00, stock_quantity: 140, reorder_level: 30, unit: 'Units', barcode: '201400000011' },

  // 2020s MODERN ERA
  { id: 12, era: '2020s', sku: 'SKU-DELL-XPS15', name: 'Dell XPS 15 Workstation Laptop 32GB RAM', category: 'Computers', purchase_price: 1100.00, selling_price: 1450.00, stock_quantity: 143, reorder_level: 20, unit: 'Units', barcode: '202000000012' },
  { id: 13, era: '2020s', sku: 'SKU-LOGI-MX3S', name: 'Logitech MX Master 3S Wireless Mouse', category: 'Peripherals', purchase_price: 65.00, selling_price: 99.00, stock_quantity: 55, reorder_level: 15, unit: 'Units', barcode: '202000000013' },
  { id: 14, era: '2020s', sku: 'SKU-PWR-65W', name: 'USB-C 65W Universal Power Adapter', category: 'Accessories', purchase_price: 14.00, selling_price: 29.99, stock_quantity: 12, reorder_level: 20, unit: 'Units', barcode: '202000000014' }
];

export const DEV_70_YEAR_MESSAGES = [
  { id: 101, year: 1956, sender: 'Arthur Pendelton (Founder)', recipient: 'All Staff', title: 'Grand Opening of Harare Store #01', body: 'Welcome to the inaugural trading day of Pendelton & Sons Supply Co. May our ledgers always balance.', priority: 'NORMAL', scope: 'BROADCAST' },
  { id: 102, year: 1974, sender: 'System Operations', recipient: 'All Staff', title: 'Transition to Compact Cassette Inventory', body: 'Please move all Reel-to-Reel tape stock to Aisle B-04. Cassette displays take primary window frontage.', priority: 'NORMAL', scope: 'TEAM' },
  { id: 103, year: 1980, sender: 'Board of Directors', recipient: 'All Staff', title: 'Happy Independence & Currency Transition Notice', body: 'Celebrating the new era of Zimbabwe! All retail price tags switch to ZWD starting Monday.', priority: 'IMPORTANT', scope: 'BROADCAST' },
  { id: 104, year: 1995, sender: 'IT Department', recipient: 'Warehouse Staff', title: 'First Desktop Computer Installed!', body: 'Do NOT spill tea on the IBM PS/2 unit in the manager office. Digital stocktaking trial begins today.', priority: 'URGENT', scope: 'TEAM' },
  { id: 105, year: 1999, sender: 'Systems Admin', recipient: 'All Staff', title: 'Y2K Bug System Audit Notice', body: 'All branch managers must back up diskettes to safe storage before midnight Dec 31, 1999.', priority: 'URGENT', scope: 'BROADCAST' },
  { id: 106, year: 2008, sender: 'Finance Department', recipient: 'Store Managers', title: 'Daily Price Re-denomination Update', body: 'Due to hyperinflation, please multiply all price stickers by 100,000 starting 08:00 tomorrow.', priority: 'URGENT', scope: 'BROADCAST' },
  { id: 107, year: 2009, sender: 'Executive Office', recipient: 'All Staff', title: 'Switch to Multi-Currency USD / ZAR', body: 'ZWD paper currency retired. POS registers now accept US Dollars and SA Rand cash drawers.', priority: 'IMPORTANT', scope: 'BROADCAST' },
  { id: 108, year: 2015, sender: 'Funny Accidental Broadcast', recipient: 'All Staff', title: 'Accidental Notice: Who left their lunch in Aisle A-02?', body: 'Whoever left a braai pack in the mainframe server rack room, please remove it immediately.', priority: 'NORMAL', scope: 'BROADCAST' },
  { id: 109, year: 2024, sender: 'Taa (App Admin)', recipient: 'All Staff', title: 'ZiG Currency & EcoCash Mobile Surcharge Update', body: 'Managers may set custom EcoCash and Card surcharges in store settings. ZiG currency fully supported.', priority: 'IMPORTANT', scope: 'BROADCAST' },
  { id: 110, year: 2026, sender: 'System Engine', recipient: 'Harare Main & Bulawayo Branch', title: 'Inter-Branch Stock Transfer Request #TR-2026-0041', body: 'Bulawayo Branch requested 20 units of USB-C 65W Chargers from Harare Warehouse.', priority: 'IMPORTANT', scope: 'INDIVIDUAL' }
];
