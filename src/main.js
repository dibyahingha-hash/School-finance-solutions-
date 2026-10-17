/**
 * DHK PM POSHAN & School CashBook Pro
 * Module: src/main.js
 * 
 * Main Application Orchestrator & State Coordinator
 * - Wires UI tabs, Daily Desk, Stock Almirah, Cash Book Almirah, and Classified Ledgers
 * - Orchestrates Backup/Restore, WhatsApp audit exports, and AI inspection packages
 * - Manages multi-drawer state and renders physical Legal layout via copyHud
 */

import { storage } from './storage.js';
import { accountingEngine } from './accounting-engine.js';
import { copyHud } from './copy-hud.js';
import { MonthlyForm } from './monthly-form.js';
import { udiseResolver } from './udise-resolver.js';

class AppController {
  constructor() {
    this.currentDrawer = 'mdm';
    this.currentCompiledLedger = null;
    this.monthlyForm = null;
    this.init();
  }

  async init() {
    // 1. Expose global handles for inline HTML event bindings
    window.app = this;
    window.copyHud = copyHud;

    // 2. Initialize School Profile Header & Form
    this.loadActiveProfile();

    // 3. Setup Navigation Tabs
    this.initNavigationTabs();

    // 4. Setup Stock Almirah Financial Year Selectors & Listeners
    this.initStockAlmirah();

    // 5. Setup Restore File Listener
    this.initRestoreListener();

    // 6. Initialize Monthly Form Controller
    this.monthlyForm = new MonthlyForm((compiledLedger) => {
      this.handleLedgerCompiled(compiledLedger);
    });
    window.monthlyForm = this.monthlyForm;

    // Set today's date in Daily Desk
    const dailyDateInput = document.getElementById('daily-date');
    if (dailyDateInput) {
      dailyDateInput.value = new Date().toISOString().slice(0, 10);
    }
  }

  // ----------------------------------------------------------------
  // PROFILE & UI SETUP
  // ----------------------------------------------------------------
  loadActiveProfile() {
    const profile = storage.getProfile() || {
      udise: '18150301501',
      schoolName: '79 BETONI LP',
      category: 'LP',
      block: 'KHOWANG',
      district: 'DIBRUGARH'
    };

    const topName = document.getElementById('top-school-name');
    const topSub = document.getElementById('top-school-sub');
    if (topName) topName.textContent = profile.schoolName;
    if (topSub) topSub.textContent = `UDISE: ${profile.udise} | BLOCK: ${profile.block}/${profile.district}`;

    // Fill Setup Tab Fields
    const sUdise = document.getElementById('setup-udise');
    const sName = document.getElementById('setup-name');
    const sCat = document.getElementById('setup-category');
    const sBlock = document.getElementById('setup-block');
    const sDist = document.getElementById('setup-district');

    if (sUdise) sUdise.value = profile.udise || '';
    if (sName) sName.value = profile.schoolName || '';
    if (sCat) sCat.value = profile.category || 'LP';
    if (sBlock) sBlock.value = profile.block || '';
    if (sDist) sDist.value = profile.district || '';
  }

  saveSchoolProfile() {
    const profileData = {
      udise: document.getElementById('setup-udise')?.value,
      schoolName: document.getElementById('setup-name')?.value,
      category: document.getElementById('setup-category')?.value,
      block: document.getElementById('setup-block')?.value,
      district: document.getElementById('setup-district')?.value
    };

    try {
      udiseResolver.saveManualProfile(profileData);
      this.loadActiveProfile();
      alert('✅ School institutional profile successfully updated.');
    } catch (err) {
      alert('⚠️ ' + err.message);
    }
  }

  // ----------------------------------------------------------------
  // NAVIGATION & DRAWER SWITCHING
  // ----------------------------------------------------------------
  initNavigationTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        if (targetId === 'tab-stock') {
          this.refreshStockAlmirahView();
        }
      });
    });
  }

  switchDrawer(drawerName) {
    this.currentDrawer = drawerName;
    document.querySelectorAll('.drawer-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('onclick')?.includes(drawerName)) {
        btn.classList.add('active');
      }
    });

    if (this.monthlyForm) {
      this.monthlyForm.setDrawer(drawerName);
    }
  }

  // ----------------------------------------------------------------
  // DAILY ATTENDANCE DESK
  // ----------------------------------------------------------------
  recordDaily() {
    const dateStr = document.getElementById('daily-date')?.value;
    const status = document.getElementById('daily-status')?.value;
    const lpMeals = parseInt(document.getElementById('daily-lp-meals')?.value, 10) || 0;
    const upMeals = parseInt(document.getElementById('daily-up-meals')?.value, 10) || 0;

    if (!dateStr) {
      alert('Please select a valid date.');
      return;
    }

    storage.saveDailyAttendance(dateStr, {
      status,
      mealsLP: lpMeals,
      mealsUP: upMeals,
      totalMeals: lpMeals + upMeals
    });

    alert(`✅ Recorded attendance for ${dateStr}: ${lpMeals + upMeals} meals logged.`);
  }

  // ----------------------------------------------------------------
  // MDM STOCK ALMIRAH
  // ----------------------------------------------------------------
  initStockAlmirah() {
    const stockFy = document.getElementById('stock-sel-fy');
    if (!stockFy) return;

    const currentYear = new Date().getFullYear();
    stockFy.innerHTML = '';
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      const opt = document.createElement('option');
      opt.value = `${y}`;
      opt.textContent = `FY ${y}-${(y + 1).toString().slice(-2)}`;
      if (y === currentYear) opt.selected = true;
      stockFy.appendChild(opt);
    }

    const stockMonth = document.getElementById('stock-sel-month');
    [stockFy, stockMonth].forEach(el => {
      if (el) el.addEventListener('change', () => this.refreshStockAlmirahView());
    });

    // Dynamic Grain & Cooking Cost Balance recalculators
    const grainInputs = ['stock-grain-ob', 'stock-grain-rcvd', 'stock-grain-consumed'];
    grainInputs.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.calculateStockBalances());
    });

    const costInputs = ['stock-cost-ob', 'stock-cost-rcvd', 'stock-cost-spent'];
    costInputs.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.calculateStockBalances());
    });
  }

  refreshStockAlmirahView() {
    const y = document.getElementById('stock-sel-fy')?.value || '2026';
    const m = document.getElementById('stock-sel-month')?.value || '09';

    // Auto-pull aggregates from Daily Attendance Desk for this month
    const agg = storage.getMonthlyAttendanceAggregates(y, m);
    const profile = storage.getProfile();
    const isUp = profile?.category === 'UP';

    // Grain consumption: LP = 100g (0.1kg), UP = 150g (0.15kg)
    const grainConsumedKg = (agg.totalMealsLP * 0.1) + (agg.totalMealsUP * 0.15);

    const grainConsumedEl = document.getElementById('stock-grain-consumed');
    if (grainConsumedEl && (!grainConsumedEl.value || grainConsumedEl.value === '0')) {
      grainConsumedEl.value = grainConsumedKg.toFixed(2);
    }

    this.calculateStockBalances();
  }

  calculateStockBalances() {
    // Grain Balances
    const gOb = parseFloat(document.getElementById('stock-grain-ob')?.value) || 0;
    const gRcvd = parseFloat(document.getElementById('stock-grain-rcvd')?.value) || 0;
    const gSpent = parseFloat(document.getElementById('stock-grain-consumed')?.value) || 0;
    const gClosing = Math.round((gOb + gRcvd - gSpent) * 100) / 100;

    const dispGrain = document.getElementById('disp-grain-closing');
    if (dispGrain) {
      dispGrain.textContent = gClosing.toFixed(2);
      dispGrain.style.color = gClosing < 0 ? '#dc2626' : '#1e3a8a';
    }

    // Financial Cooking Cost Balances
    const cOb = parseFloat(document.getElementById('stock-cost-ob')?.value) || 0;
    const cRcvd = parseFloat(document.getElementById('stock-cost-rcvd')?.value) || 0;
    const cSpent = parseFloat(document.getElementById('stock-cost-spent')?.value) || 0;
    const cClosing = Math.round((cOb + cRcvd - cSpent) * 100) / 100;

    const dispCost = document.getElementById('disp-cost-closing');
    const containerCost = document.getElementById('disp-cost-closing-container');
    if (dispCost && containerCost) {
      dispCost.textContent = cClosing.toFixed(2);
      if (cClosing < 0) {
        containerCost.style.color = '#dc2626';
        dispCost.innerHTML = `${cClosing.toFixed(2)} <span style="font-size:0.75rem; background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; margin-left:6px;">DEFICIT (Folio 8 Advance)</span>`;
      } else {
        containerCost.style.color = '#15803d';
      }
    }
  }

  // ----------------------------------------------------------------
  // CASH BOOK COMPILATION & LEDGER RENDERER
  // ----------------------------------------------------------------
  handleLedgerCompiled(compiledLedger) {
    this.currentCompiledLedger = compiledLedger;
    const profile = storage.getProfile();

    const periodMeta = {
      monthNum: compiledLedger.cleanMonthNum,
      monthText: compiledLedger.monthText,
      yearText: compiledLedger.yearText
    };

    // Render physical 2-page Legal cash book HUD
    copyHud.render(compiledLedger, profile, periodMeta);

    // Render General Classified Ledger Book
    this.renderClassifiedLedgers(compiledLedger);

    // Scroll smoothly down to the physical book preview
    const hudEl = document.getElementById('hud-container');
    if (hudEl) {
      hudEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  renderClassifiedLedgers(compiledLedger) {
    const container = document.getElementById('classified-ledgers-container');
    if (!container) return;

    const ledgers = accountingEngine.generateClassifiedLedgers(compiledLedger);

    let html = '<div style="display:flex; flex-direction:column; gap:20px;">';

    Object.keys(ledgers).forEach(folioKey => {
      const acct = ledgers[folioKey];
      if (acct.rows.length === 0) return;

      let rowsHtml = '';
      let balance = 0;

      acct.rows.forEach(r => {
        balance += (r.debit - r.credit);
        rowsHtml += `
          <tr style="border-bottom: 1px solid #cbd5e1; font-size: 0.8rem;">
            <td style="padding: 6px; text-align: center;">${r.date}</td>
            <td style="padding: 6px;">${r.particulars}</td>
            <td style="padding: 6px; text-align: center;">${r.cbRef}</td>
            <td style="padding: 6px; text-align: right;">${r.debit > 0 ? r.debit.toFixed(2) : '-'}</td>
            <td style="padding: 6px; text-align: right;">${r.credit > 0 ? r.credit.toFixed(2) : '-'}</td>
            <td style="padding: 6px; text-align: right; font-weight: 700;">${balance.toFixed(2)}</td>
          </tr>
        `;
      });

      html += `
        <div style="border: 1.5px solid #334155; border-radius: 6px; padding: 12px; background: #fffdfa;">
          <div style="font-weight: 800; font-size: 0.95rem; margin-bottom: 8px; color: #1e3a8a; border-bottom: 1px solid #94a3b8; padding-bottom: 4px;">
            FOLIO ${acct.folio}: ${acct.title.toUpperCase()}
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e2e8f0; font-size: 0.75rem; text-align: center;">
                <th style="padding: 6px; width: 12%;">Date</th>
                <th style="padding: 6px; width: 48%; text-align: left;">Particulars & Voucher Narration</th>
                <th style="padding: 6px; width: 10%;">CB Ref</th>
                <th style="padding: 6px; width: 10%;">Debit (₹)</th>
                <th style="padding: 6px; width: 10%;">Credit (₹)</th>
                <th style="padding: 6px; width: 10%;">Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  // ----------------------------------------------------------------
  // BACKUP & RESTORE
  // ----------------------------------------------------------------
  triggerBackup() {
    storage.exportFullBackup();
  }

  initRestoreListener() {
    const fileInput = document.getElementById('file-restore-input');
    if (!fileInput) return;

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        await storage.importBackupFile(file);
        alert('✅ Full state restore complete. Reloading application...');
        window.location.reload();
      } catch (err) {
        alert('⚠️ Restore Failed: ' + err.message);
      }
    });
  }

  // ----------------------------------------------------------------
  // WHATSAPP SHARE & AI INSPECTION PACKAGE EXPORT
  // ----------------------------------------------------------------
  shareWhatsApp() {
    if (!this.currentCompiledLedger) {
      alert('Please compile a cash book month first before sharing.');
      return;
    }

    const t = this.currentCompiledLedger.totals;
    const p = storage.getProfile();
    const period = `${this.currentCompiledLedger.monthText} ${this.currentCompiledLedger.yearText}`;

    const text = 
`*STATUTORY CASH BOOK AUDIT REPORT*
*School:* ${p?.schoolName || 'School'} (UDISE: ${p?.udise || '--'})
*Accounting Period:* ${period}
*Drawer:* ${this.currentDrawer.toUpperCase()}

📊 *FINANCIAL SUMMARY:*
• Opening Balance: Cash ₹${t.opCash.toFixed(2)} | Bank ₹${t.opBank.toFixed(2)}
• Total Receipts (T/R): Cash ₹${t.trCash.toFixed(2)} | Bank ₹${t.trBank.toFixed(2)}
• Total Payments (T/P): Cash ₹${t.tpCash.toFixed(2)} | Bank ₹${t.tpBank.toFixed(2)}
• Closing Balance (C/B): Cash ₹${t.closingCash.toFixed(2)} | Bank ₹${t.closingBank.toFixed(2)}
• Grand Total (G/T): ₹${t.gtReceiptTotal.toFixed(2)}

✅ *AUDIT SHIELD:*
Double-Entry Parity: ${this.currentCompiledLedger.auditShield.isAuditReady ? 'PASSED (Zero Discrepancy)' : 'NEEDS ATTENTION'}
_Compiled via DHK PM POSHAN & School CashBook Pro_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  exportAiAuditPackage() {
    if (!this.currentCompiledLedger) {
      alert('Please compile a cash book month first to generate an AI audit package.');
      return;
    }

    const profile = storage.getProfile();
    const payload = {
      meta: {
        generator: 'DHK PM POSHAN Pro Audit Gateway',
        generatedAt: new Date().toISOString(),
        institution: profile,
        period: {
          month: this.currentCompiledLedger.monthText,
          year: this.currentCompiledLedger.yearText,
          drawer: this.currentDrawer
        }
      },
      auditShieldVerification: this.currentCompiledLedger.auditShield,
      doubleEntryTotals: this.currentCompiledLedger.totals,
      receiptLedger: this.currentCompiledLedger.receipts,
      paymentLedger: this.currentCompiledLedger.payments
    };

    const str = JSON.stringify(payload, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_AUDIT_PACKAGE_${profile?.udise || 'SCHOOL'}_${this.currentCompiledLedger.monthText}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Instantiate on startup
window.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
