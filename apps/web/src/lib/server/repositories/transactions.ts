import { getDb } from "../db";
import type { Tx, TxStatus } from "@/lib/data";

export interface TransactionRecord extends Tx {
  note?: string;
  created_at?: string;
}

export const TransactionsRepo = {
  getAll(filter?: { search?: string; cat?: string; status?: string; limit?: number; offset?: number }): TransactionRecord[] {
    const db = getDb();
    let query = "SELECT id, name, memo, cat, date, amt, status, method, note, created_at FROM transactions WHERE 1=1";
    const params: any[] = [];

    if (filter?.search) {
      query += " AND (name LIKE ? OR memo LIKE ? OR id LIKE ?)";
      const s = `%${filter.search}%`;
      params.push(s, s, s);
    }
    if (filter?.cat && filter.cat !== "All categories") {
      query += " AND cat = ?";
      params.push(filter.cat);
    }
    if (filter?.status && filter.status !== "All") {
      query += " AND status = ?";
      params.push(filter.status);
    }

    query += " ORDER BY date DESC, id DESC";

    if (filter?.limit) {
      query += " LIMIT ?";
      params.push(filter.limit);
      if (filter?.offset) {
        query += " OFFSET ?";
        params.push(filter.offset);
      }
    }

    const rows = db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      memo: r.memo,
      cat: r.cat,
      date: r.date,
      amt: Number(r.amt),
      status: r.status as TxStatus,
      method: r.method,
      note: r.note || undefined,
      created_at: r.created_at,
    }));
  },

  getById(id: string): TransactionRecord | null {
    const db = getDb();
    const r = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      memo: r.memo,
      cat: r.cat,
      date: r.date,
      amt: Number(r.amt),
      status: r.status as TxStatus,
      method: r.method,
      note: r.note || undefined,
      created_at: r.created_at,
    };
  },

  create(data: Omit<TransactionRecord, "id"> & { id?: string }): TransactionRecord {
    const db = getDb();
    const id = data.id || `TX-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO transactions (id, name, memo, cat, date, amt, status, method, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.memo,
      data.cat,
      data.date,
      data.amt,
      data.status || "Cleared",
      data.method || "Other",
      data.note || null,
      now
    );

    return this.getById(id)!;
  },

  update(id: string, patch: Partial<TransactionRecord>): TransactionRecord | null {
    const db = getDb();
    const current = this.getById(id);
    if (!current) return null;

    const updated = { ...current, ...patch };
    db.prepare(`
      UPDATE transactions
      SET name = ?, memo = ?, cat = ?, date = ?, amt = ?, status = ?, method = ?, note = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.memo,
      updated.cat,
      updated.date,
      updated.amt,
      updated.status,
      updated.method,
      updated.note || null,
      id
    );

    return this.getById(id);
  },

  delete(id: string): boolean {
    const db = getDb();
    const res = db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
    return res.changes > 0;
  },
};
