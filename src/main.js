/**
 * src/main.js
 * Application Entry Point
 */

import { MonthlyFormController } from './monthly-form.js';
import { AccountingEngine } from './accounting-engine.js';
import { StatutoryRules } from './statutory-rules.js';

let formController;

document.addEventListener('DOMContentLoaded', () => {
  formController = new MonthlyFormController();

  // Expose necessary triggers to window for HTML button onclicks
  window.refreshModalPreview = () => {
    const drawer = window.activeDrawer || 'smc';
    const txType = window.currentTxType || 'PAYMENT';
    formController.refreshPreview(drawer, txType);
  };

  window.resetNarrationEditFlag = () => {
    formController.resetEditState();
  };
});

export { formController, AccountingEngine, StatutoryRules };

