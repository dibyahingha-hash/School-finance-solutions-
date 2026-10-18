/**
 * src/statutory-rules.js
 * Statutory rules, folio mapping, and vocabulary normalization
 */

export const StatutoryRules = {
  getDrawerDefaults(drawer) {
    switch (drawer) {
      case 'mdm':
        return { label: 'MDM Cooking Cost', defaultFolio: '1', grantTitle: 'To PM POSHAN Cooking Cost Grant' };
      case 'sna':
        return { label: 'Canara SNA', defaultFolio: 'V', grantTitle: 'To SNA Grant Allocation' };
      case 'smc':
      default:
        return { label: 'SMC Normal', defaultFolio: '2', grantTitle: 'To General School Grant' };
    }
  },

  determineFolio(drawer, type, purpose) {
    if (type === 'WITHDRAWAL') return 'C';
    const plower = (purpose || '').toLowerCase();

    if (type === 'RECEIPT') {
      if (plower.includes('interest') || plower.includes('int')) return 'INT';
      if (plower.includes('advance') || plower.includes('teacher') || plower.includes('in-charge')) return '8';
      if (plower.includes('transport')) return 'T';
      if (plower.includes('cooking') || plower.includes('pm poshan') || plower.includes('mdm')) return '1';
      return 'G';
    }

    // PAYMENTS
    if (drawer === 'mdm') {
      if (plower.includes('utensil') || plower.includes('plate') || plower.includes('glass') || plower.includes('dish')) return '4';
      if (plower.includes('transport') || plower.includes('carriage') || plower.includes('fare')) return '3';
      if (plower.includes('cook') || plower.includes('honorarium') || plower.includes('cch')) return '2';
      if (plower.includes('advance') || plower.includes('refund') || plower.includes('repay')) return '8';
      return '1';
    } else if (drawer === 'smc') {
      if (plower.includes('repair') || plower.includes('plumb') || plower.includes('paint') || plower.includes('elect')) return '5';
      if (plower.includes('stationery') || plower.includes('tlm') || plower.includes('print') || plower.includes('xerox')) return '2';
      if (plower.includes('uniform')) return '6';
      if (plower.includes('sports')) return '7';
      if (plower.includes('advance') || plower.includes('refund')) return '8';
      return '2';
    } else if (drawer === 'sna') {
      return 'V';
    }
    return '2';
  },

  formatReference(ref, drawer) {
    if (!ref) return '';
    const trimmed = ref.trim();
    if (/cheque|chq|advice|pfms|rtgs|neft/i.test(trimmed)) {
      return ` vide ${trimmed}`;
    }
    if (drawer === 'sna') {
      return ` vide PFMS / SNA Debit Advice No. ${trimmed}`;
    }
    return ` vide Sub-Voucher No. ${trimmed}`;
  }
};

