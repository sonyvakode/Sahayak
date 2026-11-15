import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const dbPath = process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), 'sahayakshg.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export interface ActivityLedgerInput {
  actorUserId: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  entityType: string;
  entityId: string;
  summary: string;
  details?: Record<string, unknown>;
}

export function appendLedgerEntry(entry: ActivityLedgerInput): void {
  const id = `LED-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  db.prepare(`
    INSERT INTO activity_ledger (
      id, actor_user_id, actor_name, actor_role, action_type,
      entity_type, entity_id, summary, details_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.actorUserId,
    entry.actorName,
    entry.actorRole,
    entry.actionType,
    entry.entityType,
    entry.entityId,
    entry.summary,
    JSON.stringify(entry.details ?? {}),
    new Date().toISOString()
  );
}

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      village TEXT NOT NULL,
      district TEXT NOT NULL,
      state TEXT NOT NULL,
      default_language TEXT NOT NULL DEFAULT 'te',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('leader', 'member')),
      preferred_language TEXT NOT NULL DEFAULT 'te',
      is_demo INTEGER NOT NULL DEFAULT 1,
      pin_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      skills TEXT NOT NULL,
      daily_capacity INTEGER NOT NULL DEFAULT 15,
      past_workload INTEGER NOT NULL DEFAULT 0,
      availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'limited', 'unavailable')),
      preferred_language TEXT NOT NULL DEFAULT 'te',
      consent_given INTEGER NOT NULL DEFAULT 1,
      consent_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pieces',
      default_labor_hours REAL NOT NULL DEFAULT 0.4,
      description TEXT NOT NULL,
      sample_image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES groups(id),
      product_id TEXT REFERENCES products(id),
      product_name TEXT NOT NULL,
      buyer_name TEXT NOT NULL DEFAULT 'District Craft Co-op',
      quantity INTEGER NOT NULL,
      deadline_days INTEGER NOT NULL,
      remaining_days INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN (
        'intake_review', 'pricing_pending', 'allocation_pending',
        'in_progress', 'quality_review', 'payout_pending', 'completed'
      )),
      raw_voice_transcript TEXT,
      intake_language TEXT NOT NULL DEFAULT 'en',
      intake_confidence REAL DEFAULT 0.95,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pricing_records (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      material_cost REAL NOT NULL,
      labor_hours REAL NOT NULL,
      labor_rate_per_hour REAL NOT NULL,
      labor_cost REAL NOT NULL,
      overhead_cost REAL NOT NULL,
      profit_margin_pct REAL NOT NULL,
      total_production_cost REAL NOT NULL,
      suggested_selling_price REAL NOT NULL,
      expected_profit REAL NOT NULL,
      price_per_unit REAL NOT NULL,
      worker_rate_per_piece REAL NOT NULL,
      ai_explanation TEXT,
      is_demo_sample INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('proposed', 'approved')),
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_allocations (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      suggested_qty INTEGER NOT NULL,
      allocated_qty INTEGER NOT NULL,
      ai_reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('suggested', 'approved')),
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(order_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      allocation_id TEXT NOT NULL REFERENCES work_allocations(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      title TEXT NOT NULL,
      instructions_en TEXT NOT NULL,
      instructions_te TEXT NOT NULL,
      instructions_hi TEXT NOT NULL,
      instructions_kn TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS production_updates (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      allocation_id TEXT NOT NULL REFERENCES work_allocations(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      quantity_reported INTEGER NOT NULL,
      update_mode TEXT NOT NULL CHECK (update_mode IN ('tap', 'voice', 'leader_entry')),
      notes TEXT,
      client_offline_id TEXT UNIQUE,
      sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('saved_locally', 'pending_sync', 'synced')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quality_inspections (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      allocation_id TEXT NOT NULL REFERENCES work_allocations(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      inspected_qty INTEGER NOT NULL,
      accepted_qty INTEGER NOT NULL,
      rework_qty INTEGER NOT NULL,
      notes TEXT,
      sample_photo_url TEXT,
      decision_by TEXT NOT NULL REFERENCES users(id),
      decided_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      accepted_pieces INTEGER NOT NULL,
      rate_per_piece REAL NOT NULL,
      gross_earnings REAL NOT NULL,
      approval_status TEXT NOT NULL CHECK (approval_status IN ('pending_group_approval', 'approved_by_group')),
      transfer_status TEXT NOT NULL DEFAULT 'awaiting_payment_rail' CHECK (transfer_status IN ('awaiting_payment_rail', 'bank_confirmed')),
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(order_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS audio_summaries (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      order_id TEXT NOT NULL REFERENCES orders(id),
      language TEXT NOT NULL,
      script_text TEXT NOT NULL,
      audio_provider TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_ledger (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedDemoDataIfEmpty();
}

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(`sahayakshg:${pin}`).digest('hex');
}

function seedDemoDataIfEmpty(): void {
  const existingGroup = db.prepare('SELECT id FROM groups LIMIT 1').get();
  if (existingGroup) return;

  const now = new Date().toISOString();
  const future20 = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const future14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const past5 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const insertTx = db.transaction(() => {
    // 1. Group
    db.prepare(`
      INSERT INTO groups (id, name, village, district, state, default_language, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SHG-001',
      'Saraswati Mahila SHG',
      'Dharmavaram Cluster',
      'Anantapur',
      'Andhra Pradesh',
      'te',
      now
    );

    // 2. Demo Users (Leader + 4 Members)
    const demoPin = hashPin('1234');
    const users = [
      { id: 'USR-LEADER-01', name: 'Kavitha Rao', phone: '9876500001', role: 'leader', lang: 'te' },
      { id: 'USR-MEM-01', name: 'Anjali Devi', phone: '9876500002', role: 'member', lang: 'te' },
      { id: 'USR-MEM-02', name: 'Lakshmi N.', phone: '9876500003', role: 'member', lang: 'kn' },
      { id: 'USR-MEM-03', name: 'Meena Kumari', phone: '9876500004', role: 'member', lang: 'hi' },
      { id: 'USR-MEM-04', name: 'Rani Bai', phone: '9876500005', role: 'member', lang: 'te' },
    ];

    for (const u of users) {
      db.prepare(`
        INSERT INTO users (id, group_id, name, phone, role, preferred_language, is_demo, pin_hash, created_at)
        VALUES (?, 'SHG-001', ?, ?, ?, ?, 1, ?, ?)
      `).run(u.id, u.name, u.phone, u.role, u.lang, demoPin, now);
    }

    // 3. Members
    const members = [
      {
        id: 'MEM-01',
        userId: 'USR-MEM-01',
        name: 'Anjali Devi',
        skills: 'Cotton stitching, Handle reinforcement, Quality finishing',
        dailyCapacity: 15,
        pastWorkload: 420,
        availability: 'available',
        lang: 'te',
      },
      {
        id: 'MEM-02',
        userId: 'USR-MEM-02',
        name: 'Lakshmi N.',
        skills: 'Cotton stitching, Overlock seam, Jute weaving',
        dailyCapacity: 14,
        pastWorkload: 390,
        availability: 'available',
        lang: 'kn',
      },
      {
        id: 'MEM-03',
        userId: 'USR-MEM-03',
        name: 'Meena Kumari',
        skills: 'Cotton cutting, Pouch drawstring, Straight stitch',
        dailyCapacity: 13,
        pastWorkload: 350,
        availability: 'available',
        lang: 'hi',
      },
      {
        id: 'MEM-04',
        userId: 'USR-MEM-04',
        name: 'Rani Bai',
        skills: 'Cotton stitching, Block print prep, Packaging',
        dailyCapacity: 14,
        pastWorkload: 405,
        availability: 'available',
        lang: 'te',
      },
    ];

    for (const m of members) {
      db.prepare(`
        INSERT INTO members (
          id, group_id, user_id, name, skills, daily_capacity, past_workload,
          availability, preferred_language, consent_given, consent_updated_at, created_at
        ) VALUES (?, 'SHG-001', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(m.id, m.userId, m.name, m.skills, m.dailyCapacity, m.pastWorkload, m.availability, m.lang, now, now);
    }

    // 4. Products
    db.prepare(`
      INSERT INTO products (id, name, unit, default_labor_hours, description, sample_image_url)
      VALUES
        ('PRD-01', 'Cotton Bags', 'bags', 0.35, 'Natural unbleached 12oz cotton tote bags with reinforced cross-stitch handles', '/src/assets/images/cotton_bag_sample_1794753304422.jpg'),
        ('PRD-02', 'Handwoven Jute Pouches', 'pouches', 0.3, 'Eco-friendly drawstring jute gift pouches with double lock seam', '/src/assets/images/jute_pouch_sample_1794753305911.jpg')
    `).run();

    // 5. Orders — Flagship Demo Order ORD-2026-0012 + Supporting Orders
    db.prepare(`
      INSERT INTO orders (
        id, group_id, product_id, product_name, buyer_name, quantity, deadline_days,
        remaining_days, due_date, status, raw_voice_transcript, intake_language,
        intake_confidence, created_by, created_at, updated_at
      ) VALUES
        (
          'ORD-2026-0012', 'SHG-001', 'PRD-01', 'Cotton Bags', 'GreenHaat Retail Co-op',
          500, 20, 6, ?, 'in_progress',
          'We need 500 cotton bags. Delivery required in 20 days.',
          'en', 0.98, 'USR-LEADER-01', ?, ?
        ),
        (
          'ORD-2026-0013', 'SHG-001', 'PRD-02', 'Handwoven Jute Pouches', 'Kisan Bazaar Hyderabad',
          200, 14, 14, ?, 'pricing_pending',
          'మాకు 200 జ్యూట్ పౌచ్‌లు కావాలి. 14 రోజుల్లో డెలివరీ ఇవ్వాలి.',
          'te', 0.96, 'USR-LEADER-01', ?, ?
        ),
        (
          'ORD-2026-0011', 'SHG-001', 'PRD-01', 'Cotton Bags', 'State Handloom Expo',
          240, 15, 0, ?, 'completed',
          '240 cotton bags for State Handloom Expo in 15 days.',
          'en', 0.97, 'USR-LEADER-01', ?, ?
        )
    `).run(future20, now, now, future14, now, now, past5, now, now);

    // 6. Pricing Records (Exact math for ORD-2026-0012: ₹25 worker piece rate, deterministic totals)
    db.prepare(`
      INSERT INTO pricing_records (
        id, order_id, material_cost, labor_hours, labor_rate_per_hour, labor_cost,
        overhead_cost, profit_margin_pct, total_production_cost, suggested_selling_price,
        expected_profit, price_per_unit, worker_rate_per_piece, ai_explanation,
        is_demo_sample, status, approved_by, approved_at, created_at
      ) VALUES
        (
          'PRC-0012', 'ORD-2026-0012', 11500, 250, 50, 12500, 2000, 20,
          26000, 31200, 5200, 62.4, 25,
          'Material (₹11,500) + Labor (₹12,500 at ₹25/piece across 500 bags) + Overheads (₹2,000) = ₹26,000 total cost. With a 20% SHG margin (₹5,200), suggested selling price is ₹31,200 (₹62.40/bag).',
          1, 'approved', 'USR-LEADER-01', ?, ?
        ),
        (
          'PRC-0011', 'ORD-2026-0011', 5400, 120, 50, 6000, 900, 20,
          12300, 14760, 2460, 61.5, 25,
          'Approved pricing for 240 cotton bags at ₹25/piece labor payout.',
          1, 'approved', 'USR-LEADER-01', ?, ?
        )
    `).run(now, now, now, now);

    // 7. Work Allocations for ORD-2026-0012 (125 bags each = 500)
    const allocs12 = [
      {
        id: 'ALC-0012-01',
        memberId: 'MEM-01',
        qty: 125,
        reason: 'Balanced equal share (25%) — High daily stitching capacity (15/day) and handle reinforcement skill.',
      },
      {
        id: 'ALC-0012-02',
        memberId: 'MEM-02',
        qty: 125,
        reason: 'Balanced equal share (25%) — Consistent overlock seam quality and 14/day capacity.',
      },
      {
        id: 'ALC-0012-03',
        memberId: 'MEM-03',
        qty: 125,
        reason: 'Balanced equal share (25%) — Lower recent workload (350 pcs) keeps group work fair.',
      },
      {
        id: 'ALC-0012-04',
        memberId: 'MEM-04',
        qty: 125,
        reason: 'Balanced equal share (25%) — Strong cotton stitching speed (14/day) and available schedule.',
      },
    ];

    for (const a of allocs12) {
      db.prepare(`
        INSERT INTO work_allocations (
          id, order_id, member_id, suggested_qty, allocated_qty, ai_reason,
          status, approved_by, approved_at, created_at, updated_at
        ) VALUES (?, 'ORD-2026-0012', ?, ?, ?, ?, 'approved', 'USR-LEADER-01', ?, ?, ?)
      `).run(a.id, a.memberId, a.qty, a.qty, a.reason, now, now, now);

      db.prepare(`
        INSERT INTO tasks (
          id, order_id, allocation_id, member_id, title,
          instructions_en, instructions_te, instructions_hi, instructions_kn,
          status, created_at
        ) VALUES (?, 'ORD-2026-0012', ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?)
      `).run(
        `TSK-${a.id}`,
        a.id,
        a.memberId,
        'Stitch 125 Cotton Bags (Reinforced Handles)',
        'Cut 12oz unbleached cotton panels, double-stitch side seams, and cross-stitch handle straps. Bundle in packs of 25.',
        '12oz కాటన్ వస్త్రాన్ని కట్ చేసి, పక్క కుట్లు డబుల్ స్టిచ్ చేయండి మరియు హ్యాండిల్స్‌కు క్రాస్ స్టిచ్ వేయండి. 25 బ్యాగుల చొప్పున కట్టండి.',
        '12oz सूती कपड़ा काटें, साइड की सिलाई दोहरी करें और हैंडल पर क्रॉस-सिलाई लगाएं। 25-25 बैग के बंडल बनाएं।',
        '12oz ಹತ್ತಿ ಬಟ್ಟೆಯನ್ನು ಕತ್ತರಿಸಿ, ಬದಿ ಹೊಲಿಗೆಯನ್ನು ಡಬಲ್ ಸ್ಟಿಚ್ ಮಾಡಿ ಮತ್ತು ಹ್ಯಾಂಡಲ್‌ಗೆ ಕ್ರಾಸ್ ಸ್ಟಿಚ್ ಹಾಕಿ. 25 ಚೀಲಗಳ ಬಂಡಲ್ ಮಾಡಿ.',
        now
      );
    }

    // 8. Production Updates for ORD-2026-0012 (100, 95, 90, 95 = 380 completed, 120 pending = 76%)
    const prodUpdates = [
      { id: 'PRD-UPD-01', allocId: 'ALC-0012-01', memberId: 'MEM-01', qty: 100, mode: 'voice', note: 'Batch 1 & 2 stitched with reinforced handles' },
      { id: 'PRD-UPD-02', allocId: 'ALC-0012-02', memberId: 'MEM-02', qty: 95, mode: 'tap', note: 'Completed 95 bags, seams checked' },
      { id: 'PRD-UPD-03', allocId: 'ALC-0012-03', memberId: 'MEM-03', qty: 90, mode: 'voice', note: 'Completed 90 bags; 35 remaining in progress' },
      { id: 'PRD-UPD-04', allocId: 'ALC-0012-04', memberId: 'MEM-04', qty: 95, mode: 'tap', note: '95 bags bundled for inspection' },
    ];

    for (const p of prodUpdates) {
      db.prepare(`
        INSERT INTO production_updates (
          id, order_id, allocation_id, member_id, quantity_reported,
          update_mode, notes, sync_status, created_at
        ) VALUES (?, 'ORD-2026-0012', ?, ?, ?, ?, ?, 'synced', ?)
      `).run(p.id, p.allocId, p.memberId, p.qty, p.mode, p.note, now);
    }

    // 9. Quality Inspections for ORD-2026-0012 (95, 90, 85, 90 accepted = 360; 5 each rework = 20)
    const inspections = [
      { id: 'QC-0012-01', allocId: 'ALC-0012-01', memberId: 'MEM-01', inspected: 100, accepted: 95, rework: 5, note: '5 handles need tighter cross-stitch' },
      { id: 'QC-0012-02', allocId: 'ALC-0012-02', memberId: 'MEM-02', inspected: 95, accepted: 90, rework: 5, note: '5 side seams need re-trimming' },
      { id: 'QC-0012-03', allocId: 'ALC-0012-03', memberId: 'MEM-03', inspected: 90, accepted: 85, rework: 5, note: '5 bags need bottom corner restitch' },
      { id: 'QC-0012-04', allocId: 'ALC-0012-04', memberId: 'MEM-04', inspected: 95, accepted: 90, rework: 5, note: '5 straps slightly uneven, minor rework' },
    ];

    for (const q of inspections) {
      db.prepare(`
        INSERT INTO quality_inspections (
          id, order_id, allocation_id, member_id, inspected_qty, accepted_qty,
          rework_qty, notes, sample_photo_url, decision_by, decided_at
        ) VALUES (?, 'ORD-2026-0012', ?, ?, ?, ?, ?, ?, '/src/assets/images/cotton_bag_sample_1794753304422.jpg', 'USR-LEADER-01', ?)
      `).run(q.id, q.allocId, q.memberId, q.inspected, q.accepted, q.rework, q.note, now);
    }

    // 10. Payouts for ORD-2026-0012 (95*25=2375, 90*25=2250, 85*25=2125, 90*25=2250 -> Total ₹9,000, pending group approval)
    const payouts12 = [
      { id: 'PAY-0012-01', memberId: 'MEM-01', accepted: 95, rate: 25, gross: 2375 },
      { id: 'PAY-0012-02', memberId: 'MEM-02', accepted: 90, rate: 25, gross: 2250 },
      { id: 'PAY-0012-03', memberId: 'MEM-03', accepted: 85, rate: 25, gross: 2125 },
      { id: 'PAY-0012-04', memberId: 'MEM-04', accepted: 90, rate: 25, gross: 2250 },
    ];

    for (const pay of payouts12) {
      db.prepare(`
        INSERT INTO payouts (
          id, order_id, member_id, accepted_pieces, rate_per_piece, gross_earnings,
          approval_status, transfer_status, created_at
        ) VALUES (?, 'ORD-2026-0012', ?, ?, ?, ?, 'pending_group_approval', 'awaiting_payment_rail', ?)
      `).run(pay.id, pay.memberId, pay.accepted, pay.rate, pay.gross, now);
    }

    // Historical approved payouts for completed order ORD-2026-0011 (240 pieces * ₹25 = ₹6,000)
    const payouts11 = [
      { id: 'PAY-0011-01', memberId: 'MEM-01', accepted: 60, rate: 25, gross: 1500 },
      { id: 'PAY-0011-02', memberId: 'MEM-02', accepted: 60, rate: 25, gross: 1500 },
      { id: 'PAY-0011-03', memberId: 'MEM-03', accepted: 60, rate: 25, gross: 1500 },
      { id: 'PAY-0011-04', memberId: 'MEM-04', accepted: 60, rate: 25, gross: 1500 },
    ];
    for (const pay of payouts11) {
      db.prepare(`
        INSERT INTO work_allocations (
          id, order_id, member_id, suggested_qty, allocated_qty, ai_reason,
          status, approved_by, approved_at, created_at, updated_at
        ) VALUES (?, 'ORD-2026-0011', ?, 60, 60, 'Equal batch split across all 4 members', 'approved', 'USR-LEADER-01', ?, ?, ?)
      `).run(`ALC-0011-${pay.memberId.slice(-2)}`, pay.memberId, now, now, now);

      db.prepare(`
        INSERT INTO payouts (
          id, order_id, member_id, accepted_pieces, rate_per_piece, gross_earnings,
          approval_status, transfer_status, approved_by, approved_at, created_at
        ) VALUES (?, 'ORD-2026-0011', ?, ?, ?, ?, 'approved_by_group', 'awaiting_payment_rail', 'USR-LEADER-01', ?, ?)
      `).run(pay.id, pay.memberId, pay.accepted, pay.rate, pay.gross, now, now);
    }

    // 11. Append-only Activity Ledger entries
    appendLedgerEntry({
      actorUserId: 'USR-LEADER-01',
      actorName: 'Kavitha Rao',
      actorRole: 'leader',
      actionType: 'ORDER_CREATED',
      entityType: 'order',
      entityId: 'ORD-2026-0012',
      summary: 'Created order ORD-2026-0012 for 500 Cotton Bags (20-day deadline) via Voice Intake.',
    });
    appendLedgerEntry({
      actorUserId: 'USR-LEADER-01',
      actorName: 'Kavitha Rao',
      actorRole: 'leader',
      actionType: 'PRICING_APPROVED',
      entityType: 'pricing',
      entityId: 'PRC-0012',
      summary: 'Approved deterministic pricing for ORD-2026-0012: ₹62.40/unit selling price, ₹25/piece member rate.',
    });
    appendLedgerEntry({
      actorUserId: 'USR-LEADER-01',
      actorName: 'Kavitha Rao',
      actorRole: 'leader',
      actionType: 'ALLOCATION_APPROVED',
      entityType: 'allocation',
      entityId: 'ORD-2026-0012',
      summary: 'Approved fair work allocation of 125 bags each for Anjali Devi, Lakshmi N., Meena Kumari, and Rani Bai.',
    });
    appendLedgerEntry({
      actorUserId: 'USR-LEADER-01',
      actorName: 'Kavitha Rao',
      actorRole: 'leader',
      actionType: 'QUALITY_INSPECTED',
      entityType: 'quality',
      entityId: 'ORD-2026-0012',
      summary: 'Recorded quality inspection for 380 completed bags: 360 accepted, 20 marked for rework.',
    });
  });

  insertTx();
}
