/**
 * src/monthly-form.js
 * Monthly Voucher Form & Transaction Controller
 */

import { StatutoryRules } from './statutory-rules.js';

export class MonthlyFormController {
  constructor() {
    this.isNarrationManuallyEdited = false;
    this.bindEvents();
  }

  bindEvents() {
    const narrationEl = document.getElementById('v-narration-preview');
    if (narrationEl) {
      narrationEl.addEventListener('input', () => {
        this.isNarrationManuallyEdited = true;
      });
    }

    const autoInputs = ['v-purpose-input', 'v-payee-input', 'v-ref-input', 'tx-channel', 'cb-sel-month'];
    autoInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.refreshPreview());
        el.addEventListener('change', () => this.refreshPreview());
      }
    });
  }

  resetEditState() {
    this.isNarrationManuallyEdited = false;
  }

  refreshPreview(activeDrawer = 'smc', currentTxType = 'PAYMENT') {
    const preview = document.getElementById('v-narration-preview');
    const folioInput = document.getElementById('v-folio-input');
    if (!preview) return;

    // Strict guard: if manually edited, never touch the contents
    if (this.isNarrationManuallyEdited) return;

    const purposeInput = document.getElementById('v-purpose-input');
    const payeeInput = document.getElementById('v-payee-input');
    const refInput = document.getElementById('v-ref-input');
    const channelInput = document.getElementById('tx-channel');
    const monthInput = document.getElementById('cb-sel-month');

    const purpose = purposeInput ? purposeInput.value.trim() : '';
    const payee = payeeInput ? payeeInput.value.trim() : '';
    const ref = refInput ? refInput.value.trim() : '';
    const channel = channelInput ? channelInput.value : 'CASH';
    const mName = monthInput && monthInput.selectedOptions.length > 0 ? monthInput.selectedOptions[0].text : '';

    const titleCasePurpose = purpose ? (purpose.charAt(0).toUpperCase() + purpose.slice(1)) : '';
    const assignedFolio = StatutoryRules.determineFolio(activeDrawer, currentTxType, purpose);
    if (folioInput) folioInput.value = assignedFolio;

    const vText = StatutoryRules.formatReference(ref, activeDrawer);

    if (currentTxType === 'WITHDRAWAL') {
      const note = purpose ? ` for ${titleCasePurpose}` : ' for school expenses';
      preview.value = `By Cash in Hand (Contra)\n(Contra cash withdrawn from bank${note}${vText})`;
      return;
    }

    if (currentTxType === 'RECEIPT') {
      const defaults = StatutoryRules.getDrawerDefaults(activeDrawer);
      const header = titleCasePurpose ? `To ${titleCasePurpose}` : defaults.grantTitle;
      preview.value = `${header}\n(Being funds received towards ${titleCasePurpose || 'grant'} for ${mName}${vText})`;
      return;
    }

    // PAYMENT
    const itemTitle = titleCasePurpose || 'School Expenditure';
    const payeeText = payee ? ` to ${payee}` : '';
    const channelText = channel === 'BANK' ? ' through Bank transfer' : ' in cash';

    preview.value = `By ${itemTitle}${vText}\n(Being payment incurred towards ${itemTitle}${payeeText}${channelText}${vText})`;
  }
}

