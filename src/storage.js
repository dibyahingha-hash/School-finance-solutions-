/**
 * Isolated Local Storage Engine
 */

export class StorageEngine {
  constructor() {
    this.prefix = 'dhk_cb_record_';
  }

  _getKey(udise, drawer, year, month) {
    return `${this.prefix}${udise}_${drawer}_${year}_${month}`;
  }

  saveRecord(udise, drawer, year, month, data) {
    const key = this._getKey(udise, drawer, year, month);
    localStorage.setItem(key, JSON.stringify(data));
  }

  getRecord(udise, drawer, year, month) {
    const key = this._getKey(udise, drawer, year, month);
    try {
      const d = localStorage.getItem(key);
      return d ? JSON.parse(d) : null;
    } catch (_) {
      return null;
    }
  }
}

export const storage = new StorageEngine();
