/**
 * DHK PM POSHAN & School CashBook Pro
 * Module: src/accounting-engine.js
 * 
 * Strict Double-Entry Statutory Accounting Engine for Assam School Cash Books
 * - Exact Folio Parity: Folio C (Contra), Folio 1 (Cooking Cost), Folio 8 (Teacher Deficit Advance)
 * - User-Autonomous Cooking Cost expenditure entry with statutory rate advisory helpers
 * - Absolute Date Guard: Formats strictly to DD/MM/YY without month-name string slice corruption
 * - Synchronous Audit Shield: Real-time voucher-to-ledger mathematical parity monitoring
 * - Zero Honorarium references
 */

export class AccountingEngine {
  constructor() {
    this.MONTH_MAP = {
      '01': { name: 'January', days: 31, seq: 10 },
      '02': { name: 'February', days: 28, seq: 11 },
      '03': { name: 'March', days: 31, seq: 12 },
      '04': { name: 'April', days: 30, seq: 1 },
      '05': { name: 'May', days: 31, seq: 2 },
      '06': { name: 'June', days: 30, seq: 3 },
      '07': { name: 'July', days: 31, seq: 4 },
      '08': { name: 'August', days: 31, seq: 5 },
      '09': { name: 'September', days: 30, seq: 6 },
      '10': { name: 'October', days: 31, seq: 7 },
      '11': { name: 'November', days: 30, seq: 8 },
      '12': { name: 'December', days: 31, seq: 9 }
    };
  }

  /**
   * Helper: Resolves two-digit leap year days safely
   */
  getDaysInMonth(monthNum, yearNum) {
    const m = String(monthNum).padStart(2, '0');
    const y = parseInt(yearNum, 10);
    if (m === '02') {
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
      return isLeap ? 29 : 28;
    }
    return this.MONTH_MAP[m] ? this.MONTH_MAP[m].days : 30;
  }

  /**
   * Helper: Formats standard numeric date strictly as DD/MM/YY
   */
  formatDate(day, monthNum, yearText) {
    const dd = String(day).padStart(2, '0');
    const mm = String(monthNum).padStart(2, '0');
    const yy = String(yearText).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  /**
   * Primary Double-Entry Compilation Engine
   */
  computeLedger({
    monthNum = '09',
    yearText = '2026',
    opCash = 0,
    opBank = 0,
    enrolled = 0,
    days = 0,
    mealRate = 6.78,
    userCookingCost = null, // If null, auto-calculates; if provided, respects user entry directly
    voucherNo = '1',
    vouchers = [],
    drawer = 'mdm'
  }) {
    const cleanMonthNum = String(monthNum).padStart(2, '0');
    const monthMeta = this.MONTH_MAP[cleanMonthNum] || { name: 'September', days: 30, seq: 6 };
    const monthText = monthMeta.name;
    const lastDay = this.getDaysInMonth(cleanMonthNum, yearText);
    const lastDateFormatted = this.formatDate(lastDay, cleanMonthNum, yearText);

    const safeOpCash = Math.round((parseFloat(opCash) || 0) * 100) / 100;
    const safeOpBank = Math.round((parseFloat(opBank) || 0) * 100) / 100;

    const receipts = [];
    const payments = [];

    // 1. Opening Balance Row (Receipts Page)
    receipts.push({
      date: '1st',
      particulars: 'To Opening Balance (O/B)',
      folio: '',
      cash: safeOpCash,
      bank: safeOpBank,
      total: Math.round((safeOpCash + safeOpBank) * 100) / 100
    });

    let runningCash = safeOpCash;
    let runningBank = safeOpBank;

    // 2. Process User Vouchers (Contra, Bank Credits, Contingencies, Vendor Payments)
    let totalItemizedVouchersCash = 0;
    let totalItemizedVouchersBank = 0;

    vouchers.forEach((v, index) => {
      const amt = Math.round((parseFloat(v.amount) || 0) * 100) / 100;
      if (amt <= 0 && v.type !== 'contra_cash_withdrawal') return;

      const dateStr = v.date ? v.date : lastDateFormatted;
      const vIdentifier = v.voucherNo || `${index + 1}`;

      switch (v.type) {
        case 'contra_cash_withdrawal': {
          // Cash arrives in hand (Receipts)
          receipts.push({
            date: dateStr,
            particulars: 'To Bank Account (Contra)\n(Cash withdrawn from bank for school expenses)',
            folio: 'C',
            cash: amt,
            bank: 0,
            total: amt
          });
          runningCash = Math.round((runningCash + amt) * 100) / 100;

          // Bank balance is drawn down (Payments)
          payments.push({
            date: dateStr,
            particulars: 'By Cash in Hand (Contra)\n(Contra cash withdrawn from bank)',
            folio: 'C',
            cash: 0,
            bank: amt,
            total: amt
          });
          runningBank = Math.round((runningBank - amt) * 100) / 100;
          break;
        }

        case 'bank_credit': {
          // Fund or Grant received into bank account (Receipts)
          receipts.push({
            date: dateStr,
            particulars: v.particulars || `To Allotment / Grant Credited into Bank Account vide Challan/Sanction No. ${vIdentifier}`,
            folio: v.folio || 'G',
            cash: 0,
            bank: amt,
            total: amt
          });
          runningBank = Math.round((runningBank + amt) * 100) / 100;
          break;
        }

        case 'cash_payment': {
          // Custom contingency / fuel / material expenditure from cash
          payments.push({
            date: dateStr,
            particulars: v.particulars || `By Contingency / Operational Expense vide Sub-Voucher No. ${vIdentifier}`,
            folio: v.folio || '2',
            cash: amt,
            bank: 0,
            total: amt
          });
          runningCash = Math.round((runningCash - amt) * 100) / 100;
          totalItemizedVouchersCash = Math.round((totalItemizedVouchersCash + amt) * 100) / 100;
          break;
        }

        case 'bank_payment': {
          // Direct vendor transfer from bank (e.g., SNA / vendor payments)
          payments.push({
            date: dateStr,
            particulars: v.particulars || `By Vendor Payment / Bank Remittance vide Bill No. ${vIdentifier}`,
            folio: v.folio || '3',
            cash: 0,
            bank: amt,
            total: amt
          });
          runningBank = Math.round((runningBank - amt) * 100) / 100;
          totalItemizedVouchersBank = Math.round((totalItemizedVouchersBank + amt) * 100) / 100;
          break;
        }

        default:
          break;
      }
    });

    // 3. User-Autonomous Cooking Cost Expenditure (PM POSHAN Drawer)
    let cookingCostTotal = 0;
    const totalMeals = Math.round((parseInt(enrolled, 10) || 0) * (parseInt(days, 10) || 0));

    if (drawer === 'mdm') {
      if (userCookingCost !== null && userCookingCost !== undefined && userCookingCost !== '') {
        // User explicit override/entry takes absolute priority
        cookingCostTotal = Math.round((parseFloat(userCookingCost) || 0) * 100) / 100;
      } else if (totalMeals > 0 && mealRate > 0) {
        // Advisory statutory calculation
        cookingCostTotal = Math.round((totalMeals * parseFloat(mealRate)) * 100) / 100;
      }

      if (cookingCostTotal > 0) {
        // 4. Folio 8 Temporary Teacher / In-charge Advance (Deficit Balancing)
        // If cash in hand is lower than the required cash cooking cost,
        // the in-charge paid out of pocket. We book Folio 8 to prevent negative physical cash in hand.
        if (runningCash < cookingCostTotal) {
          const deficitAdvance = Math.round((cookingCostTotal - runningCash) * 100) / 100;
          receipts.push({
            date: lastDateFormatted,
            particulars: 'To Temporary Advance from In-charge/Teacher (Out-of-pocket funding)',
            folio: '8',
            cash: deficitAdvance,
            bank: 0,
            total: deficitAdvance
          });
          runningCash = Math.round((runningCash + deficitAdvance) * 100) / 100;
        }

        // Add Cooking Cost Payment Row (Folio 1)
        payments.push({
          date: lastDateFormatted,
          particulars: `By Cooking cost for the month of ${monthText} for ${totalMeals} meals at ${Number(mealRate).toFixed(2)} (Being cash payment incurred towards Cooking cost for the month of ${monthText} for ${totalMeals} meals at ${Number(mealRate).toFixed(2)} vide Sub-Voucher No. ${voucherNo})`,
          folio: '1',
          cash: cookingCostTotal,
          bank: 0,
          total: cookingCostTotal
        });
        runningCash = Math.round((runningCash - cookingCostTotal) * 100) / 100;
        totalItemizedVouchersCash = Math.round((totalItemizedVouchersCash + cookingCostTotal) * 100) / 100;
      }
    }

    // 5. Total Receipts (T/R)
    const receiptRows = receipts.slice(1); // Exclude O/B
    const trCash = Math.round(receiptRows.reduce((s, r) => s + r.cash, 0) * 100) / 100;
    const trBank = Math.round(receiptRows.reduce((s, r) => s + r.bank, 0) * 100) / 100;
    const trTotal = Math.round((trCash + trBank) * 100) / 100;

    // 6. Total Payments (T/P)
    const tpCash = Math.round(payments.reduce((s, p) => s + p.cash, 0) * 100) / 100;
    const tpBank = Math.round(payments.reduce((s, p) => s + p.bank, 0) * 100) / 100;
    const tpTotal = Math.round((tpCash + tpBank) * 100) / 100;

    // 7. Closing Balances (C/B)
    const closingCash = Math.round(Math.max(0, runningCash) * 100) / 100;
    const closingBank = Math.round(runningBank * 100) / 100; // Can be reconciled with passbook

    payments.push({
      date: 'End',
      particulars: 'By Closing Balance (C/B)',
      folio: '',
      cash: closingCash,
      bank: closingBank,
      total: Math.round((closingCash + closingBank) * 100) / 100
    });

    // 8. Grand Totals (G/T)
    const gtReceiptCash = Math.round((safeOpCash + trCash) * 100) / 100;
    const gtReceiptBank = Math.round((safeOpBank + trBank) * 100) / 100;
    const gtReceiptTotal = Math.round((gtReceiptCash + gtReceiptBank) * 100) / 100;

    const gtPaymentCash = Math.round((tpCash + closingCash) * 100) / 100;
    const gtPaymentBank = Math.round((tpBank + closingBank) * 100) / 100;
    const gtPaymentTotal = Math.round((gtPaymentCash + gtPaymentBank) * 100) / 100;

    // 9. Synchronous Audit Shield Parity Check
    const expectedExpenditureTotal = tpTotal;
    const totalVouchersTracked = Math.round((totalItemizedVouchersCash + totalItemizedVouchersBank) * 100) / 100;
    const voucherVariance = Math.round((expectedExpenditureTotal - totalVouchersTracked) * 100) / 100;
    
    // Check contra parity: bank contra payment must match cash contra receipt
    const contraReceipt = receipts.filter(r => r.folio === 'C').reduce((s, r) => s + r.cash, 0);
    const contraPayment = payments.filter(p => p.folio === 'C').reduce((s, p) => s + p.bank, 0);
    const isContraBalanced = Math.abs(contraReceipt - contraPayment) < 0.01;

    // Check grand total parity
    const isGtBalanced = (Math.abs(gtReceiptCash - gtPaymentCash) < 0.01) && 
                         (Math.abs(gtReceiptBank - gtPaymentBank) < 0.01);

    const auditShield = {
      isAuditReady: isGtBalanced && isContraBalanced && (voucherVariance === 0),
      isGtBalanced,
      isContraBalanced,
      totalVouchersTracked,
      expectedExpenditureTotal,
      voucherVariance,
      hasBankDeficit: closingBank < 0,
      validationMessages: []
    };

    if (!isGtBalanced) {
      auditShield.validationMessages.push(`Grand Total Mismatch: Receipts ₹${gtReceiptTotal.toFixed(2)} vs Payments ₹${gtPaymentTotal.toFixed(2)}`);
    }
    if (!isContraBalanced) {
      auditShield.validationMessages.push(`Contra Imbalance: Cash drawn ₹${contraReceipt.toFixed(2)} does not match Bank debit ₹${contraPayment.toFixed(2)}`);
    }
    if (voucherVariance !== 0) {
      auditShield.validationMessages.push(`Voucher Discrepancy: Itemized vouchers (₹${totalVouchersTracked.toFixed(2)}) differ from Total Payments (₹${expectedExpenditureTotal.toFixed(2)}) by ₹${Math.abs(voucherVariance).toFixed(2)}`);
    }
    if (closingBank < 0) {
      auditShield.validationMessages.push(`Bank Overdraft Warning: Closing bank balance is negative (-₹${Math.abs(closingBank).toFixed(2)}). Verify passbook credits.`);
    }

    return {
      monthText,
      cleanMonthNum,
      yearText,
      receipts,
      payments,
      totals: {
        opCash: safeOpCash,
        opBank: safeOpBank,
        trCash,
        trBank,
        trTotal,
        tpCash,
        tpBank,
        tpTotal,
        closingCash,
        closingBank,
        gtReceiptCash,
        gtReceiptBank,
        gtReceiptTotal,
        gtPaymentCash,
        gtPaymentBank,
        gtPaymentTotal
      },
      auditShield
    };
  }

  /**
   * Classified General Ledger Account Extractor
   * Maps every transaction to its statutory ledger folio
   */
  generateClassifiedLedgers(compiledLedger) {
    const ledgers = {
      'C': { folio: 'C', title: 'Bank Contra Account', rows: [], runningBalance: 0 },
      '1': { folio: '1', title: 'Cooking Cost Account', rows: [], runningBalance: 0 },
      '2': { folio: '2', title: 'School Contingency & Material Account', rows: [], runningBalance: 0 },
      '3': { folio: '3', title: 'Vendor & Statutory Remittance Account', rows: [], runningBalance: 0 },
      '8': { folio: '8', title: 'In-charge / Teacher Temporary Advance Account', rows: [], runningBalance: 0 }
    };

    // Parse Receipts
    compiledLedger.receipts.forEach(r => {
      if (r.folio && ledgers[r.folio]) {
        ledgers[r.folio].rows.push({
          date: r.date,
          particulars: r.particulars,
          cbRef: 'Receipts',
          debit: r.cash || r.bank || 0,
          credit: 0
        });
      }
    });

    // Parse Payments
    compiledLedger.payments.forEach(p => {
      if (p.folio && ledgers[p.folio]) {
        ledgers[p.folio].rows.push({
          date: p.date,
          particulars: p.particulars,
          cbRef: 'Payments',
          debit: 0,
          credit: p.cash || p.bank || 0
        });
      }
    });

    return ledgers;
  }
}

export const accountingEngine = new AccountingEngine();
