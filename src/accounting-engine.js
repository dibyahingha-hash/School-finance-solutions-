/**
 * src/accounting-engine.js
 * Double-entry cashbook calculation and audit balancing engine
 */

export class AccountingEngine {
  static computeTotals({ opCash, opBank, transactions }) {
    let cashReceipts = 0;
    let bankReceipts = 0;
    let cashPayments = 0;
    let bankPayments = 0;

    transactions.forEach(t => {
      const amt = parseFloat(t.amt) || 0;
      if (t.type === 'RECEIPT') {
        if (t.channel === 'BANK') bankReceipts += amt;
        else cashReceipts += amt;
      } else if (t.type === 'PAYMENT') {
        if (t.channel === 'BANK') bankPayments += amt;
        else cashPayments += amt;
      } else if (t.type === 'WITHDRAWAL') {
        // Contra: Bank decreases, Cash increases
        cashReceipts += amt;
        bankPayments += amt;
      }
    });

    const totReceiptCash = cashReceipts;
    const totReceiptBank = bankReceipts;
    const gtReceiptCash = opCash + totReceiptCash;
    const gtReceiptBank = opBank + totReceiptBank;

    const totPaymentCash = cashPayments;
    const totPaymentBank = bankPayments;

    const clCash = Math.max(0, gtReceiptCash - totPaymentCash);
    const clBank = Math.max(0, gtReceiptBank - totPaymentBank);

    const gtPaymentCash = totPaymentCash + clCash;
    const gtPaymentBank = totPaymentBank + clBank;

    const isAuditReady = (
      Math.abs(gtReceiptCash - gtPaymentCash) < 0.01 &&
      Math.abs(gtReceiptBank - gtPaymentBank) < 0.01
    );

    return {
      opCash,
      opBank,
      totReceiptCash,
      totReceiptBank,
      gtReceiptCash,
      gtReceiptBank,
      totPaymentCash,
      totPaymentBank,
      clCash,
      clBank,
      gtPaymentCash,
      gtPaymentBank,
      isAuditReady
    };
  }

  static formatCurrency(num) {
    const val = parseFloat(num) || 0;
    const parts = val.toFixed(2).split('.');
    return {
      rs: parts[0],
      p: parts[1]
    };
  }
}

