/**
 * src/monthly-form.js
 * Statutory Narration Generator & Transaction Type Controller
 */

export class MonthlyFormController {
  constructor() {
    this.currentTxType = 'RECEIPT';
    this.activeDrawer = 'mdm';
    this.isNarrationManuallyEdited = false;
    this.bindEvents();
  }

  bindEvents() {
    // 1. Lock narration if manually modified by user
    const narrationBox = document.getElementById('v-narration-preview');
    if (narrationBox) {
      narrationBox.addEventListener('input', () => {
        this.isNarrationManuallyEdited = true;
      });
    }

    // 2. Real-time updates when inputs change (only if not manually locked)
    const inputsToWatch = ['v-purpose-input', 'v-payee-input', 'v-ref-input', 'tx-channel', 'cb-sel-month'];
    inputsToWatch.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.refreshPreview());
        el.addEventListener('change', () => this.refreshPreview());
      }
    });
  }

  // Switches between RECEIPT, WITHDRAWAL, and PAYMENT
  setTransactionType(type) {
    this.currentTxType = type;
    this.isNarrationManuallyEdited = false; // Reset lock when explicitly switching transaction mode

    // Update UI Button Styles exactly as your original code did
    const bR = document.getElementById('btn-tx-receipt');
    const bW = document.getElementById('btn-tx-withdrawal');
    const bP = document.getElementById('btn-tx-payment');
    const f = document.getElementById('v-folio-input');

    if (bR) { bR.style.background = '#f1f5f9'; bR.style.color = '#334155'; bR.style.border = '1px solid #cbd5e1'; }
    if (bW) { bW.style.background = '#f1f5f9'; bW.style.color = '#334155'; bW.style.border = '1px solid #cbd5e1'; }
    if (bP) { bP.style.background = '#f1f5f9'; bP.style.color = '#334155'; bP.style.border = '1px solid #cbd5e1'; }

    if (type === 'RECEIPT') {
      if (bR) { bR.style.background = '#15803d'; bR.style.color = '#fff'; bR.style.border = '2px solid #15803d'; }
      if (f) f.value = 'G';
    } else if (type === 'WITHDRAWAL') {
      if (bW) { bW.style.background = '#0284c7'; bW.style.color = '#fff'; bW.style.border = '2px solid #0284c7'; }
      if (f) f.value = 'C';
    } else {
      if (bP) { bP.style.background = '#dc2626'; bP.style.color = '#fff'; bP.style.border = '2px solid #dc2626'; }
      if (f) f.value = (this.activeDrawer === 'mdm') ? '1' : '2';
    }

    this.refreshPreview();
  }

  // Sets active drawer (mdm, smc, sna)
  setDrawer(drawer) {
    this.activeDrawer = drawer;
    this.refreshPreview();
  }

  // Determines statutory folio based on purpose keywords
  determineFolio(purpose) {
    if (this.currentTxType === 'WITHDRAWAL') return 'C';
    const plower = (purpose || '').toLowerCase();

    if (this.currentTxType === 'RECEIPT') {
      if (plower.includes('interest') || plower.includes('int')) return 'INT';
      if (plower.includes('advance') || plower.includes('teacher') || plower.includes('in-charge')) return '8';
      if (plower.includes('transport')) return 'T';
      if (plower.includes('cooking') || plower.includes('pm poshan') || plower.includes('mdm')) return '1';
      return 'G';
    }

    // PAYMENTS
    if (this.activeDrawer === 'mdm') {
      if (plower.includes('utensil') || plower.includes('plate') || plower.includes('glass') || plower.includes('dish')) return '4';
      if (plower.includes('transport') || plower.includes('carriage') || plower.includes('fare')) return '3';
      if (plower.includes('cook') || plower.includes('honorarium') || plower.includes('cch')) return '2';
      if (plower.includes('advance') || plower.includes('refund') || plower.includes('repay')) return '8';
      return '1';
    } else if (this.activeDrawer === 'smc') {
      if (plower.includes('repair') || plower.includes('plumb') || plower.includes('paint') || plower.includes('elect')) return '5';
      if (plower.includes('stationery') || plower.includes('tlm') || plower.includes('print') || plower.includes('xerox')) return '2';
      if (plower.includes('uniform')) return '6';
      if (plower.includes('sports')) return '7';
      if (plower.includes('advance') || plower.includes('refund')) return '8';
      return '2';
    } else if (this.activeDrawer === 'sna') {
      return 'V';
    }
    return '2';
  }

  // Formats voucher reference string
  formatRef(ref) {
    if (!ref) return '';
    const trimmed = ref.trim();
    if (/cheque|chq|advice|pfms|rtgs|neft/i.test(trimmed)) {
      return ` vide ${trimmed}`;
    }
    if (this.activeDrawer === 'sna') {
      return ` vide PFMS / SNA Debit Advice No. ${trimmed}`;
    }
    return ` vide Sub-Voucher No. ${trimmed}`;
  }

  // Replaces the original refreshModalPreview()
  refreshPreview() {
    const preview = document.getElementById('v-narration-preview');
    const folioInput = document.getElementById('v-folio-input');
    if (!preview) return;

    // RULE 1: If user typed in the box manually, NEVER overwrite it
    if (this.isNarrationManuallyEdited) return;

    const purpose = document.getElementById('v-purpose-input')?.value.trim() || '';
    const payee = document.getElementById('v-payee-input')?.value.trim() || '';
    const ref = document.getElementById('v-ref-input')?.value.trim() || '';
    const channel = document.getElementById('tx-channel')?.value || 'CASH';
    const monthSelect = document.getElementById('cb-sel-month');
    const mName = monthSelect?.selectedOptions?.[0]?.text || '';

    const titleCasePurpose = purpose ? (purpose.charAt(0).toUpperCase() + purpose.slice(1)) : '';
    const assignedFolio = this.determineFolio(purpose);
    if (folioInput) folioInput.value = assignedFolio;

    const vText = this.formatRef(ref);

    // Case A: BANK WITHDRAWAL (CONTRA)
    if (this.currentTxType === 'WITHDRAWAL') {
      const note = purpose ? ` for ${titleCasePurpose}` : ' for school expenses';
      preview.value = `By Cash in Hand (Contra)\n(Contra cash withdrawn from bank${note}${vText})`;
      return;
    }

    // Case B: RECEIPTS (TO...)
    if (this.currentTxType === 'RECEIPT') {
      let header = '';
      let being = '';

      if (purpose.toLowerCase().includes('interest') || purpose.toLowerCase().includes('int')) {
        header = 'To Bank Interest Credited';
        being = `Being savings bank interest credited into account for ${mName}`;
      } else if (purpose.toLowerCase().includes('advance') || purpose.toLowerCase().includes('teacher') || purpose.toLowerCase().includes('in-charge')) {
        header = titleCasePurpose ? `To ${titleCasePurpose}` : 'To Temporary Advance from In-charge/Teacher';
        being = `Being out-of-pocket temporary advance funded for ${mName}`;
      } else if (purpose) {
        header = `To ${titleCasePurpose}`;
        being = `Being funds received towards ${titleCasePurpose} for ${mName}`;
      } else {
        if (this.activeDrawer === 'mdm') header = 'To PM POSHAN Cooking Cost Grant';
        else if (this.activeDrawer === 'smc') header = 'To General School Grant';
        else header = 'To SNA Grant Allocation';
        being = `Being grant allocation received for ${mName}`;
      }

      preview.value = `${header}\n(${being}${vText})`;
      return;
    }

    // Case C: PAYMENTS (BY...)
    const itemTitle = titleCasePurpose || 'School Expenditure';
    const payeeText = payee ? ` to ${payee}` : '';
    const channelText = channel === 'BANK' ? ' through Bank transfer' : ' in cash';

    preview.value = `By ${itemTitle}${vText}\n(Being payment incurred towards ${itemTitle}${payeeText}${channelText}${vText})`;
  }

  // Resets the manual edit flag after a transaction is committed
  resetEditLock() {
    this.isNarrationManuallyEdited = false;
  }
}
