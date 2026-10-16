/**
 * Two-Page Physical Register Mirror with "Tap-to-Ink" Line Tracker & Strict Print Router
 */

import { accountingEngine } from './accounting-engine.js';

export class CopyHud {
  constructor() {
    this.container = document.getElementById('view-copy-hud');
    this.activeRowIndex = null;
  }

  /**
   * Renders the two-page physical cash book spread
   */
  render(ledgerData, schoolMeta = {}, periodMeta = {}) {
    if (!this.container) return;

    const { receipts, payments, summary } = ledgerData;
    const { schoolName = 'ELEMENTARY SCHOOL', udise = '' } = schoolMeta;
    const { monthText = '', yearText = '', drawerTitle = 'PM POSHAN' } = periodMeta;

    const EXACT_RECEIPT_LINES = 20;
    const EXACT_PAYMENT_LINES = 13;

    // Build Receipt Rows
    let receiptsHtml = '';
    receipts.forEach((r, idx) => {
      const c = accountingEngine.splitAmount(r.cash);
      const b = accountingEngine.splitAmount(r.bank);
      receiptsHtml += this._buildRow({
        id: `rcpt-${idx}`,
        date: r.date,
        particulars: r.particulars,
        lf: r.lf,
        cRs: c.rs,
        cP: c.p,
        bRs: b.rs,
        bP: b.p,
        isRed: false
      });
    });

    // Fill blank lines to match physical register page height
    for (let i = receipts.length; i < EXACT_RECEIPT_LINES; i++) {
      receiptsHtml += `<tr class="hud-row empty-line"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    // Receipt Totals (T/R & G/T)
    const trCash = accountingEngine.splitAmount(summary.trOnlyCash);
    const trBank = accountingEngine.splitAmount(summary.trOnlyBank);
    const gtCash = accountingEngine.splitAmount(summary.totRecCash);
    const gtBank = accountingEngine.splitAmount(summary.totRecBank);

    receiptsHtml += `
      <tr class="total-row ink-black">
        <td colspan="3" style="text-align:right; padding-right:8px;"><strong>T/R (Total Receipts):</strong></td>
        <td class="col-rs">${trCash.rs}</td><td class="col-p">${trCash.p}</td>
        <td class="col-rs">${trBank.rs}</td><td class="col-p">${trBank.p}</td>
      </tr>
      <tr class="total-row ink-black">
        <td colspan="3" style="text-align:right; padding-right:8px;"><strong>G/T (Grand Total):</strong></td>
        <td class="col-rs">${gtCash.rs}</td><td class="col-p">${gtCash.p}</td>
        <td class="col-rs">${gtBank.rs}</td><td class="col-p">${gtBank.p}</td>
      </tr>
    `;

    // Build Payment Rows
    let paymentsHtml = '';
    payments.forEach((p, idx) => {
      const c = accountingEngine.splitAmount(p.cash);
      const b = accountingEngine.splitAmount(p.bank);
      paymentsHtml += this._buildRow({
        id: `pmt-${idx}`,
        date: p.date,
        particulars: p.particulars,
        lf: p.lf,
        cRs: c.rs,
        cP: c.p,
        bRs: b.rs,
        bP: b.p,
        isRed: true
      });
    });

    // Fill blank lines for payment page
    for (let i = payments.length; i < EXACT_PAYMENT_LINES; i++) {
      paymentsHtml += `<tr class="hud-row empty-line"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    // Payment Totals & Closing Balance
    const tpCash = accountingEngine.splitAmount(summary.totPayCash);
    const tpBank = accountingEngine.splitAmount(summary.totPayBank);
    const cbCash = accountingEngine.splitAmount(summary.closingCash);
    const cbBank = accountingEngine.splitAmount(summary.closingBank);

    paymentsHtml += `
      <tr class="total-row ink-red">
        <td colspan="3" style="text-align:right; padding-right:8px;"><strong>T/P (Total Payments):</strong></td>
        <td class="col-rs">${tpCash.rs}</td><td class="col-p">${tpCash.p}</td>
        <td class="col-rs">${tpBank.rs}</td><td class="col-p">${tpBank.p}</td>
      </tr>
      <tr class="total-row ink-red">
        <td colspan="3" style="text-align:right; padding-right:8px;"><strong>By Closing Balance (C/B):</strong></td>
        <td class="col-rs">${cbCash.rs}</td><td class="col-p">${cbCash.p}</td>
        <td class="col-rs">${cbBank.rs}</td><td class="col-p">${cbBank.p}</td>
      </tr>
      <tr class="total-row ink-red">
        <td colspan="3" style="text-align:right; padding-right:8px;"><strong>G/T (Grand Total):</strong></td>
        <td class="col-rs">${gtCash.rs}</td><td class="col-p">${gtCash.p}</td>
        <td class="col-rs">${gtBank.rs}</td><td class="col-p">${gtBank.p}</td>
      </tr>
    `;

    // Render Spread HTML
    this.container.innerHTML = `
      <div class="card no-print" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div>
          <b style="color:var(--primary);">📖 Physical Copy HUD</b>
          <div style="font-size:0.8rem; color:#64748b;">Tap any row below to highlight the exact line to write into your paper cash book.</div>
        </div>
        <button id="btn-print-register" class="btn btn-primary btn-sm">🖨️ Print Strict A4 Spread</button>
      </div>

      <div class="hud-container" id="hud-printable-area">
        <div class="hud-spread">
          <!-- PAGE 1: RECEIPTS -->
          <div class="hud-page hud-page-receipts">
            <div class="hud-header">
              <div style="font-size:1.1rem; letter-spacing:1px;">CASH BOOK REGISTER</div>
              <div style="font-size:0.85rem; font-weight:600; color:#334155;">${schoolName} (UDISE: ${udise})</div>
              <div style="font-size:0.8rem; color:#64748b;">Month: ${monthText} ${yearText} | [${drawerTitle}]</div>
              <div style="text-align:left; font-size:0.9rem; font-weight:900; margin-top:4px;">RECEIPTS (DEBIT SIDE)</div>
            </div>
            <table class="ledger-table">
              <thead>
                <tr>
                  <th rowspan="2" class="th-date">Date</th>
                  <th rowspan="2" class="th-particulars">Particulars</th>
                  <th rowspan="2" class="th-lf">LF</th>
                  <th colspan="2" class="th-group">Cash in Hand</th>
                  <th colspan="2" class="th-group">Bank Account</th>
                </tr>
                <tr>
                  <th class="th-sub">Rs.</th><th class="th-sub-p">P.</th>
                  <th class="th-sub">Rs.</th><th class="th-sub-p">P.</th>
                </tr>
              </thead>
              <tbody>${receiptsHtml}</tbody>
            </table>
          </div>

          <!-- PAGE 2: PAYMENTS -->
          <div class="hud-page hud-page-payments">
            <div class="hud-header">
              <div style="font-size:1.1rem; letter-spacing:1px;">CASH BOOK REGISTER</div>
              <div style="font-size:0.85rem; font-weight:600; color:#334155;">${schoolName} (UDISE: ${udise})</div>
              <div style="font-size:0.8rem; color:#64748b;">Month: ${monthText} ${yearText} | [${drawerTitle}]</div>
              <div style="text-align:left; font-size:0.9rem; font-weight:900; margin-top:4px; color:#b91c1c;">PAYMENTS (CREDIT SIDE)</div>
            </div>
            <table class="ledger-table">
              <thead>
                <tr>
                  <th rowspan="2" class="th-date">Date</th>
                  <th rowspan="2" class="th-particulars">Particulars</th>
                  <th rowspan="2" class="th-lf">LF</th>
                  <th colspan="2" class="th-group">Cash in Hand</th>
                  <th colspan="2" class="th-group">Bank Account</th>
                </tr>
                <tr>
                  <th class="th-sub">Rs.</th><th class="th-sub-p">P.</th>
                  <th class="th-sub">Rs.</th><th class="th-sub-p">P.</th>
                </tr>
              </thead>
              <tbody>${paymentsHtml}</tbody>
            </table>

            <!-- Audit Certificate (Page 2 Bottom) -->
            <div class="statutory-audit-cert">
              <strong>STATUTORY PHYSICAL AUDIT CERTIFICATE:</strong><br>
              1. Certified that the closing cash in hand of <strong>Rs. ${cbCash.rs || '0'}.${cbCash.p || '00'}</strong> was physically verified and found correct.<br>
              2. Certified that closing bank balance of <strong>Rs. ${cbBank.rs || '0'}.${cbBank.p || '00'}</strong> reconciles with the official Passbook.<br>
              3. Certified that all cooking vouchers incurred under LF 1 strictly comply with daily per-child rate allocations.
            </div>

            <div class="signature-block">
              <div class="sign-box"><div class="sign-line"></div>Prepared / Written By</div>
              <div class="sign-box"><div class="sign-line"></div>Verified by Member / SMC</div>
              <div class="sign-box"><div class="sign-line"></div>Head Teacher / In-Charge</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _buildRow({ id, date, particulars, lf, cRs, cP, bRs, bP, isRed }) {
    const inkClass = isRed ? 'ink-red' : 'ink-black';
    return `
      <tr class="hud-row ${inkClass}" id="${id}">
        <td class="col-date">${date || ''}</td>
        <td class="col-desc">${particulars || ''}</td>
        <td class="col-lf">${lf || '-'}</td>
        <td class="col-rs">${cRs || ''}</td><td class="col-p">${cP || ''}</td>
        <td class="col-rs">${bRs || ''}</td><td class="col-p">${bP || ''}</td>
      </tr>
    `;
  }

  /**
   * Binds Tap-to-Ink click selection and printing
   */
  _bindEvents() {
    // Tap-to-Ink line tracker
    const rows = this.container.querySelectorAll('.hud-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        rows.forEach(r => r.classList.remove('active-ink-target'));
        row.classList.add('active-ink-target');
      });
    });

    // Clean-buffer printing
    const btnPrint = document.getElementById('btn-print-register');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => this.triggerIsolatedPrint());
    }
  }

  /**
   * Isolated iframe print runner (from legacy cashbook-engine.js)
   */
  triggerIsolatedPrint() {
    const targetEl = document.getElementById('hud-printable-area');
    if (!targetEl) return;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
    const doc = frameDoc.document || frameDoc;

    let stylesHtml = '';
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
      stylesHtml += node.outerHTML;
    });

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Statutory Cash Book Print Spread</title>
          ${stylesHtml}
        </head>
        <body>${targetEl.innerHTML}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => document.body.removeChild(printFrame), 1000);
    }, 400);
  }
}

export const copyHud = new CopyHud();

