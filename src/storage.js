/**
 * DHK PM POSHAN & School CashBook Pro
 * Module: src/storage.js
 * 
 * Persistent Storage & Forward Balance Propagation Engine
 * - Isolated namespaces across 3 Drawers: mdm, smc, sna
 * - Automatic Month-to-Month Carry-Forward (Closing -> Opening)
 * - Flexible Digitization Start-Month Baseline
 * - Daily Attendance Desk persistent store
 * - Complete Database Backup & Restore facility
 */

export class StorageEngine {
  constructor() {
    this.ROOT_KEY = 'dhk_app_data';
    this.PROFILE_KEY = 'dhk_anchored_profile';
    this.MONTH_ORDER = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03'];
    this._ensureStructure();
  }

  _ensureStructure() {
    if (!localStorage.getItem(this.ROOT_KEY)) {
      const initialStore = {
        meta: {
          version: '3.0.0',
          lastModified: new Date().toISOString()
        },
        drawers: {
          mdm: { records: {}, baseline: null },
          smc: { records: {}, baseline: null },
          sna: { records: {}, baseline: null }
        },
        dailyAttendance: {}, // Keyed by YYYY-MM-DD
        stockRegister: {
          foodGrain: {}, // Keyed by YYYY_MM
          cookingCost: {}
        }
      };
      localStorage.setItem(this.ROOT_KEY, JSON.stringify(initialStore));
    }
  }

  _getStore() {
    try {
      const raw = localStorage.getItem(this.ROOT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Storage Read Error:', err);
      return null;
    }
  }

  _saveStore(data) {
    data.meta.lastModified = new Date().toISOString();
    localStorage.setItem(this.ROOT_KEY, JSON.stringify(data));
  }

  // -------------------------------------------------------------
  // SCHOOL PROFILE MANAGEMENT
  // -------------------------------------------------------------
  getProfile() {
    try {
      const p = localStorage.getItem(this.PROFILE_KEY);
      return p ? JSON.parse(p) : null;
    } catch (_) {
      return null;
    }
  }

  saveProfile(profile) {
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
  }

  resetAllData() {
    localStorage.removeItem(this.ROOT_KEY);
    localStorage.removeItem(this.PROFILE_KEY);
    this._ensureStructure();
  }

  // -------------------------------------------------------------
  // MONTHLY CASH BOOK RECORDS & PROPAGATION
  // -------------------------------------------------------------
  _recordKey(year, month) {
    return `${year}_${String(month).padStart(2, '0')}`;
  }

  getRecord(drawer, year, month) {
    const store = this._getStore();
    if (!store || !store.drawers[drawer]) return null;
    const k = this._recordKey(year, month);
    return store.drawers[drawer].records[k] || null;
  }

  /**
   * Save a month's record and automatically trigger forward balance carry-forward
   */
  saveRecord(drawer, year, month, payload, totals) {
    const store = this._getStore();
    if (!store) return false;

    if (!store.drawers[drawer]) {
      store.drawers[drawer] = { records: {}, baseline: null };
    }

    const cleanMonth = String(month).padStart(2, '0');
    const k = this._recordKey(year, cleanMonth);

    // Save current record
    store.drawers[drawer].records[k] = {
      ...payload,
      totals: totals || null,
      updatedAt: new Date().toISOString()
    };

    // If no baseline is established, mark this as user-digitization start month
    if (!store.drawers[drawer].baseline) {
      store.drawers[drawer].baseline = { year, month: cleanMonth };
    }

    // Auto-propagate closing balances to the next chronological month
    if (totals && typeof totals.closingCash === 'number' && typeof totals.closingBank === 'number') {
      this._propagateNextMonth(store, drawer, year, cleanMonth, totals.closingCash, totals.closingBank);
    }

    this._saveStore(store);
    return true;
  }

  /**
   * Helper: Propagate closing cash & bank to the next month's opening balance
   */
  _propagateNextMonth(store, drawer, currentYear, currentMonth, closingCash, closingBank) {
    const curIdx = this.MONTH_ORDER.indexOf(currentMonth);
    if (curIdx === -1) return;

    let nextMonth = '';
    let nextYear = currentYear;

    if (curIdx === 11) {
      // March -> April of next FY
      nextMonth = '04';
      nextYear = String(parseInt(currentYear, 10) + 1);
    } else {
      nextMonth = this.MONTH_ORDER[curIdx + 1];
      if (nextMonth === '01') {
        // December to January increments calendar year if tracked that way
        nextYear = String(parseInt(currentYear, 10) + 1);
      }
    }

    const nextK = this._recordKey(nextYear, nextMonth);
    if (!store.drawers[drawer].records[nextK]) {
      // Initialize next month with propagated balances
      store.drawers[drawer].records[nextK] = {
        opCash: closingCash,
        opBank: closingBank,
        enrolled: 0,
        days: 0,
        rate: 6.78,
        voucherNo: '1',
        vouchers: []
      };
    } else {
      // Update opening balances of already existing record
      store.drawers[drawer].records[nextK].opCash = closingCash;
      store.drawers[drawer].records[nextK].opBank = closingBank;
    }
  }

  // -------------------------------------------------------------
  // DAILY ATTENDANCE DESK (MDM)
  // -------------------------------------------------------------
  saveDailyAttendance(dateStr, data) {
    const store = this._getStore();
    if (!store) return false;
    store.dailyAttendance[dateStr] = {
      ...data,
      loggedAt: new Date().toISOString()
    };
    this._saveStore(store);
    return true;
  }

  getDailyAttendance(dateStr) {
    const store = this._getStore();
    return (store && store.dailyAttendance[dateStr]) ? store.dailyAttendance[dateStr] : null;
  }

  getMonthlyAttendanceAggregates(year, month) {
    const store = this._getStore();
    if (!store) return { totalMealsLP: 0, totalMealsUP: 0, totalMealsAll: 0, cookingDays: 0 };

    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    let lp = 0;
    let up = 0;
    let days = 0;

    Object.keys(store.dailyAttendance).forEach((d) => {
      if (d.startsWith(prefix)) {
        const item = store.dailyAttendance[d];
        if (item.status === 'open') {
          const l = parseInt(item.mealsLP, 10) || 0;
          const u = parseInt(item.mealsUP, 10) || 0;
          if (l > 0 || u > 0) {
            lp += l;
            up += u;
            days += 1;
          }
        }
      }
    });

    return {
      totalMealsLP: lp,
      totalMealsUP: up,
      totalMealsAll: lp + up,
      cookingDays: days
    };
  }

  // -------------------------------------------------------------
  // BACKUP & RESTORE FACILITY (ONE-TAP JSON)
  // -------------------------------------------------------------
  exportFullBackup() {
    const store = this._getStore();
    const profile = this.getProfile();
    const backupObj = {
      schemaVersion: '3.0.0',
      exportedAt: new Date().toISOString(),
      schoolProfile: profile,
      dataStore: store
    };

    const str = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const udise = profile?.udise || 'SCHOOL';
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `CASHBOOK_BACKUP_${udise}_${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importBackupFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.dataStore || !parsed.schemaVersion) {
            return reject(new Error('Invalid CashBook backup JSON structure'));
          }

          // Restore Profile
          if (parsed.schoolProfile) {
            localStorage.setItem(this.PROFILE_KEY, JSON.stringify(parsed.schoolProfile));
          }

          // Restore Core Store
          localStorage.setItem(this.ROOT_KEY, JSON.stringify(parsed.dataStore));
          resolve(true);
        } catch (err) {
          reject(new Error('Failed to parse backup JSON: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read backup file'));
      reader.readAsText(file);
    });
  }
}

export const storage = new StorageEngine();
