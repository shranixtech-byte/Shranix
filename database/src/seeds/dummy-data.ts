/**
 * 🌱 DUMMY DATA SEED — Customers, Pesticides, Fertilizers
 *
 * Add to package.json scripts:
 *   "db:seed:dummy": "tsx src/seeds/dummy-data.ts"
 *
 * Usage: cd database && npx tsx src/seeds/dummy-data.ts
 */

import { loadDatabaseConfig } from '../config/index';
import { createDatabaseClient, closeDatabaseClient, getRawClient } from '../client/index';
import * as crypto from 'node:crypto';

const now = new Date().toISOString();
function uid() { return crypto.randomUUID(); }

// ═════════════════════════════════════════════════════════
// 1. CUSTOMERS (ग्राहक)
// ═════════════════════════════════════════════════════════
const customers = [
  { name: 'राम किसान फार्म', code: 'CUST-001', gstin: '27AAACK1234A1Z1', pan: 'ABCDE1234F', contactPerson: 'राम सिंह', mobile: '9876543210', email: 'ram@kisanfarm.com', address: 'ग्राम पंचायत, तहसील रोड', city: 'नागपुर', state: 'महाराष्ट्र', pin: '440001', creditLimit: 500000, creditDays: 30 },
  { name: 'शिवाजी एग्री प्रोड्यूसर्स', code: 'CUST-002', gstin: '27BBBCK5678A1Z1', pan: 'FGHIJ5678K', contactPerson: 'शिवाजी पाटिल', mobile: '9876543211', email: 'shivaji@agri.com', address: 'शिवाजी चौक, मुख्य रोड', city: 'पुणे', state: 'महाराष्ट्र', pin: '411001', creditLimit: 350000, creditDays: 45 },
  { name: 'ग्रीन फील्ड्स एग्रो', code: 'CUST-003', gstin: '27CCCDK9012A1Z1', pan: 'KLMNO9012P', contactPerson: 'सुरेश कुमार', mobile: '9876543212', email: 'suresh@greenfields.com', address: 'सेक्टर 5, एमआईडीसी', city: 'औरंगाबाद', state: 'महाराष्ट्र', pin: '431001', creditLimit: 250000, creditDays: 30 },
  { name: 'कृष्णा फर्टिलाइजर्स', code: 'CUST-004', gstin: '27DDDDL3456A1Z1', pan: 'PQRST3456R', contactPerson: 'कृष्णा राव', mobile: '9876543213', email: 'krishna@fertilizers.com', address: 'इंडस्ट्रियल एरिया, फेज 2', city: 'कोल्हापुर', state: 'महाराष्ट्र', pin: '416001', creditLimit: 400000, creditDays: 60 },
  { name: 'आदित्य बायोटेक', code: 'CUST-005', gstin: '27EEEEE7890A1Z1', pan: 'UVWXY7890S', contactPerson: 'आदित्य शर्मा', mobile: '9876543214', email: 'aditya@biotech.com', address: 'बायोटेक पार्क, फेज 1', city: 'अकोला', state: 'महाराष्ट्र', pin: '444001', creditLimit: 180000, creditDays: 30 },
  { name: 'महाराष्ट्र क्रॉप केयर', code: 'CUST-006', gstin: '27FFFFF1234A1Z1', pan: 'ABCDG1234H', contactPerson: 'विजय पवार', mobile: '9876543215', email: 'vijay@cropcare.com', address: 'ग्राम दापोली, तालुका मुळशी', city: 'सातारा', state: 'महाराष्ट्र', pin: '412801', creditLimit: 300000, creditDays: 45 },
  { name: 'प्रगतिशील किसान संघ', code: 'CUST-007', gstin: '27GGGGG5678A1Z1', pan: 'MNOPQ5678T', contactPerson: 'गणेश भोसले', mobile: '9876543216', email: 'ganesh@pragatishil.com', address: 'एपीएमसी मार्केट, यार्ड', city: 'नाशिक', state: 'महाराष्ट्र', pin: '422001', creditLimit: 600000, creditDays: 30 },
  { name: 'हरित उद्यान फार्म', code: 'CUST-008', gstin: '27HHHHH9012A1Z1', pan: 'RSTUV9012W', contactPerson: 'हरि ओझा', mobile: '9876543217', email: 'hari@haritfarm.com', address: 'उद्यान नगर, तालुका पेन', city: 'रायगड', state: 'महाराष्ट्र', pin: '402107', creditLimit: 220000, creditDays: 30 },
  { name: 'साई फीड्स & फर्टिलाइजर्स', code: 'CUST-009', gstin: '27IIIII3456A1Z1', pan: 'ZABCD3456Y', contactPerson: 'साई प्रसाद', mobile: '9876543218', email: 'sai@feeds.com', address: 'मार्केट यार्ड, नंबर 1', city: 'लातूर', state: 'महाराष्ट्र', pin: '413512', creditLimit: 275000, creditDays: 30 },
  { name: 'आर्यन एग्री ट्रेडर्स', code: 'CUST-010', gstin: '27JJJJJ7890A1Z1', pan: 'EFGHI7890Z', contactPerson: 'आर्यन जोशी', mobile: '9876543219', email: 'aryan@agritrade.com', address: 'व्यापार केंद्र, बस स्टैंड रोड', city: 'सोलापूर', state: 'महाराष्ट्र', pin: '413001', creditLimit: 450000, creditDays: 60 },
];

// ═════════════════════════════════════════════════════════
// 2. PESTICIDES (कीटनाशक)
// ═════════════════════════════════════════════════════════
const pesticides = [
  { name: 'इमिडाक्लोप्रिड 17.8% SL', sku: 'PST-001', description: 'चूसक कीट नियंत्रण', hsnCode: '380891', purchaseRate: 450, salesRate: 550, mrp: 580 },
  { name: 'साइपरमेथ्रिन 25% EC', sku: 'PST-002', description: 'पत्ती खाने वाले कीट नियंत्रण', hsnCode: '380891', purchaseRate: 380, salesRate: 480, mrp: 520 },
  { name: 'प्रोफेनोफॉस 50% EC', sku: 'PST-003', description: 'कीटनाशक – व्यापक स्पेक्ट्रम', hsnCode: '380891', purchaseRate: 520, salesRate: 650, mrp: 690 },
  { name: 'मोनोक्रोटोफॉस 36% SL', sku: 'PST-004', description: 'कीटनाशक, मृदा उपचार', hsnCode: '380891', purchaseRate: 300, salesRate: 390, mrp: 420 },
  { name: 'कार्बेंडाजिम 50% WP', sku: 'PST-005', description: 'फफूंदनाशक, बीज उपचार', hsnCode: '380892', purchaseRate: 280, salesRate: 360, mrp: 400 },
  { name: 'मैन्कोजेब 75% WP', sku: 'PST-006', description: 'फफूंदनाशक – पत्ती रोग', hsnCode: '380892', purchaseRate: 320, salesRate: 410, mrp: 450 },
  { name: 'ग्लायफोसेट 41% SL', sku: 'PST-007', description: 'खरपतवारनाशक', hsnCode: '380893', purchaseRate: 250, salesRate: 340, mrp: 370 },
  { name: '2,4-D सोडियम सॉल्ट 80% WP', sku: 'PST-008', description: 'खरपतवारनाशक – चौड़ी पत्ती', hsnCode: '380893', purchaseRate: 200, salesRate: 280, mrp: 310 },
  { name: 'एबामेक्टिन 1.9% EC', sku: 'PST-009', description: 'कीटनाशक – माइट नियंत्रण', hsnCode: '380891', purchaseRate: 580, salesRate: 720, mrp: 770 },
  { name: 'थायरम 75% WS', sku: 'PST-010', description: 'बीज उपचार फफूंदनाशक', hsnCode: '380892', purchaseRate: 340, salesRate: 440, mrp: 480 },
];

// ═════════════════════════════════════════════════════════
// 3. NPK FERTILIZERS (NPK खाद/उर्वरक)
// ═════════════════════════════════════════════════════════
const fertilizers = [
  { name: 'यूरिया (46% N)', sku: 'FERT-001', description: 'नाइट्रोजन उर्वरक', hsnCode: '310210', purchaseRate: 1200, salesRate: 1500, mrp: 1600 },
  { name: 'डीएपी (18:46:0)', sku: 'FERT-002', description: 'डाय-अमोनियम फॉस्फेट', hsnCode: '310520', purchaseRate: 1350, salesRate: 1700, mrp: 1800 },
  { name: 'एमओपी (60% K2O)', sku: 'FERT-003', description: 'म्यूरेट ऑफ पोटाश', hsnCode: '310420', purchaseRate: 1100, salesRate: 1400, mrp: 1500 },
  { name: 'NPK 12:32:16', sku: 'FERT-004', description: 'जटिल उर्वरक', hsnCode: '310520', purchaseRate: 1450, salesRate: 1800, mrp: 1920 },
  { name: 'NPK 20:20:0', sku: 'FERT-005', description: 'समानुपातिक जटिल उर्वरक', hsnCode: '310520', purchaseRate: 1250, salesRate: 1580, mrp: 1690 },
  { name: 'एसएसपी (16% P2O5)', sku: 'FERT-006', description: 'सिंगल सुपर फॉस्फेट', hsnCode: '310310', purchaseRate: 650, salesRate: 850, mrp: 920 },
  { name: 'जिंक सल्फेट (21% Zn)', sku: 'FERT-007', description: 'सूक्ष्म पोषक उर्वरक', hsnCode: '382499', purchaseRate: 320, salesRate: 420, mrp: 460 },
  { name: 'फेरस सल्फेट (19% Fe)', sku: 'FERT-008', description: 'लौह सूक्ष्म पोषक', hsnCode: '382499', purchaseRate: 280, salesRate: 370, mrp: 400 },
  { name: 'बोरॉन ग्रेन्युल्स (10% B)', sku: 'FERT-009', description: 'बोरॉन उर्वरक', hsnCode: '382499', purchaseRate: 200, salesRate: 280, mrp: 310 },
  { name: 'NPK 19:19:19', sku: 'FERT-010', description: 'पूर्ण समानुपातिक जल में घुलनशील उर्वरक', hsnCode: '310520', purchaseRate: 1550, salesRate: 1950, mrp: 2080 },
];

// ═════════════════════════════════════════════════════════
// SEED
// ═════════════════════════════════════════════════════════
async function seed() {
  const config = loadDatabaseConfig();
  console.log(`🌱 SHRANIX KRUSHI ERP — Dummy Data Seeding`);
  console.log(`   DB: ${config.provider} @ ${config.url}`);
  console.log();

  createDatabaseClient(config);
  const rawClient = getRawClient(config);

  try {
    // ── Customers ──
    console.log('📋 Inserting 10 Customers (ग्राहक)...');
    let cCount = 0;
    for (const c of customers) {
      const id = uid();
      const notes = JSON.stringify({
        code: c.code, gstin: c.gstin, pan: c.pan, contactPerson: c.contactPerson,
        mobile: c.mobile, email: c.email, address: c.address, city: c.city,
        state: c.state, pin: c.pin, status: 'active', remarks: 'Dummy data for testing',
      });
      await rawClient.execute({
        sql: `INSERT OR IGNORE INTO shranix_ledger_master 
          (id, created_at, updated_at, is_deleted, account_id, ledger_type, party_id,
           opening_balance, opening_balance_type, current_balance,
           credit_limit, credit_days, is_active, notes)
          VALUES (?, ?, ?, 0, ?, 'customer', ?, 0, 'debit', 0, ?, ?, 1, ?)`,
        args: [id, now, now, c.code, c.name, c.creditLimit, c.creditDays, notes],
      });
      cCount++;
    }
    console.log(`   ✓ ${cCount} customers inserted`);

    // ── Pesticides ──
    console.log('🧪 Inserting 10 Pesticides (कीटनाशक)...');
    let pCount = 0;
    for (const p of pesticides) {
      const id = uid();
      await rawClient.execute({
        sql: `INSERT OR IGNORE INTO shranix_items 
          (id, created_at, updated_at, is_deleted, name, sku, type,
           description, hsn_code, purchase_rate, sales_rate, mrp,
           is_active, has_expiry, min_stock, current_stock, opening_stock)
          VALUES (?, ?, ?, 0, ?, ?, 'product', ?, ?, ?, ?, ?, 1, 1, 10, 0, 0)`,
        args: [id, now, now, p.name, p.sku, p.description, p.hsnCode, p.purchaseRate, p.salesRate, p.mrp],
      });
      pCount++;
    }
    console.log(`   ✓ ${pCount} pesticides inserted`);

    // ── Fertilizers ──
    console.log('🌾 Inserting 10 NPK Fertilizers (उर्वरक)...');
    let fCount = 0;
    for (const f of fertilizers) {
      const id = uid();
      await rawClient.execute({
        sql: `INSERT OR IGNORE INTO shranix_items 
          (id, created_at, updated_at, is_deleted, name, sku, type,
           description, hsn_code, purchase_rate, sales_rate, mrp,
           is_active, has_expiry, min_stock, current_stock, opening_stock)
          VALUES (?, ?, ?, 0, ?, ?, 'product', ?, ?, ?, ?, ?, 1, 1, 10, 0, 0)`,
        args: [id, now, now, f.name, f.sku, f.description, f.hsnCode, f.purchaseRate, f.salesRate, f.mrp],
      });
      fCount++;
    }
    console.log(`   ✓ ${fCount} fertilizers inserted`);

    console.log();
    console.log('========================================');
    console.log('✅ SEED COMPLETE:');
    console.log(`   ${cCount} Customers`);
    console.log(`   ${pCount} Pesticides`);
    console.log(`   ${fCount} NPK/Fertilizers`);
    console.log(`   ─────────────────────────`);
    console.log(`   ${cCount + pCount + fCount} TOTAL records`);
    console.log('========================================');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseClient(config);
  }
}

seed();
