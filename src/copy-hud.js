/**
 * DHK PM POSHAN & School CashBook Pro
 * Module: src/copy-hud.js
 * 
 * Physical Register Replica & Two-Page Legal Spread HUD
 * - Exact layout parity with physical Assam school cash book registers
 * - Legal (8.5" x 14") print pagination (2 pages/month = 24 pages/annual volume)
 * - Continuous empty ruled ledger rows down to totals
 * - Interactive tap-to-ink row tracking for manual transcription
 * - Dynamic machine page numbers (April = P.1/2 ... March = P.23/24)
 * - Statutory 3-clause Physical Verification Certificate
 */

export class CopyHud {
  constructor() {
    this.checkedRows = new Set();
    this.TOTAL_GRID_ROWS = 18; // Standard rows per physical legal sheet
    this.MONTH_PAGE_MAP = {
      '04': { left: 1, right: 2 },
      '05': { left: 3, right: 4 },
      '06': { left: 5, right: 6 },
      '07': { left: 7, right: 8 },
      '08': { left: 9, right: 10 },
      '09': { left: 11, right: 12 },
      '10': { left: 13, right: 14 },
      '11': { left: 15, right: 16 },
      '12': { left: 17, right: 18 },
      '01': { left: 19, right: 20 },
      '02': { left: 21, right: 22 },
      '03': { left: 23, right: 24 }
    };
  }

  toggleCheck(rowId) {
    if (this.checkedRows.has(rowId)) {
      this.checkedRows.delete(rowId);
    } else {
      this.checkedRows.add(rowId);
    }
    const el = document.getElementById(rowId);
    if (el) {
      if (this.checkedRows.has(rowId)) {
        el.classList.add('ink-checked');
      } else {
        el.classList.remove('ink-checked');
      }
    }
  }

  render(ledgerData, schoolMeta, periodMeta) {
    const container = document.getElementById('hud-container');
    if (!container) return;

    const fmt = (val) => {
      const parts = Number(val || 0).toFixed(2).split('.');
      return { rs: parts[0], p: parts[1] };
    };

    const cleanMonth = String(periodMeta.monthNum || '09').padStart(2, '0');
    const pageNos = this.MONTH_PAGE_MAP[cleanMonth] || { left: 1, right: 2 };

    const splitDate = (dateStr) => {
      if (!dateStr || dateStr === '1st' || dateStr === 'End') {
        return { prefix: '', day: dateStr || '' };
      }
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        return { prefix: `${parts[1]}/${parts[2]}`, day: parts[0] };
      }
      return { prefix: '', day: dateStr };
    };

    const renderDataRows = (items, sidePrefix) => {
      let html = '';
      items.forEach((row, idx) => {
        const rowId = `row-${sidePrefix}-${idx}`;
        const isChecked = this.checkedRows.has(rowId);
        const c = fmt(row.cash);
        const b = fmt(row.bank);
        const t = fmt(row.total);
        const d = splitDate(row.date);

        html += `
          <tr id="${rowId}" class="ledger-row ${isChecked ? 'ink-checked' : ''}" onclick="window.copyHud.toggleCheck('${rowId}')">
            <td class="col-date-pfx">${d.prefix}</td>
            <td class="col-date-day">${d.day}</td>
            <td class="col-particulars">${row.particulars}</td>
            <td class="col-folio">${row.folio || ''}</td>
            <td class="amt-rs">${c.rs}</td>
            <td class="amt-p">${c.p}</td>
            <td class="amt-rs">${b.rs}</td>
            <td class="amt-p">${b.p}</td>
            <td class="amt-rs">${t.rs}</td>
            <td class="amt-p">${t.p}</td>
          </tr>
        `;
      });

      // Render persistent empty ruled lines to fill out the physical page
      const emptyLinesNeeded = Math.max(0, this.TOTAL_GRID_ROWS - items.length);
      for (let i = 0; i < emptyLinesNeeded; i++) {
        html += `
          <tr class="ledger-row empty-ruled-row">
            <td class="col-date-pfx">&nbsp;</td>
            <td class="col-date-day">&nbsp;</td>
            <td class="col-particulars">&nbsp;</td>
            <td class="col-folio">&nbsp;</td>
            <td class="amt-rs">&nbsp;</td>
            <td class="amt-p">&nbsp;</td>
            <td class="amt-rs">&nbsp;</td>
            <td class="amt-p">&nbsp;</td>
            <td class="amt-rs">&nbsp;</td>
            <td class="amt-p">&nbsp;</td>
          </tr>
        `;
      }

      return html;
    };

    const t = ledgerData.totals;
    const trC = fmt(t.trCash);
    const trB = fmt(t.trBank);
    const trT = fmt(t.trTotal);
    const tpC = fmt(t.tpCash);
    const tpB = fmt(t.tpBank);
    const tpT = fmt(t.tpTotal);
    const gtrC = fmt(t.gtReceiptCash);
    const gtrB = fmt(t.gtReceiptBank);
    const gtrT = fmt(t.gtReceiptTotal);
    const gtpC = fmt(t.gtPaymentCash);
    const gtpB = fmt(t.gtPaymentBank);
    const gtpT = fmt(t.gtPaymentTotal);

    container.innerHTML = `
      <style>
        .hud-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 10px;
        }
        .physical-spread {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background: #525659;
          padding: 16px;
          border-radius: 6px;
        }
        @media (max-width: 900px) {
          .physical-spread {
            grid-template-columns: 1fr;
            padding: 8px;
          }
        }
        .physical-page {
          background: #fffdf5; /* Aged register paper tone */
          color: #0f172a;
          border: 1.5px solid #334155;
          padding: 18px 14px 14px 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          position: relative;
          min-height: 720px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .page-num-indicator {
          position: absolute;
          top: 10px;
          font-size: 0.85rem;
          font-weight: 800;
          color: #334155;
        }
        .page-num-left { left: 16px; }
        .page-num-right { right: 16px; }

        .page-top-header {
          text-align: center;
          margin-bottom: 8px;
        }
        .page-top-header h2 {
          font-size: 1.35rem;
          font-weight: 900;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin: 0;
          font-family: Georgia, "Times New Roman", serif;
        }
        .period-subline {
          font-size: 0.85rem;
          font-weight: 700;
          margin-top: 2px;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .side-title {
          font-size: 0.95rem;
          font-weight: 900;
          letter-spacing: 1px;
          margin: 4px 0 6px 0;
        }
        .side-receipts { text-align: left; color: #1e3a8a; }
        .side-payments { text-align: right; color: #991b1b; }

        table.sheet-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.72rem;
          border: 1.5px solid #1e293b;
        }
        table.sheet-table th, table.sheet-table td {
          border: 1px solid #475569;
          padding: 3px 4px;
          vertical-align: middle;
        }
        table.sheet-table th {
          background: #e2e8f0;
          font-weight: 800;
          text-align: center;
          color: #0f172a;
        }
        .col-date-pfx { width: 6%; text-align: center; font-size: 0.65rem; border-right: 1px dotted #94a3b8 !important; }
        .col-date-day { width: 5%; text-align: center; font-weight: 700; }
        .col-particulars { width: 43%; text-align: left; font-weight: 500; line-height: 1.2; }
        .col-folio { width: 5%; text-align: center; font-weight: 800; }
        .amt-rs { width: 9%; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px dotted #94a3b8 !important; }
        .amt-p { width: 5%; text-align: center; font-variant-numeric: tabular-nums; font-size: 0.68rem; }

        .ledger-row {
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .ledger-row:hover {
          background: #f1f5f9;
        }
        .ledger-row.ink-checked {
          background: #dcfce7 !important; /* Soft green check highlight */
          color: #14532d;
        }
        .empty-ruled-row {
          height: 22px;
          cursor: default;
        }
        .empty-ruled-row:hover { background: transparent; }

        .total-row {
          font-weight: 900;
          background: #f8fafc;
          border-top: 2px solid #0f172a;
        }
        .grand-total-row {
          font-weight: 900;
          background: #e2e8f0;
          border-top: 2px solid #0f172a;
          border-bottom: 2px double #0f172a;
        }

        .audit-cert-box {
          border: 1.5px solid #0f172a;
          padding: 8px 10px;
          margin-top: 10px;
          background: #fff;
          font-size: 0.7rem;
          line-height: 1.35;
        }
        .audit-cert-box strong {
          display: block;
          text-align: center;
          margin-bottom: 4px;
          text-decoration: underline;
        }
        .signature-grid {
          display: flex;
          justify-content: space-between;
          margin-top: 28px;
          padding: 0 8px;
          font-weight: 700;
          font-size: 0.72rem;
        }

        /* PRINT STYLING: EXACT LEGAL TWO-PAGE SPREAD */
        @media print {
          @page {
            size: legal landscape;
            margin: 0.4in;
          }
          body {
            background: #fff !important;
            padding: 0 !important;
          }
          .no-print, header, nav, .hud-action-bar {
            display: none !important;
          }
          .physical-spread {
            background: transparent !important;
            padding: 0 !important;
            gap: 12px !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            page-break-after: always;
          }
          .physical-page {
            border: 1.5px solid #000 !important;
            box-shadow: none !important;
            background: #fff !important;
            min-height: 98vh;
            page-break-inside: avoid;
          }
          .ledger-row.ink-checked {
            background: transparent !important;
          }
        }
      </style>

      <div class="hud-wrapper">
        <div class="hud-action-bar no-print" style="display:flex; justify-content:space-between; align-items:center; background:#1e293b; color:#fff; padding:10px 14px; border-radius:6px;">
          <div>
            <strong>📖 Physical Cash Book Transcription HUD</strong>
            <div style="font-size:0.75rem; color:#94a3b8;">Tap any line as you write into your register to mark it green. Legal 2-page print standard.</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button onclick="window.copyHud.clearChecks()" style="padding:6px 10px; background:#475569; border:none; color:#fff; border-radius:4px; font-size:0.75rem; cursor:pointer;">Reset Marks</button>
            <button onclick="window.print()" style="padding:6px 14px; background:#0284c7; border:none; color:#fff; font-weight:bold; border-radius:4px; font-size:0.8rem; cursor:pointer;">🖨️ Print Legal Register</button>
          </div>
        </div>

        <div class="physical-spread">
          <!-- LEFT PAGE: RECEIPTS -->
          <div class="physical-page">
            <span class="page-num-indicator page-num-left">${pageNos.left}</span>
            <div class="page-top-header">
              <h2>Cash Book</h2>
              <div class="period-subline">for the month of ${periodMeta.monthText} ${periodMeta.yearText}</div>
            </div>
            <div class="side-title side-receipts">RECEIPTS</div>

            <table class="sheet-table">
              <thead>
                <tr>
                  <th colspan="2" style="width:11%;">Month & Date</th>
                  <th rowspan="2">PARTICULARS</th>
                  <th rowspan="2" style="width:5%;">Ledger<br>Folio</th>
                  <th colspan="2" style="width:14%;">Amount</th>
                  <th colspan="2" style="width:14%;">Bank Amount</th>
                  <th colspan="2" style="width:14%;">Total Amount</th>
                </tr>
                <tr>
                  <th style="width:6%; font-size:0.65rem;">Mth</th>
                  <th style="width:5%; font-size:0.65rem;">Dt</th>
                  <th>Rs.</th><th>P.</th>
                  <th>Rs.</th><th>P.</th>
                  <th>Rs.</th><th>P.</th>
                </tr>
              </thead>
              <tbody>
                ${renderDataRows(ledgerData.receipts, 'rcpt')}
                <tr class="total-row">
                  <td colspan="2"></td>
                  <td>T/R (Total Receipts)</td>
                  <td class="col-folio"></td>
                  <td class="amt-rs">${trC.rs}</td><td class="amt-p">${trC.p}</td>
                  <td class="amt-rs">${trB.rs}</td><td class="amt-p">${trB.p}</td>
                  <td class="amt-rs">${trT.rs}</td><td class="amt-p">${trT.p}</td>
                </tr>
                <tr class="grand-total-row">
                  <td colspan="2"></td>
                  <td>G/T (Grand Total)</td>
                  <td class="col-folio"></td>
                  <td class="amt-rs">${gtrC.rs}</td><td class="amt-p">${gtrC.p}</td>
                  <td class="amt-rs">${gtrB.rs}</td><td class="amt-p">${gtrB.p}</td>
                  <td class="amt-rs">${gtrT.rs}</td><td class="amt-p">${gtrT.p}</td>
                </tr>
              </tbody>
            </table>
            <div style="font-size:0.65rem; color:#64748b; margin-top:6px; text-align:center;">
              ${schoolMeta?.schoolName || 'ASSAM STATUTORY SCHOOL'} | UDISE: ${schoolMeta?.udise || '--'}
            </div>
          </div>

          <!-- RIGHT PAGE: PAYMENTS -->
          <div class="physical-page">
            <span class="page-num-indicator page-num-right">${pageNos.right}</span>
            <div class="page-top-header">
              <h2>Cash Book</h2>
              <div class="period-subline" style="visibility:hidden;">for the month of</div>
            </div>
            <div class="side-title side-payments">PAYMENTS</div>

            <table class="sheet-table">
              <thead>
                <tr>
                  <th colspan="2" style="width:11%;">Month & Date</th>
                  <th rowspan="2">PARTICULARS</th>
                  <th rowspan="2" style="width:5%;">Ledger<br>Folio</th>
                  <th colspan="2" style="width:14%;">Amount</th>
                  <th colspan="2" style="width:14%;">Bank Amount</th>
                  <th colspan="2" style="width:14%;">Total Amount</th>
                </tr>
                <tr>
                  <th style="width:6%; font-size:0.65rem;">Mth</th>
                  <th style="width:5%; font-size:0.65rem;">Dt</th>
                  <th>Rs.</th><th>P.</th>
                  <th>Rs.</th><th>P.</th>
                  <th>Rs.</th><th>P.</th>
                </tr>
              </thead>
              <tbody>
                ${renderDataRows(ledgerData.payments, 'pmt')}
                <tr class="total-row">
                  <td colspan="2"></td>
                  <td>T/P (Total Payments)</td>
                  <td class="col-folio"></td>
                  <td class="amt-rs">${tpC.rs}</td><td class="amt-p">${tpC.p}</td>
                  <td class="amt-rs">${tpB.rs}</td><td class="amt-p">${tpB.p}</td>
                  <td class="amt-rs">${tpT.rs}</td><td class="amt-p">${tpT.p}</td>
                </tr>
                <tr class="grand-total-row">
                  <td colspan="2"></td>
                  <td>G/T (Grand Total)</td>
                  <td class="col-folio"></td>
                  <td class="amt-rs">${gtpC.rs}</td><td class="amt-p">${gtpC.p}</td>
                  <td class="amt-rs">${gtpB.rs}</td><td class="amt-p">${gtpB.p}</td>
                  <td class="amt-rs">${gtpT.rs}</td><td class="amt-p">${gtpT.p}</td>
                </tr>
              </tbody>
            </table>

            <div class="audit-cert-box">
              <strong>STATUTORY PHYSICAL VERIFICATION & AUDIT CERTIFICATE</strong>
              1. Certified that the closing cash-in-hand balance of Rs. ${Number(t.closingCash).toFixed(2)} has been physically verified by the undersigned and found correct.<br>
              2. Certified that the closing bank balance of Rs. ${Number(t.closingBank).toFixed(2)} agrees with the entries in the Bank Passbook/SNA Portal statement for ${periodMeta.monthText} ${periodMeta.yearText}.<br>
              3. Certified that all cooking cost expenditures billed under Folio 1 conform to sanctioned per-child per-day allocation rules.
              <div class="signature-grid">
                <span>Signature of SMC President</span>
                <span>Signature of Head Teacher / Member Secretary</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  clearChecks() {
    this.checkedRows.clear();
    document.querySelectorAll('.ledger-row.ink-checked').forEach(el => {
      el.classList.remove('ink-checked');
    });
  }
}

export const copyHud = new CopyHud();
