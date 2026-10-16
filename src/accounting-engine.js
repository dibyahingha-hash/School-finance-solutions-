/**
 * Statutory Assam School Double-Entry Accounting Engine
 */

export class AccountingEngine {
  computeLedger({
    monthText = 'September',
    yearText = '2026',
    opCash = 0,
    opBank = 0,
    totalMeals = 0,
    mealRate = 0,
    vouchers = [],
    drawer = 'mdm'
  }) {
    const receipts = [];
    const payments = [];

    // 1. Initial Opening Balance (1st of month)
    receipts.push({
      date: '1st',
      particulars: 'To Opening Balance (O/B)',
      folio: '',
      cash: opCash,
      bank: opBank,
      total: opCash + opBank
    });

    let runningCash = opCash;
    let runningBank = opBank;

    // 2. Process Vouchers (Bank credits, Contra withdrawals)
    vouchers.forEach((v) => {
      const amt = parseFloat(v.amount) || 0;
      if (v.type === 'contra_cash_withdrawal') {
        // Receipt: Cash arrives
        receipts.push({
          date: v.date || `30/${monthText.slice(0,2)}/${yearText.slice(-2)}`,
          particulars: 'To Bank Account (Contra)\n(Cash withdrawn from bank for school expenses)',
          folio: 'C',
          cash: amt,
          bank: 0,
          total: amt
        });
        runningCash += amt;

        // Payment: Bank decreases
        payments.push({
          date: v.date || `30/${monthText.slice(0,2)}/${yearText.slice(-2)}`,
          particulars: 'By Cash in Hand (Contra)\n(Contra cash withdrawn from bank)',
          folio: 'C',
          cash: 0,
          bank: amt,
          total: amt
        });
        runningBank -= amt;
      } else if (v.type === 'bank_credit') {
        receipts.push({
          date: v.date || `15/${monthText.slice(0,2)}/${yearText.slice(-2)}`,
          particulars: v.particulars || 'To Funds Credited to Bank Account',
          folio: v.folio || '',
          cash: 0,
          bank: amt,
          total: amt
        });
        runningBank += amt;
      }
    });

    // 3. Statutory Cooking Cost Expenditure (for MDM drawer)
    let cookingCostTotal = 0;
    if (drawer === 'mdm' && totalMeals > 0 && mealRate > 0) {
      cookingCostTotal = Math.round(totalMeals * mealRate);
      
      // Auto-Deficit Balance (Folio 8)
      // If cash on hand is less than cooking cost, teacher funded the difference out-of-pocket
      if (runningCash < cookingCostTotal) {
        const outOfPocketAdvance = cookingCostTotal - runningCash;
        receipts.push({
          date: `30/${monthText.slice(0,2)}/${yearText.slice(-2)}`,
          particulars: 'To Temporary Advance from In-charge/Teacher (Out-of-pocket funding)',
          folio: '8',
          cash: outOfPocketAdvance,
          bank: 0,
          total: outOfPocketAdvance
        });
        runningCash += outOfPocketAdvance;
      }

      payments.push({
        date: `30/${monthText.slice(0,2)}/${yearText.slice(-2)}`,
        particulars: `By Cooking cost for the month of ${monthText} for ${totalMeals} meals at ${mealRate.toFixed(2)} (Being cash payment incurred towards Cooking cost for the month of ${monthText} for ${totalMeals} meals at ${mealRate.toFixed(2)} vide Sub-Voucher No.`,
        folio: '1',
        cash: cookingCostTotal,
        bank: 0,
        total: cookingCostTotal
      });
      runningCash -= cookingCostTotal;
    }

    // 4. Subtotals (Total Receipts & Total Payments)
    const totalReceiptsCash = receipts.slice(1).reduce((s, r) => s + r.cash, 0);
    const totalReceiptsBank = receipts.slice(1).reduce((s, r) => s + r.bank, 0);
    const totalReceiptsAll = receipts.slice(1).reduce((s, r) => s + r.total, 0);

    const totalPaymentsCash = payments.reduce((s, p) => s + p.cash, 0);
    const totalPaymentsBank = payments.reduce((s, p) => s + p.bank, 0);
    const totalPaymentsAll = payments.reduce((s, p) => s + p.total, 0);

    // 5. Closing Balances
    const closingCash = Math.max(0, runningCash);
    const closingBank = Math.max(0, runningBank);

    payments.push({
      date: 'End',
      particulars: 'By Closing Balance (C/B)',
      folio: '',
      cash: closingCash,
      bank: closingBank,
      total: closingCash + closingBank
    });

    // 6. Grand Totals (G/T)
    const grandReceiptCash = opCash + totalReceiptsCash;
    const grandReceiptBank = opBank + totalReceiptsBank;
    const grandReceiptTotal = grandReceiptCash + grandReceiptBank;

    const grandPaymentCash = totalPaymentsCash + closingCash;
    const grandPaymentBank = totalPaymentsBank + closingBank;
    const grandPaymentTotal = grandPaymentCash + grandPaymentBank;

    return {
      receipts,
      payments,
      totals: {
        trCash: totalReceiptsCash,
        trBank: totalReceiptsBank,
        trTotal: totalReceiptsAll,
        tpCash: totalPaymentsCash,
        tpBank: totalPaymentsBank,
        tpTotal: totalPaymentsAll,
        gtReceiptCash: grandReceiptCash,
        gtReceiptBank: grandReceiptBank,
        gtReceiptTotal: grandReceiptTotal,
        gtPaymentCash: grandPaymentCash,
        gtPaymentBank: grandPaymentBank,
        gtPaymentTotal: grandPaymentTotal,
        closingCash,
        closingBank
      }
    };
  }
}

export const accountingEngine = new AccountingEngine();
