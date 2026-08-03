/**
 * 🌱 DUMMY PRODUCTS SEED + SCHEMA SYNC (live dev.db)
 *
 * Fixes two root causes found during print-test prep:
 *   1. Live shranix_items table is on an OLD schema (missing short_name,
 *      status, manufacturer, ... columns) → /inventory/items 500s with
 *      "no such column: short_name".
 *   2. shranix_warehouse_stock table does not exist at all.
 *
 * Also seeds GST rates, units, a main warehouse, ~14 dummy agri products
 * (pesticides + fertilizers, with real company/manufacturer names) and
 * warehouse stock rows so the invoice product search + print show data.
 *
 * Usage: cd database && node seed-dummy-products.mjs
 * Targets: ../data/dev.db (root live DB used by the backend).
 */
import { createClient } from '@libsql/client';
import * as crypto from 'node:crypto';

const DB_URL = 'file:../data/dev.db';
const uid = () => crypto.randomUUID();
const now = new Date().toISOString();

const client = createClient({ url: DB_URL });

async function run(sql, args = []) {
  await client.execute({ sql, args });
}

async function query(sql, args = []) {
  const r = await client.execute({ sql, args });
  return r.rows;
}

async function tableColumns(table) {
  const rows = await query(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}

async function countRows(table) {
  try {
    const rows = await query(`SELECT COUNT(*) AS cnt FROM ${table}`);
    return Number(rows[0].cnt);
  } catch {
    return -1;
  }
}

async function main() {
  console.log('🌱 SHRANIX KRUSHI ERP — Dummy Products Seed');
  console.log(`   DB: ${DB_URL}`);
  console.log('');

  // ═══════════════ 1. SCHEMA SYNC — shranix_items ═══════════════
  const itemCols = await tableColumns('shranix_items');
  const itemSchemaAdditions = [
    ['short_name', 'TEXT'],
    ['status', "TEXT NOT NULL DEFAULT 'active'"],
    ['manufacturer', 'TEXT'],
    ['manufacturer_code', 'TEXT'],
    ['purchase_unit_id', 'TEXT'],
    ['sales_unit_id', 'TEXT'],
    ['stock_unit_id', 'TEXT'],
    ['length', 'REAL'],
    ['width', 'REAL'],
    ['height', 'REAL'],
    ['volume', 'REAL'],
    ['volume_unit', 'TEXT'],
    ['shelf_life', 'TEXT'],
    ['seasonal', 'INTEGER NOT NULL DEFAULT 0'],
    ['organic', 'INTEGER NOT NULL DEFAULT 0'],
    ['crop_season', 'TEXT'],
    ['variety', 'TEXT'],
  ];
  let added = 0;
  for (const [col, def] of itemSchemaAdditions) {
    if (!itemCols.includes(col)) {
      await run(`ALTER TABLE shranix_items ADD COLUMN ${col} ${def}`);
      added++;
    }
  }
  console.log(`🗃️  shranix_items schema: ${added} columns added (${itemCols.length} → ${itemCols.length + added})`);

  // ═══════════════ 2. SCHEMA SYNC — shranix_warehouse_stock ═══════════════
  const whStockExists = (await countRows('shranix_warehouse_stock')) >= 0;
  if (!whStockExists) {
    await run(`CREATE TABLE IF NOT EXISTS shranix_warehouse_stock (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      item_id TEXT NOT NULL,
      variant_id TEXT,
      batch_id TEXT,
      batch_no TEXT,
      warehouse_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      reserved_quantity REAL NOT NULL DEFAULT 0
    )`);
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS warehouse_stock_idx ON shranix_warehouse_stock (warehouse_id, item_id)`);
    console.log('🏭 shranix_warehouse_stock table created');
  } else {
    console.log('🏭 shranix_warehouse_stock table exists');
  }

  // ═══════════════ 2b. SCHEMA SYNC — shranix_warehouses ═══════════════
  const whCols = await tableColumns('shranix_warehouses');
  const whSchemaAdditions = [
    ['warehouse_type', "TEXT NOT NULL DEFAULT 'storage'"],
    ['district', 'TEXT'],
    ['pincode', 'TEXT'],
    ['contact_person', 'TEXT'],
    ['mobile', 'TEXT'],
    ['email', 'TEXT'],
    ['gstin', 'TEXT'],
    ['remarks', 'TEXT'],
  ];
  let whAdded = 0;
  for (const [col, def] of whSchemaAdditions) {
    if (!whCols.includes(col)) {
      await run(`ALTER TABLE shranix_warehouses ADD COLUMN ${col} ${def}`);
      whAdded++;
    }
  }
  if (whAdded > 0) {console.log(`🏬 shranix_warehouses schema: ${whAdded} columns added`);}

  // ═══════════════ 3. SEED — GST Rates ═══════════════
  const gstCount = await countRows('shranix_gst_rates');
  const gstIds = {};
  if (gstCount <= 0) {
    const rates = [
      { name: 'GST 0%', rate: 0 }, { name: 'GST 5%', rate: 5 },
      { name: 'GST 12%', rate: 12 }, { name: 'GST 18%', rate: 18 },
      { name: 'GST 28%', rate: 28 },
    ];
    for (const g of rates) {
      const id = uid();
      gstIds[g.rate] = id;
      await run(`INSERT INTO shranix_gst_rates
        (id, created_at, updated_at, is_deleted, name, description, rate, type,
         igst, cgst, sgst, cess, is_active, is_default, effective_from, hsn_sac_code)
        VALUES (?, ?, ?, 0, ?, ?, ?, 'gst', ?, ?, ?, 0, 1, 0, ?, NULL)`,
        [id, now, now, g.name, `${g.name} standard`, g.rate, g.rate, g.rate / 2, g.rate / 2, now]);
    }
    console.log(`💲 GST rates seeded: ${rates.length}`);
  } else {
    const rows = await query('SELECT id, rate FROM shranix_gst_rates');
    for (const r of rows) { gstIds[Number(r.rate)] = r.id; }
    console.log(`💲 GST rates already present: ${gstCount}`);
  }
  const gst18 = gstIds[18] || Object.values(gstIds)[0];
  const gst5 = gstIds[5] || gst18;
  const gst12 = gstIds[12] || gst18;

  // ═══════════════ 4. SEED — Units ═══════════════
  const unitCount = await countRows('shranix_units');
  const unitIds = {};
  if (unitCount <= 0) {
    const units = [
      { name: 'नग', short: 'PCS' }, { name: 'किलो', short: 'KG' },
      { name: 'लीटर', short: 'LTR' }, { name: 'बोरी', short: 'BAG' },
      { name: 'डिब्बा', short: 'BOX' }, { name: 'बोतल', short: 'BTL' },
    ];
    for (const u of units) {
      const id = uid();
      unitIds[u.short] = id;
      await run(`INSERT INTO shranix_units
        (id, created_at, updated_at, is_deleted, name, short_name, type, is_active)
        VALUES (?, ?, ?, 0, ?, ?, 'standard', 1)`,
        [id, now, now, u.name, u.short]);
    }
    console.log(`📦 Units seeded: ${units.length}`);
  } else {
    const rows = await query('SELECT id, short_name FROM shranix_units');
    for (const r of rows) { unitIds[r.short_name] = r.id; }
    console.log(`📦 Units already present: ${unitCount}`);
  }
  const unitPcs = unitIds['PCS'] || Object.values(unitIds)[0];
  const unitKg = unitIds['KG'] || unitPcs;
  const unitLtr = unitIds['LTR'] || unitPcs;
  const unitBag = unitIds['BAG'] || unitPcs;

  // ═══════════════ 5. SEED — Warehouse ═══════════════
  const whCount = await countRows('shranix_warehouses');
  let mainWhId;
  if (whCount <= 0) {
    mainWhId = uid();
    await run(`INSERT INTO shranix_warehouses
      (id, created_at, updated_at, is_deleted, name, code, address, city, state,
       phone, is_active, is_main, branch_id, company_id)
      VALUES (?, ?, ?, 0, 'मुख्य गोदाम', 'WH-MAIN', 'मुख्य मार्केट यार्ड', 'नागपूर', 'महाराष्ट्र',
              '9876543210', 1, 1, NULL, NULL)`,
      [mainWhId, now, now]);
    console.log('🏬 Main warehouse seeded');
  } else {
    const rows = await query('SELECT id FROM shranix_warehouses WHERE is_main = 1 LIMIT 1');
    mainWhId = rows[0]?.id || (await query('SELECT id FROM shranix_warehouses LIMIT 1'))[0].id;
    console.log(`🏬 Warehouse already present: ${whCount}`);
  }

  // ═══════════════ 6. SEED — Products ═══════════════
  const itemCount = await countRows('shranix_items');
  const products = [
    // ── Pesticides (कीटनाशक) — GST 18% ──
    { name: 'इमिडाक्लोप्रिड 17.8% SL', sku: 'PST-001', company: 'UPL', hsn: '380891', unit: unitLtr, gst: gst18, p: 450, s: 550, m: 580, desc: 'चूसक कीट नियंत्रण' },
    { name: 'साइपरमेथ्रिन 25% EC', sku: 'PST-002', company: 'Syngenta', hsn: '380891', unit: unitLtr, gst: gst18, p: 380, s: 480, m: 520, desc: 'पत्ती खाने वाले कीट नियंत्रण' },
    { name: 'प्रोफेनोफॉस 50% EC', sku: 'PST-003', company: 'Bayer CropScience', hsn: '380891', unit: unitLtr, gst: gst18, p: 520, s: 650, m: 690, desc: 'कीटनाशक – व्यापक स्पेक्ट्रम' },
    { name: 'मोनोक्रोटोफॉस 36% SL', sku: 'PST-004', company: 'Dhanuka Agritech', hsn: '380891', unit: unitLtr, gst: gst18, p: 300, s: 390, m: 420, desc: 'कीटनाशक, मृदा उपचार' },
    { name: 'कार्बेंडाजिम 50% WP', sku: 'PST-005', company: 'Rallis India', hsn: '380892', unit: unitPcs, gst: gst18, p: 280, s: 360, m: 400, desc: 'फफूंदनाशक, बीज उपचार' },
    { name: 'मैन्कोजेब 75% WP', sku: 'PST-006', company: 'UPL', hsn: '380892', unit: unitPcs, gst: gst18, p: 320, s: 410, m: 450, desc: 'फफूंदनाशक – पत्ती रोग' },
    { name: 'ग्लायफोसेट 41% SL', sku: 'PST-007', company: 'PI Industries', hsn: '380893', unit: unitLtr, gst: gst18, p: 250, s: 340, m: 370, desc: 'खरपतवारनाशक' },
    { name: 'एबामेक्टिन 1.9% EC', sku: 'PST-009', company: 'Syngenta', hsn: '380891', unit: unitLtr, gst: gst18, p: 580, s: 720, m: 770, desc: 'कीटनाशक – माइट नियंत्रण' },
    // ── Fertilizers (खाद/उर्वरक) — GST 5% ──
    { name: 'यूरिया (46% N)', sku: 'FERT-001', company: 'IFFCO', hsn: '310210', unit: unitBag, gst: gst5, p: 1200, s: 1500, m: 1600, desc: 'नाइट्रोजन उर्वरक' },
    { name: 'डीएपी (18:46:0)', sku: 'FERT-002', company: 'IFFCO', hsn: '310520', unit: unitBag, gst: gst5, p: 1350, s: 1700, m: 1800, desc: 'डाय-अमोनियम फॉस्फेट' },
    { name: 'एमओपी (60% K2O)', sku: 'FERT-003', company: 'Coromandel', hsn: '310420', unit: unitBag, gst: gst5, p: 1100, s: 1400, m: 1500, desc: 'म्यूरेट ऑफ पोटाश' },
    { name: 'NPK 12:32:16', sku: 'FERT-004', company: 'Tata Chemicals', hsn: '310520', unit: unitBag, gst: gst5, p: 1450, s: 1800, m: 1920, desc: 'जटिल उर्वरक' },
    { name: 'NPK 19:19:19 (WSF)', sku: 'FERT-010', company: 'Godrej Agrovet', hsn: '310520', unit: unitKg, gst: gst5, p: 1550, s: 1950, m: 2080, desc: 'पूर्ण समानुपातिक जल में घुलनशील उर्वरक' },
    { name: 'जिंक सल्फेट (21% Zn)', sku: 'FERT-007', company: 'Dhanuka Agritech', hsn: '382499', unit: unitKg, gst: gst12, p: 320, s: 420, m: 460, desc: 'सूक्ष्म पोषक उर्वरक' },
  ];

  if (itemCount <= 0) {
    for (const pr of products) {
      const id = uid();
      await run(`INSERT OR IGNORE INTO shranix_items
        (id, created_at, updated_at, is_deleted, name, short_name, sku, type, status,
         description, manufacturer, unit_id, gst_rate_id, hsn_code,
         purchase_rate, sales_rate, mrp, min_stock, max_stock, reorder_level,
         opening_stock, current_stock, is_active, has_batch, has_serial, has_expiry,
         is_taxable, tax_preference, weight, weight_unit, notes)
        VALUES (?, ?, ?, 0, ?, ?, ?, 'product', 'active', ?, ?, ?, ?, ?,
                ?, ?, ?, 10, 1000, 10, ?, ?, 1, 0, 0, 0, 1, 'taxable', 1, 'KG', NULL)`,
        [id, now, now, pr.name, pr.name, pr.sku, pr.desc, pr.company, pr.unit,
         pr.gst, pr.hsn, pr.p, pr.s, pr.m, pr.s, pr.s, null]);
      const stockQty = 100 + Math.floor(Math.random() * 400);
      await run(`INSERT OR IGNORE INTO shranix_warehouse_stock
        (id, created_at, updated_at, item_id, warehouse_id, quantity, reserved_quantity)
        VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [uid(), now, now, id, mainWhId, stockQty]);
    }
    console.log(`🌾 Products seeded: ${products.length}`);
  } else {
    console.log(`🌾 Products already present: ${itemCount} — skipping`);
  }

  console.log('');
  console.log('========================================');
  console.log('✅ SEED COMPLETE');
  console.log(`   Items: ${itemCount > 0 ? itemCount : products.length}`);
  console.log(`   GST rates: ${gstCount > 0 ? gstCount : 5}`);
  console.log(`   Units: ${unitCount > 0 ? unitCount : 6}`);
  console.log(`   Warehouse: ${whCount > 0 ? whCount : 1}`);
  console.log('========================================');

  const finalItems = await countRows('shranix_items');
  const finalStock = await countRows('shranix_warehouse_stock');
  console.log(`VERIFY → items=${finalItems}, warehouse_stock=${finalStock}`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => client.close());
