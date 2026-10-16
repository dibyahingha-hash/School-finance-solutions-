
/**
 * Monthly Form UI Controller
 * 3-Drawer Switcher, Zero-Dropdown Smart Narration Bar & Mandate Gap Tracker
 */

import { matchNarration, DRAWER_SCHEMAS } from './statutory-rules.js';
import { Validator } from './validator.js';
import { accountingEngine } from './accounting-engine.js';
import { storage } from './storage.js';

export class MonthlyForm {
  constructor() {
    this.currentDrawer = 'mdm';
    this.currentVouchers = [];
    this.activeNarrationMatch = null;
    this.selectedPeriod = { month: '04', year: '2026' };
    this.activeSchoolMeta = { udise: '', category: 'COMPOSITE', enrolled: 0 };
    
    this._bindDomElements();
    this._initEventListeners();
  }

  _bindDomElements() {
    // Drawer buttons
    this.btnMdm = document.getElementById('drawer-mdm');
    this.btnSmc = document.getElementById('drawer-smc');
    this.btnSna = document.getElementById('drawer-sna');
    this.boxMdmMandate = document.getElementById('box-mdm-mandate');
    this.drawerTitle = document.getElementById('current-drawer-title');

    // Period & Mandate inputs
    this.selFy = document.getElementById('sel-fy');
    this.selMonth = document.getElementById('sel-month');
    this.inpEnrolled = document.getElementById('inp-enrolled');
    this.inpWorkingDays = document.getElementById('inp-working-days');
    this.inpTotalMeals = document.getElementById('inp-total-meals');
    this.lblMaxMeals = document.getElementById('lbl-max-meals');
    this.lblAttendanceRate = document.getElementById('lbl-attendance-rate');

    // Opening balances
    this.inpObCash = document.getElementById('inp-ob-cash');
    this.inpObBank = document.getElementById('inp-ob-bank');

    // Smart narration search
    this.inpSearch = document.getElementById('inp-narration-search');
    this.suggestionsBox = document.getElementById('narration-suggestions');
    this.lblNarrationFull = document.getElementById('lbl-narration-full');
    this.lblNarrationMeta = document.getElementById('lbl-narration-meta');

    // Transaction entry fields
    this.inpTxDate = document.getElementById('inp-tx-date');
    this.inpTxAmount = document.getElementById('inp-tx-amount');
    this.btnSaveTx = document.getElementById('btn-save-transaction');
    this.tableBody = document.getElementById('entries-table-body');
  }

  _initEventListeners() {
    // 3-Drawer Switcher Tabs
    const drawerBtns = [
      { btn: this.btnMdm, id: 'mdm', title: 'PM POSHAN (MDM) Ledger' },
      { btn: this.btnSmc, id: 'smc', title: 'SMC Savings Ledger' },
      { btn: this.btnSna, id: 'sna', title: 'Canara / State SNA Ledger' }
    ];

    drawerBtns.forEach(({ btn, id, title }) => {
      if (btn) {
        btn.addEventListener('click', () => {
          this.switchDrawer(id, title);
        });
      }
    });

    // Ceiling calculation on working days / meals input
    const triggerCeilingCheck = () => this.evaluateMealCeiling();
    if (this.inpWorkingDays) this.inpWorkingDays.addEventListener('input', triggerCeilingCheck);
    if (this.inpTotalMeals) this.inpTotalMeals.addEventListener('input', triggerCeilingCheck);

    // Smart Narration Search Bar (Zero Dropdowns)
    if (this.inpSearch) {
      this.inpSearch.addEventListener('input', (e) => this.handleSmartNarrationInput(e.target.value));
      this.inpSearch.addEventListener('focus', (e) => this.handleSmartNarrationInput(e.target.value));
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (this.suggestionsBox && !this.inpSearch.contains(e.target) && !this.suggestionsBox.contains(e.target)) {
        this.suggestionsBox.style.display = 'none';
      }
    });

    // Save Transaction
    if (this.btnSaveTx) {
      this.btnSaveTx.addEventListener('click', () => this.saveTransaction());
    }

    // Period Changes
    if (this.selMonth) {
      this.selMonth.addEventListener('change', () => this.loadActivePeriod());
    }
    if (this.selFy) {
      this.selFy.addEventListener('change', () => this.loadActivePeriod());
    }
  }

  /**
   * Switches active accounting drawer and reconfigures context
   */
  switchDrawer(drawerId, title) {
    this.currentDrawer = drawerId;
    [this.btnMdm, this.btnSmc, this.btnSna].forEach(b => b && b.classList.remove('active'));

    if (drawerId === 'mdm' && this.btnMdm) this.btnMdm.classList.add('active');
    if (drawerId === 'smc' && this.btnSmc) this.btnSmc.classList.add('active');
    if (drawerId === 'sna' && this.btnSna) this.btnSna.classList.add('active');

    // Only MDM requires the statutory cooking mandate calculator
    if (this.boxMdmMandate) {
      this.boxMdmMandate.style.display = (drawerId === 'mdm') ? 'block' : 'none';
    }

    if (this.drawerTitle) {
      this.drawerTitle.textContent = title;
    }

    // Reset smart narration bar for the active drawer
    if (this.inpSearch) this.inpSearch.value = '';
    this.resetNarrationPreview();
    this.loadActivePeriod();
  }

  /**
   * Handles natural typing in the smart narration bar
   */
  handleSmartNarrationInput(query) {
    if (!query || query.trim().length === 0) {
      this.renderQuickDrawerSuggestions();
      return;
    }

    const match = matchNarration(query, this.currentDrawer);
    if (match) {
      this.applyMatchedNarration(match);
      if (this.suggestionsBox) this.suggestionsBox.style.display = 'none';
    } else {
      this.renderQuickDrawerSuggestions(query);
    }
  }

  /**
   * Shows contextual suggestion pills under the single input bar
   */
  renderQuickDrawerSuggestions(filterText = '') {
    if (!this.suggestionsBox) return;
    const schemas = DRAWER_SCHEMAS[this.currentDrawer] || DRAWER_SCHEMAS.mdm;
    const pool = [
      ...schemas.RECEIPT.map(item => ({ ...item, type: 'RECEIPT' })),
      ...schemas.PAYMENT.map(item => ({ ...item, type: 'PAYMENT' }))
    ];

    const filtered = filterText 
      ? pool.filter(p => p.text.toLowerCase().includes(filterText.toLowerCase()))
      : pool.slice(0, 6);

    if (filtered.length === 0) {
      this.suggestionsBox.style.display = 'none';
      return;
    }

    this.suggestionsBox.innerHTML = filtered.map((item, idx) => `
      <div class="suggestion-item" data-idx="${idx}">
        <span>${item.text}</span>
        <span style="font-size:0.75rem; color:#64748b; font-weight:700;">
          [${item.type} | LF: ${item.lf}]
        </span>
      </div>
    `).join('');

    this.suggestionsBox.querySelectorAll('.suggestion-item').forEach((el, index) => {
      el.addEventListener('click', () => {
        this.applyMatchedNarration(filtered[index]);
        if (this.inpSearch) this.inpSearch.value = filtered[index].text;
        this.suggestionsBox.style.display = 'none';
      });
    });

    this.suggestionsBox.style.display = 'block';
  }

  /**
   * Sets standardized statutory narration and locks Side/LF/Column
   */
  applyMatchedNarration(item) {
    this.activeNarrationMatch = item;
    let finalizedText = item.text;

    // Handle auto-installments for PM POSHAN cooking expenses
    if (item.isMealExpense) {
      const totalMeals = parseInt(this.inpTotalMeals?.value, 10) || 0;
      const mText = this.selMonth?.options[this.selMonth.selectedIndex]?.text || '';
      const yText = this.selFy?.value || '';
      finalizedText = accountingEngine.getDynamicInstallmentText(this.currentVouchers, totalMeals, mText, yText);
    }

    if (this.lblNarrationFull) this.lblNarrationFull.innerHTML = `<strong>${finalizedText}</strong>`;
    if (this.lblNarrationMeta) {
      this.lblNarrationMeta.textContent = `Side: ${item.type} | Folio (LF): ${item.lf} | Column Mode: ${item.channel}`;
    }
  }

  resetNarrationPreview() {
    this.activeNarrationMatch = null;
    if (this.lblNarrationFull) {
      this.lblNarrationFull.textContent = '(Type a purpose above to view auto-completed statutory text)';
    }
    if (this.lblNarrationMeta) {
      this.lblNarrationMeta.textContent = 'Side: - | Folio (LF): - | Mode: -';
    }
  }

  /**
   * Enforces mathematical ceiling check (M <= W x E)
   */
  evaluateMealCeiling() {
    const W = this.inpWorkingDays ? this.inpWorkingDays.value : 0;
    const E = this.activeSchoolMeta.enrolled || (this.inpEnrolled ? this.inpEnrolled.value : 0);
    const M = this.inpTotalMeals ? this.inpTotalMeals.value : 0;

    const res = Validator.validateMealCeiling(W, E, M);

    if (this.lblMaxMeals) this.lblMaxMeals.textContent = res.maxPermissibleMeals || '0';
    if (this.lblAttendanceRate) this.lblAttendanceRate.textContent = `${res.attendanceRate || 0}%`;

    const indicator = document.getElementById('ceiling-indicator');
    if (indicator) {
      if (!res.valid) {
        indicator.style.color = '#dc2626';
        indicator.textContent = `⚠️ ${res.error}`;
      } else {
        indicator.style.color = '#166534';
        indicator.textContent = `✓ Max Permissible Meals: ${res.maxPermissibleMeals} (Attendance: ${res.attendanceRate}%)`;
      }
    }

    return res.valid;
  }

  /**
   * Appends transaction to active drawer ledger
   */
  async saveTransaction() {
    const date = this.inpTxDate?.value;
    const amt = parseFloat(this.inpTxAmount?.value) || 0;
    const detail = document.getElementById('inp-tx-detail')?.value || '';

    if (!date) return alert('Please select a valid transaction date.');
    if (amt <= 0) return alert('Please enter a valid amount greater than ₹0.00.');
    if (!this.activeNarrationMatch) return alert('Please specify a recognized purpose / particulars description.');

    const newVoucher = {
      id: Date.now(),
      date,
      type: this.activeNarrationMatch.type,
      channel: this.activeNarrationMatch.channel,
      lf: this.activeNarrationMatch.lf,
      desc: this.activeNarrationMatch.text + (detail ? ` (${detail})` : ''),
      amount: amt
    };

    this.currentVouchers.push(newVoucher);
    await this.persistAndRefresh();

    // Reset entry fields
    if (this.inpTxAmount) this.inpTxAmount.value = '';
    if (this.inpSearch) this.inpSearch.value = '';
    const detailEl = document.getElementById('inp-tx-detail');
    if (detailEl) detailEl.value = '';
    this.resetNarrationPreview();
  }

  async persistAndRefresh() {
    const m = this.selMonth ? this.selMonth.value : '04';
    const y = this.selFy ? this.selFy.value : '2026';
    const opCash = parseFloat(this.inpObCash?.value) || 0;
    const opBank = parseFloat(this.inpObBank?.value) || 0;

    const ledger = accountingEngine.computeLedger({
      opCash,
      opBank,
      vouchers: this.currentVouchers,
      mandateTarget: 0
    });

    const payload = {
      drawer: this.currentDrawer,
      year: y,
      month: m,
      opCash,
      opBank,
      closeCash: ledger.summary.closingCash,
      closeBank: ledger.summary.closingBank,
      vouchers: this.currentVouchers
    };

    await storage.saveRecord(this.activeSchoolMeta.udise, this.currentDrawer, y, m, payload);
    this.renderEntriesTable();
  }

  async loadActivePeriod() {
    const m = this.selMonth ? this.selMonth.value : '04';
    const y = this.selFy ? this.selFy.value : '2026';

    const rec = await storage.getRecord(this.activeSchoolMeta.udise, this.currentDrawer, y, m);
    if (rec) {
      this.currentVouchers = rec.vouchers || [];
      if (this.inpObCash) this.inpObCash.value = rec.opCash || '0.00';
      if (this.inpObBank) this.inpObBank.value = rec.opBank || '0.00';
    } else {
      // Check previous month's closing forward
      const prev = await storage.getPreviousClosing(this.activeSchoolMeta.udise, this.currentDrawer, y, m);
      this.currentVouchers = [];
      if (this.inpObCash) this.inpObCash.value = prev ? prev.opCash : '0.00';
      if (this.inpObBank) this.inpObBank.value = prev ? prev.opBank : '0.00';
    }

    this.renderEntriesTable();
  }

  renderEntriesTable() {
    if (!this.tableBody) return;
    if (this.currentVouchers.length === 0) {
      this.tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:12px; color:#64748b;">No vouchers recorded for this drawer this month.</td></tr>`;
      return;
    }

    this.tableBody.innerHTML = this.currentVouchers.map((v, i) => `
      <tr>
        <td>${v.date}</td>
        <td><strong>${v.type}</strong></td>
        <td>${v.desc}</td>
        <td style="text-align:center;">${v.lf}</td>
        <td>${v.vNo || '-'}</td>
        <td style="text-align:right;">${v.channel === 'CASH' ? '₹' + Number(v.amount).toFixed(2) : '-'}</td>
        <td style="text-align:right;">${v.channel === 'BANK' ? '₹' + Number(v.amount).toFixed(2) : '-'}</td>
        <td class="no-print" style="text-align:center;">
          <button class="btn btn-sm" style="background:#fee2e2; color:#dc2626;" onclick="window.monthlyForm.deleteVoucher(${i})">✕</button>
        </td>
      </tr>
    `).join('');
  }

  async deleteVoucher(index) {
    this.currentVouchers.splice(index, 1);
    await this.persistAndRefresh();
  }
}
