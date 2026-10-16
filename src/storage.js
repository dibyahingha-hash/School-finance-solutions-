/**
 * Offline-First IndexedDB Storage Layer with Automatic Month Forwarding
 */

const DB_NAME = 'PoshanCashBookDB';
const DB_VERSION = 1;
const STORE_NAME = 'records';

class StorageAdapter {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  getStorageKey(udise, drawer, year, month) {
    const m = String(month).padStart(2, '0');
    return `cashbook_rec_${udise}_${drawer}_${year}_${m}`;
  }

  async getRecord(udise, drawer, year, month) {
    await this.init();
    const key = this.getStorageKey(udise, drawer, year, month);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.payload : null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveRecord(udise, drawer, year, month, payload) {
    await this.init();
    const key = this.getStorageKey(udise, drawer, year, month);
    
    // Save current month
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ key, payload, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });

    // Automatically carry forward closing balance to Month N+1 (from your legacy engine)
    let nextM = parseInt(month, 10) + 1;
    let nextY = parseInt(year, 10);
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }

    const nextRecord = (await this.getRecord(udise, drawer, nextY, nextM)) || {};
    nextRecord.opCash = payload.closeCash;
    nextRecord.opBank = payload.closeBank;

    const nextKey = this.getStorageKey(udise, drawer, nextY, nextM);
    await new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ key: nextKey, payload: nextRecord, updatedAt: new Date().toISOString() });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });

    return true;
  }

  async getPreviousClosing(udise, drawer, year, month) {
    let prevM = parseInt(month, 10) - 1;
    let prevY = parseInt(year, 10);
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const prevRec = await this.getRecord(udise, drawer, prevY, prevM);
    if (prevRec && prevRec.closeCash !== undefined) {
      return {
        opCash: prevRec.closeCash,
        opBank: prevRec.closeBank
      };
    }
    return null;
  }
}

export const storage = new StorageAdapter();

