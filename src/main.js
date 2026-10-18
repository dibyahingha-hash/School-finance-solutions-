/**
 * src/main.js
 * Global bridge and application coordinator
 */

import { MonthlyFormController } from './monthly-form.js';

let formController;

document.addEventListener('DOMContentLoaded', () => {
  formController = new MonthlyFormController();

  // 1. Expose controller methods globally for HTML onclick events
  window.setTransactionType = (type) => {
    formController.setTransactionType(type);
  };

  window.refreshModalPreview = () => {
    formController.refreshPreview();
  };

  window.resetNarrationEditLock = () => {
    formController.resetEditLock();
  };

  // 2. Intercept drawer switches to update activeDrawer
  const existingSwitchDrawer = window.switchDrawer;
  window.switchDrawer = (drawer) => {
    if (typeof existingSwitchDrawer === 'function') {
      existingSwitchDrawer(drawer);
    }
    formController.setDrawer(drawer);
  };

  // 3. Initialize default view
  formController.setTransactionType('RECEIPT');
});
