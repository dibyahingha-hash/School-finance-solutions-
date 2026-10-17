/**
 * DHK PM POSHAN & School CashBook Pro
 * Module: src/monthly-form.js
 * 
 * Interactive Monthly Accounting Form & Live Voucher Tracker
 * - Synchronous Audit Shield: Front-and-center real-time voucher-to-ledger parity monitor
 * - Unbound Year/Month selector without rigid loops
 * - User-autonomous cooking cost entry with statutory rate advisory helpers
 * - Multi-drawer support: mdm, smc, sna
 * - Sub-voucher range tracking without text truncation
 */

import { storage } from './storage.js';
import { accountingEngine } from './accounting-engine.js';

export class MonthlyForm {
  constructor(onCompileCallback) {
    this.onCompileCallback = onCompileCallback;
    this.currentDrawer = 'mdm';
    this.currentVouchers = [];
    this.initDOMElements();
    this.populateYearOptions();
    this.bindEvents();
  }

  initDOMElements() {
    this.selFy = document.getElementById('sel-fy');
    this.selMonth = document.getElementById('sel-month');
    this.inpObCash = document.getElementById('inp-ob-cash');
    this.inpObBank = document.getElementById('inp-ob-bank');

    // PM POSHAN Section Elements
    this.secMdmParams = document.getElementById('sec-mdm-params');
    this.inpEnrolled = document.getElementById('inp-enrolled');
    this.inpDays = document.getElementById('inp-days');
    this.inpRate = document.getElementById('inp-rate');
    this.inpCookingCostOverride = document.getElementById('inp-cooking-cost-override');
    this.dispMandateInfo = document.getElementById('disp-mandate-info');
    this.inpVoucherNo = document.getElementById('inp-voucher-no');

    // Voucher List Container & Live Tally Shield
    this.voucherListContainer = document.getElementById('voucher-list-container');
    this.btnAddVoucher = document.getElementById('btn-add-voucher');
    this.liveAuditShieldContainer = document.getElementById('live-audit-shield');
    this.btnSaveCompile = document.getElementById('btn-save-compile');
  }

  /**
   * Generates dynamic financial year list (unbound 10-year span around current selection)
   */
  populateYearOptions() {
    if (!this.selFy) return;
    const currentYear = new Date().getFullYear();
    const selectedVal = this.selFy.value || `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    
    this.selFy.innerHTML = '';
    // Offer broad range from 5 years back to 5 years forward dynamically
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      const nextShort = (y + 1).toString().slice(-2);
      const fyText = `FY ${y}-${nextShort}`;
      const opt = document.createElement('option');
      opt.value = `${y}`;
      opt.textContent = fyText;
      if (`${y}` === selectedVal || fyText === selectedVal) {
        opt.selected = true;
      }
      this.selFy.appendChild(opt);
    }
  }

  bindEvents() {
    if (this.selFy) {
      this.selFy.addEventListener('change', () => this.loadActivePeriod());
    }
    if (this.selMonth) {
      this.selMonth.addEventListener('change', () => this.loadActivePeriod());
    }

    // Dynamic MDM Rate / Meal Recalculations
    [this.inpEnrolled, this.inpDays, this.inpRate].forEach(el => {
      if (el) {
        el.addEventListener('input', () => {
          this.updateMdmAdvisoryCalculations();
          this.evaluateLiveAuditShield();
        });
      }
    });

    if (this.inpCookingCostOverride) {
      this.inpCookingCostOverride.addEventListener('input', () => {
        this.evaluateLiveAuditShield();
      });
    }

    [this.inpObCash, this.inpObBank, this.inpVoucherNo].forEach(el => {
      if (el) {
        el.addEventListener('input', () => this.evaluateLiveAuditShield());
      }
    });

    if (this.btnAddVoucher) {
      this.btnAddVoucher.addEventListener('click', () => {
        this.addNewVoucherRow();
      });
    }

    if (this.btnSaveCompile) {
      this.btnSaveCompile.addEventListener('click', () => {
        this.saveAndCompile();
      });
    }
  }

  setDrawer(drawerName) {
    this.currentDrawer = drawerName;
    if (this.secMdmParams) {
      // Show PM POSHAN specific meal panel only in MDM drawer
      this.secMdmParams.style.display = (drawerName === 'mdm') ? 'block' : 'none';
    }
    this.loadActivePeriod();
  }

  updateMdmAdvisoryCalculations() {
    const enrolled = parseInt(this.inpEnrolled?.value, 10) || 0;
    const days = parseInt(this.inpDays?.value, 10) || 0;
    const rate = parseFloat(this.inpRate?.value) || 0;
    const totalMeals = enrolled * days;
    const mandateCost = Math.round((totalMeals * rate) * 100) / 100;

    if (this.dispMandateInfo) {
      this.dispMandateInfo.innerHTML = `
        <strong>Total Meals:</strong> ${totalMeals} | 
        <strong>Statutory Mandate Cost:</strong> ₹${mandateCost.toFixed(2)}
      `;
    }

    // If user has not explicitly typed an override, suggest mandate cost as placeholder
    if (this.inpCookingCostOverride && !this.inpCookingCostOverride.value) {
      this.inpCookingCostOverride.placeholder = mandateCost > 0 ? `Mandate: ₹${mandateCost.toFixed(2)}` : 'Enter cooking cost';
    }
  }

  addNewVoucherRow(voucherData = null) {
    const defaultData = voucherData || {
      type: 'contra_cash_withdrawal',
      voucherNo: `${this.currentVouchers.length + 1}`,
      amount: 0,
      particulars: '',
      folio: '',
      date: ''
    };

    this.currentVouchers.push(defaultData);
    this.renderVouchers();
    this.evaluateLiveAuditShield();
  }

  removeVoucher(index) {
    this.currentVouchers.splice(index, 1);
    this.renderVouchers();
    this.evaluateLiveAuditShield();
  }

  updateVoucher(index, field, value) {
    if (!this.currentVouchers[index]) return;
    this.currentVouchers[index][field] = value;
    this.evaluateLiveAuditShield();
  }

  renderVouchers() {
    if (!this.voucherListContainer) return;
    this.voucherListContainer.innerHTML = '';

    this.currentVouchers.forEach((v, i) => {
      const row = document.createElement('div');
      row.className = 'voucher-entry-row';
      row.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; padding:8px; border-radius:6px; margin-bottom:8px;';

      row.innerHTML = `
        <select class="form-control" style="flex:2; min-width:180px;" onchange="window.monthlyForm.updateVoucher(${i}, 'type', this.value)">
          <option value="contra_cash_withdrawal" ${v.type === 'contra_cash_withdrawal' ? 'selected' : ''}>Cash Withdrawn from Bank (Contra)</option>
          <option value="bank_credit" ${v.type === 'bank_credit' ? 'selected' : ''}>Fund / Grant Credit to Bank</option>
          <option value="cash_payment" ${v.type === 'cash_payment' ? 'selected' : ''}>General Cash Payment / Contingency</option>
          <option value="bank_payment" ${v.type === 'bank_payment' ? 'selected' : ''}>Bank Payment / Vendor Transfer</option>
        </select>

        <input type="text" class="form-control" style="flex:1; min-width:80px;" placeholder="Voucher/Ref #" value="${v.voucherNo || ''}" oninput="window.monthlyForm.updateVoucher(${i}, 'voucherNo', this.value)">

        <input type="number" step="0.01" class="form-control" style="flex:1; min-width:100px; text-align:right;" placeholder="Amount (₹)" value="${v.amount || ''}" oninput="window.monthlyForm.updateVoucher(${i}, 'amount', parseFloat(this.value) || 0)">

        <input type="text" class="form-control" style="flex:2; min-width:160px;" placeholder="Narration (optional)" value="${v.particulars || ''}" oninput="window.monthlyForm.updateVoucher(${i}, 'particulars', this.value)">

        <button type="button" style="background:#ef4444; color:#fff; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;" onclick="window.monthlyForm.removeVoucher(${i})">✕</button>
      `;

      this.voucherListContainer.appendChild(row);
    });
  }

  /**
   * Real-Time Synchronous Audit Shield
   * Instantly tests mathematical parity between vouchers and compiled totals
   */
  evaluateLiveAuditShield() {
    if (!this.liveAuditShieldContainer) return;

    const opCash = parseFloat(this.inpObCash?.value) || 0;
    const opBank = parseFloat(this.inpObBank?.value) || 0;
    const enrolled = parseInt(this.inpEnrolled?.value, 10) || 0;
    const days = parseInt(this.inpDays?.value, 10) || 0;
    const rate = parseFloat(this.inpRate?.value) || 0;
    const userCookingCost = this.inpCookingCostOverride?.value ? parseFloat(this.inpCookingCostOverride.value) : null;
    const voucherNo = this.inpVoucherNo?.value || '1';

    const cleanMonth = this.selMonth ? this.selMonth.value : '09';
    const yearText = this.selFy ? this.selFy.value : '2026';

    const testLedger = accountingEngine.computeLedger({
      monthNum: cleanMonth,
      yearText,
      opCash,
      opBank,
      enrolled,
      days,
      mealRate: rate,
      userCookingCost,
      voucherNo,
      vouchers: this.currentVouchers,
      drawer: this.currentDrawer
    });

    const shield = testLedger.auditShield;

    if (shield.isAuditReady) {
      this.liveAuditShieldContainer.innerHTML = `
        <div style="background:#ecfdf5; border:1.5px solid #10b981; color:#065f46; padding:10px 14px; border-radius:6px; font-size:0.85rem; font-weight:700; display:flex; align-items:center; gap:8px;">
          <span>✅</span>
          <div>
            <strong>AUDIT READY: Mathematical Parity Verified</strong>
            <div style="font-size:0.75rem; font-weight:500; color:#047857;">All vouchers, Folio C contras, and ledger columns balance to the exact paisa (Total Payments: ₹${shield.expectedExpenditureTotal.toFixed(2)}).</div>
          </div>
        </div>
      `;
      if (this.btnSaveCompile) this.btnSaveCompile.disabled = false;
    } else {
      let issues = shield.validationMessages.map(m => `<li>${m}</li>`).join('');
      this.liveAuditShieldContainer.innerHTML = `
        <div style="background:#fef2f2; border:1.5px solid #ef4444; color:#991b1b; padding:10px 14px; border-radius:6px; font-size:0.85rem; font-weight:700;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span>⚠️</span>
            <strong>AUDIT SHIELD: Discrepancy Detected</strong>
          </div>
          <ul style="margin:0; padding-left:20px; font-size:0.75rem; font-weight:500;">
            ${issues}
          </ul>
        </div>
      `;
    }

    return testLedger;
  }

  loadActivePeriod() {
    const y = this.selFy ? this.selFy.value : '2026';
    const m = this.selMonth ? this.selMonth.value : '09';

    const rec = storage.getRecord(this.currentDrawer, y, m);

    if (rec) {
      if (this.inpObCash) this.inpObCash.value = rec.opCash ?? 0;
      if (this.inpObBank) this.inpObBank.value = rec.opBank ?? 0;
      if (this.inpEnrolled) this.inpEnrolled.value = rec.enrolled ?? 0;
      if (this.inpDays) this.inpDays.value = rec.days ?? 0;
      if (this.inpRate) this.inpRate.value = rec.rate ?? 6.78;
      if (this.inpCookingCostOverride) this.inpCookingCostOverride.value = rec.userCookingCost ?? '';
      if (this.inpVoucherNo) this.inpVoucherNo.value = rec.voucherNo || '1';
      this.currentVouchers = Array.isArray(rec.vouchers) ? [...rec.vouchers] : [];
    } else {
      // Fresh record: check if previous month left a closing balance
      this.currentVouchers = [];
      if (this.inpEnrolled) this.inpEnrolled.value = 0;
      if (this.inpDays) this.inpDays.value = 0;
      if (this.inpCookingCostOverride) this.inpCookingCostOverride.value = '';
      if (this.inpVoucherNo) this.inpVoucherNo.value = '1';
    }

    this.updateMdmAdvisoryCalculations();
    this.renderVouchers();
    this.evaluateLiveAuditShield();
  }

  saveAndCompile() {
    const testLedger = this.evaluateLiveAuditShield();
    if (!testLedger) return;

    const y = this.selFy ? this.selFy.value : '2026';
    const m = this.selMonth ? this.selMonth.value : '09';

    const payload = {
      opCash: parseFloat(this.inpObCash?.value) || 0,
      opBank: parseFloat(this.inpObBank?.value) || 0,
      enrolled: parseInt(this.inpEnrolled?.value, 10) || 0,
      days: parseInt(this.inpDays?.value, 10) || 0,
      rate: parseFloat(this.inpRate?.value) || 6.78,
      userCookingCost: this.inpCookingCostOverride?.value ? parseFloat(this.inpCookingCostOverride.value) : null,
      voucherNo: this.inpVoucherNo?.value || '1',
      vouchers: this.currentVouchers
    };

    // Save with totals to trigger auto-carry-forward to next month
    storage.saveRecord(this.currentDrawer, y, m, payload, testLedger.totals);

    if (typeof this.onCompileCallback === 'function') {
      this.onCompileCallback(testLedger);
    }
  }
}
