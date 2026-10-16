/**
 * Two-Page Physical Register Replica & Copy HUD
 */

export class CopyHud {
  render(ledgerData, schoolMeta, periodMeta) {
    const container = document.getElementById('hud-container');
    if (!container) return;

    const fmt = (val) => {
      const parts = Number(val || 0).toFixed(2).split('.');
      return { rs: parts[0], p: parts[1] };
    };

    const renderRows = (items) => {
      return items.map((row) => {
        const c = fmt(row.cash);
        const b = fmt(row.bank);
        const t = fmt(row.total);
        return `
          <tr>
            <td style="text-align:center;">${row.date}</td>
            <td style="white-space:pre-line;">${row.particulars}</td>
            <td style="text-align:center; font-weight:bold;">${row.folio}</td>
            <td class="amt">${c.rs}</td>
            <td class="amt" style="border-right:2px solid #64748b;">${c.p}</td>
            <td class="amt">${b.rs}</td>
            <td class="amt" style="border-right:2px solid #64748b;">${b.p}</td>
            <td class="amt">${t.rs}</td>
            <td class="amt">${t.p}</td>
          </tr>
        `;
      }).join('');
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
      <div class="hud-spread">
        <!-- LEFT SPREAD: RECEIPTS -->
        <div class="hud-page">
          <div class="hud-header">
            <h3>CASH BOOK</h3>
            <p>For the month of ${periodMeta.monthText} ${periodMeta.yearText}</p>
            <div style="font-size:0.85rem; font-weight:bold; margin-top:2px; color:#1e3a8a;">RECEIPTS</div>
          </div>
          <table class="cb-table">
            <thead>
              <tr>
                <th rowspan="2" style="width:12%;">Month & Date</th>
                <th rowspan="2">PARTICULARS</th>
                <th rowspan="2" style="width:8%;">Ledger Folio</th>
                <th colspan="2">Cash Amount</th>
                <th colspan="2">Bank Amount</th>
                <th colspan="2">Total Amount</th>
              </tr>
              <tr>
                <th style="width:10%;">Rs.</th><th style="width:5%;">P.</th>
                <th style="width:10%;">Rs.</th><th style="width:5%;">P.</th>
                <th style="width:10%;">Rs.</th><th style="width:5%;">P.</th>
              </tr>
            </thead>
            <tbody>
              ${renderRows(ledgerData.receipts)}
              <tr style="font-weight:bold; background:#f8fafc;">
                <td></td>
                <td>T/R (Total Receipts)</td>
                <td></td>
                <td class="amt">${trC.rs}</td><td class="amt">${trC.p}</td>
                <td class="amt">${trB.rs}</td><td class="amt">${trB.p}</td>
                <td class="amt">${trT.rs}</td><td class="amt">${trT.p}</td>
              </tr>
              <tr style="font-weight:bold; background:#e2e8f0; border-top:2px solid #0f172a;">
                <td></td>
                <td>G/T (Grand Total)</td>
                <td></td>
                <td class="amt">${gtrC.rs}</td><td class="amt">${gtrC.p}</td>
                <td class="amt">${gtrB.rs}</td><td class="amt">${gtrB.p}</td>
                <td class="amt">${gtrT.rs}</td><td class="amt">${gtrT.p}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- RIGHT SPREAD: PAYMENTS -->
        <div class="hud-page">
          <div class="hud-header">
            <h3>CASH BOOK</h3>
            <p>For the month of ${periodMeta.monthText} ${periodMeta.yearText}</p>
            <div style="font-size:0.85rem; font-weight:bold; margin-top:2px; color:#dc2626;">PAYMENTS</div>
          </div>
          <table class="cb-table">
            <thead>
              <tr>
                <th rowspan="2" style="width:12%;">Month & Date</th>
                <th rowspan="2">PARTICULARS</th>
                <th rowspan="2" style="width:8%;">Ledger Folio</th>
                <th colspan="2">Cash Amount</th>
                <th colspan="2">Bank Amount</th>
                <th colspan="2">Total Amount</th>
              </tr>
              <tr>
                <th style="width:10%;">Rs.</th><th style="width:5%;">P.</th>
                <th style="width:10%;">Rs.</th><th style="width:5%;">P.</th>
                <th style="width:10%;">Rs.</th><th style="width:5%;">P.</th>
              </tr>
            </thead>
            <tbody>
              ${renderRows(ledgerData.payments)}
              <tr style="font-weight:bold; background:#f8fafc;">
                <td></td>
                <td>T/P (Total Payments)</td>
                <td></td>
                <td class="amt">${tpC.rs}</td><td class="amt">${tpC.p}</td>
                <td class="amt">${tpB.rs}</td><td class="amt">${tpB.p}</td>
                <td class="amt">${tpT.rs}</td><td class="amt">${tpT.p}</td>
              </tr>
              <tr style="font-weight:bold; background:#e2e8f0; border-top:2px solid #0f172a;">
                <td></td>
                <td>G/T (Grand Total)</td>
                <td></td>
                <td class="amt">${gtpC.rs}</td><td class="amt">${gtpC.p}</td>
                <td class="amt">${gtpB.rs}</td><td class="amt">${gtpB.p}</td>
                <td class="amt">${gtpT.rs}</td><td class="amt">${gtpT.p}</td>
              </tr>
            </tbody>
          </table>

          <div class="audit-cert">
            <strong>STATUTORY PHYSICAL VERIFICATION & AUDIT CERTIFICATE:</strong><br>
            1. Certified that the closing cash-in-hand balance of Rs. ${Number(t.closingCash).toFixed(2)} has been physically verified by the undersigned and found correct.<br>
            2. Certified that the closing bank balance of Rs. ${Number(t.closingBank).toFixed(2)} agrees with the entries in the Bank Passbook/SNA Portal statement for ${periodMeta.monthText} ${periodMeta.yearText}.<br>
            3. Certified that all cooking cost expenditures billed under Folio 1 conform to sanctioned per-child per-day allocation rules.
            <div class="sig-row">
              <span>Signature of SMC President</span>
              <span>Signature of Head Teacher / Member Secretary</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

export const copyHud = new CopyHud();
