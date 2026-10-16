/**
 * Monthly Form Controller & Voucher State
 */

import { storage } from './storage.js';

export class MonthlyForm {
  constructor() {
    this.currentDrawer = 'mdm';
    this.activeSchoolMeta = null;
    this.currentVouchers = [
      { type: 'contra_cash_withdrawal', amount: 500, date: '30/09/26', folio: 'C' }
    ];

    this.selFy = document.getElementById('sel-fy');
    this.selMonth = document.getElementById('sel-month');
    this.inpEnrolled = document.getElementById('inp-enrolled');
    this.inpDays = document.getElementById('inp-days');
    this.inpRate = document.getElementById('inp-rate');
    this.inpObCash = document.getElementById('inp-ob-cash');
    this.inpObBank = document.getElementById('inp-ob-bank');
    this.lblMeals = document.getElementById('lbl-total-meals');
    this.lblMandate = document.getElementById('lbl-mandate-cost');
    this.voucherContainer = document.getElementById('voucher-list');

    this._bindEvents();
  }

  _bindEvents() {
    // Drawer buttons
    document.querySelectorAll('.drawer-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.drawer-btn').forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentDrawer = e.target.dataset.drawer;

        const mdmBox = document.getElementById('sec-mdm-params');
        if (mdmBox) mdmBox.style.display = this.currentDrawer === 'mdm' ? 'block' : 'none';
        this.loadActivePeriod();
      });
    });

    [this.inpEnrolled, this.inpDays, this.inpRate].forEach((el) => {
      if (el) el.addEventListener('input', () => this.updateMdmCalculations());
    });

    const btnAddV = document.getElementById('btn-add-voucher');
    if (btnAddV) {
      btnAddV.onclick = () => {
        this.currentVouchers.push({ type: 'bank_credit', amount: 0, date: '', particulars: '' });
        this.renderVouchers();
      };
    }

    const btnSave = document.getElementById('btn-save-period');
    if (btnSave) {
      btnSave.onclick = () => this.saveActivePeriod();
    }

    if (this.selFy) this.selFy.onchange = () => this.loadActivePeriod();
    if (this.selMonth) this.selMonth.onchange = () => this.loadActivePeriod();
  }

  updateMdmCalculations() {
    const e = parseInt(this.inpEnrolled?.value, 10) || 0;
    const w = parseInt(this.inpDays?.value, 10) || 0;
    const r = parseFloat(this.inpRate?.value) || 0;
    const meals = e * w;
    const cost = (meals * r).toFixed(2);

    if (this.lblMeals) this.lblMeals.textContent = meals;
    if (this.lblMandate) this.lblMandate.textContent = cost;
  }

  renderVouchers() {
    if (!this.voucherContainer) return;
    this.voucherContainer.innerHTML = this.currentVouchers.map((v, i) => `
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
        <select class="form-control" style="width:50%;" onchange="window.monthlyForm.updateVoucherType(${i}, this.value)">
          <option value="contra_cash_withdrawal" ${v.type === 'contra_cash_withdrawal' ? 'selected' : ''}>Cash Withdrawn from Bank (Contra)</option>
          <option value="bank_credit" ${v.type === 'bank_credit' ? 'selected' : ''}>Fund / Grant Credit to Bank</option>
        </select>
        <input type="number" step="0.01" class="form-control" style="width:35%;" placeholder="Amount (₹)" value="${v.amount}" onchange="window.monthlyForm.updateVoucherAmt(${i}, this.value)">
        <button class="btn btn-danger" style="padding:6px 10px;" onclick="window.monthlyForm.removeVoucher(${i})">✕</button>
      </div>
    `).join('');
  }

  updateVoucherType(i, val) { this.currentVouchers[i].type = val; }
  updateVoucherAmt(i, val) { this.currentVouchers[i].amount = parseFloat(val) || 0; }
  removeVoucher(i) {
    this.currentVouchers.splice(i, 1);
    this.renderVouchers();
  }

  async loadActivePeriod() {
    this.updateMdmCalculations();
    this.renderVouchers();

    if (!this.activeSchoolMeta) return;
    const y = this.selFy ? this.selFy.value : '2026';
    const m = this.selMonth ? this.selMonth.value : '09';

    const data = storage.getRecord(this.activeSchoolMeta.udise, this.currentDrawer, y, m);
    if (data) {
      if (this.inpObCash) this.inpObCash.value = data.opCash;
      if (this.inpObBank) this.inpObBank.value = data.opBank;
      if (data.vouchers) this.currentVouchers = data.vouchers;
      if (data.enrolled && this.inpEnrolled) this.inpEnrolled.value = data.enrolled;
      if (data.days && this.inpDays) this.inpDays.value = data.days;
      if (data.rate && this.inpRate) this.inpRate.value = data.rate;
      this.updateMdmCalculations();
      this.renderVouchers();
    }
  }

  saveActivePeriod() {
    if (!this.activeSchoolMeta) return;
    const y = this.selFy ? this.selFy.value : '2026';
    const m = this.selMonth ? this.selMonth.value : '09';

    const payload = {
      opCash: parseFloat(this.inpObCash?.value) || 0,
      opBank: parseFloat(this.inpObBank?.value) || 0,
      enrolled: parseInt(this.inpEnrolled?.value, 10) || 0,
      days: parseInt(this.inpDays?.value, 10) || 0,
      rate: parseFloat(this.inpRate?.value) || 0,
      vouchers: this.currentVouchers
    };

    storage.saveRecord(this.activeSchoolMeta.udise, this.currentDrawer, y, m, payload);
    alert('Period ledger compiled and saved successfully!');
  }
}
