/**
 * Double-Entry Accounting, Deficit Manager & Mandate Engine
 */

export class AccountingEngine {
  constructor() {
    this.EXACT_RECEIPT_LINES = 20;
    this.EXACT_PAYMENT_LINES = 13;
  }

  splitAmount(num) {
    if (num === null || num === undefined || isNaN(num) || num === 0) {
      return { rs: '', p: '' };
    }
    const val = Number(Math.abs(num)).toFixed(2);
    const parts = val.split('.');
    return { rs: parts[0], p: parts[1] };
  }

  getDynamicInstallmentText(vouchers, totalMeals, monthText, yearText) {
    let existingCount = 0;
    for (const v of vouchers) {
      const lfClean = String(v.lf || '').trim();
      const isMealDesc = String(v.desc || '').toLowerCase().includes('cooking cost');
      if (v.type === 'PAYMENT' && (lfClean === '1' || lfClean === '01' || isMealDesc)) {
        existingCount++;
      }
    }
    const inst = existingCount + 1;
    if (totalMeals > 0) {
      return `By Cooking Cost (Inst. ${inst}) towards ${totalMeals} meals sanctioned for ${monthText} ${yearText}`;
    }
    return `By Cooking Cost (Inst. ${inst}) for daily kitchen marketing in ${monthText} ${yearText}`;
  }

  calculateMandate({ rateLp = 0, mealsLp = 0, rateUp = 0, mealsUp = 0 }) {
    const costLp = mealsLp * rateLp;
    const costUp = mealsUp * rateUp;
    const totalMeals = mealsLp + mealsUp;
    const targetExpenditure = costLp + costUp;

    return {
      costLp,
      costUp,
      totalMeals,
      targetExpenditure
    };
  }

  computeLedger({ opCash = 0, opBank = 0, vouchers = [], mandateTarget = 0 }) {
    let totRecCash = opCash;
    let totRecBank = opBank;
    let totPayCash = 0;
    let totPayBank = 0;

    const processedReceipts = [];
    const processedPayments = [];

    // Sort chronologically
    const sorted = [...vouchers].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Initial Opening Balance row
    processedReceipts.push({
      date: '1st',
      particulars: '<strong>To Opening Balance (O/B)</strong>',
      lf: '-',
      voucherNo: '',
      cash: opCash,
      bank: opBank,
      isContra: false
    });

    for (const v of sorted) {
      const amt = parseFloat(v.amount) || 0;
      const isBank = v.channel === 'BANK';

      if (v.type === 'RECEIPT') {
        if (isBank) totRecBank += amt;
        else totRecCash += amt;

        processedReceipts.push({
          date: v.date,
          particulars: v.desc,
          lf: v.lf || '1',
          voucherNo: v.vNo || '',
          cash: isBank ? 0 : amt,
          bank: isBank ? amt : 0,
          isContra: false
        });
      } else if (v.type === 'WITHDRAWAL') {
        // Dual Contra entries
        totRecCash += amt;
        totPayBank += amt;

        processedReceipts.push({
          date: v.date,
          particulars: '<strong>To Bank Account (Contra)</strong><br><small style="color:#555;">(Cash drawn from bank for school expenses)</small>',
          lf: 'C',
          voucherNo: '',
          cash: amt,
          bank: 0,
          isContra: true
        });

        processedPayments.push({
          date: v.date,
          particulars: '<strong>By Cash in Hand (Contra)</strong><br><small style="color:#555;">(Contra cash withdrawn from bank)</small>',
          lf: 'C',
          voucherNo: '',
          cash: 0,
          bank: amt,
          isContra: true
        });
      } else if (v.type === 'PAYMENT') {
        if (isBank) totPayBank += amt;
        else totPayCash += amt;

        processedPayments.push({
          date: v.date,
          particulars: v.desc,
          lf: v.lf || '1',
          voucherNo: v.vNo || '',
          cash: isBank ? 0 : amt,
          bank: isBank ? amt : 0,
          isContra: false
        });
      }
    }

    // Cash Deficit Check
    const rawCloseCash = totRecCash - totPayCash;
    const rawCloseBank = totRecBank - totPayBank;
    const isDeficit = rawCloseCash < 0;
    const pendingAdvance = isDeficit ? Math.abs(rawCloseCash) : 0;

    // Cooking Cost Gap Check
    let bookedCooking = 0;
    for (const v of sorted) {
      const lfClean = String(v.lf || '').trim();
      const isMealDesc = String(v.desc || '').toLowerCase().includes('cooking cost');
      if (v.type === 'PAYMENT' && (lfClean === '1' || lfClean === '01' || isMealDesc)) {
        bookedCooking += parseFloat(v.amount) || 0;
      }
    }
    const mandateGap = mandateTarget - bookedCooking;

    return {
      receipts: processedReceipts,
      payments: processedPayments,
      summary: {
        opCash,
        opBank,
        totRecCash,
        totRecBank,
        totPayCash,
        totPayBank,
        trOnlyCash: totRecCash - opCash,
        trOnlyBank: totRecBank - opBank,
        closingCash: Math.max(0, rawCloseCash),
        closingBank: Math.max(0, rawCloseBank),
        rawCloseCash,
        rawCloseBank,
        isDeficit,
        pendingAdvance,
        bookedCooking,
        mandateGap,
        isAuditReady: Math.abs(mandateGap) <= 0.01 && !isDeficit
      }
    };
  }
}

export const accountingEngine = new AccountingEngine();
        
