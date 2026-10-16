/**
 * Main Application Bootstrapper & View Router
 */

import { udiseResolver } from './udise-resolver.js';
import { MonthlyForm } from './monthly-form.js';
import { copyHud } from './copy-hud.js';
import { accountingEngine } from './accounting-engine.js';
import { storage } from './storage.js';

class App {
  constructor() {
    this.schoolProfile = null;
    this.monthlyForm = null;
    this.activeView = 'entry';
  }

  async boot() {
    // Wire Reset Button IMMEDIATELY so it always works
    const btnReset = document.getElementById('btn-reset-profile');
    if (btnReset) {
      btnReset.onclick = () => {
        localStorage.removeItem('poshan_anchored_school_profile');
        localStorage.removeItem('poshan_school_profile');
        location.reload();
      };
    }

    // 1. Resolve and anchor School Identity via U-DISE
    this.schoolProfile = await udiseResolver.init();

    // 2. Initialize FY Selector (Back 3 years, forward 1 year)
    this._populateFinancialYears();

    // 3. Instantiate Monthly Form Module
    this.monthlyForm = new MonthlyForm();
    this.monthlyForm.activeSchoolMeta = this.schoolProfile;
    window.monthlyForm = this.monthlyForm; // Expose for inline UI actions (delete, etc.)

    // 4. Wire View Navigation (Tabs)
    this._initNavigation();

    // 5. Initial Period Load
    await this.monthlyForm.loadActivePeriod();
  }

  _populateFinancialYears() {
    const selFy = document.getElementById('sel-fy');
    if (!selFy) return;

    const currentYear = new Date().getFullYear();
    const years = [
      currentYear - 3,
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1
    ];

    selFy.innerHTML = years.map(y => {
      const nextY = String(y + 1).slice(-2);
      const isSelected = y === currentYear ? 'selected' : '';
      return `<option value="${y}" ${isSelected}>FY ${y}-${nextY}</option>`;
    }).join('');
  }

  _initNavigation() {
    const tabs = [
      { id: 'tab-nav-entry', view: 'entry', elId: 'view-monthly-entry' },
      { id: 'tab-nav-hud', view: 'hud', elId: 'view-copy-hud' },
      { id: 'tab-nav-stock', view: 'stock', elId: 'view-stock-register' }
    ];

    tabs.forEach(tab => {
      const btn = document.getElementById(tab.id);
      if (btn) {
        btn.addEventListener('click', () => {
          tabs.forEach(t => {
            const b = document.getElementById(t.id);
            const p = document.getElementById(t.elId);
            if (b) b.classList.remove('active');
            if (p) p.style.display = 'none';
          });

          btn.classList.add('active');
          const panel = document.getElementById(tab.elId);
          if (panel) panel.style.display = 'block';

          this.activeView = tab.view;
          this._onViewSwitched(tab.view);
        });
      }
    });
  }

  async _onViewSwitched(view) {
    if (view === 'hud') {
      await this._renderCopyHud();
    } else if (view === 'stock') {
      this._renderStockRegister();
    }
  }

  async _renderCopyHud() {
    const m = this.monthlyForm.selMonth ? this.monthlyForm.selMonth.value : '04';
    const y = this.monthlyForm.selFy ? this.monthlyForm.selFy.value : '2026';
    const drawer = this.monthlyForm.currentDrawer;

    const rec = await storage.getRecord(this.schoolProfile.udise, drawer, y, m);
    const vouchers = rec ? (rec.vouchers || []) : this.monthlyForm.currentVouchers;
    const opCash = rec ? rec.opCash : (parseFloat(this.monthlyForm.inpObCash?.value) || 0);
    const opBank = rec ? rec.opBank : (parseFloat(this.monthlyForm.inpObBank?.value) || 0);

    // Compute active double-entry ledger sheet
    const ledgerData = accountingEngine.computeLedger({
      opCash,
      opBank,
      vouchers,
      mandateTarget: 0
    });

    const mSelect = this.monthlyForm.selMonth;
    const monthText = mSelect ? mSelect.options[mSelect.selectedIndex].text : '';

    const drawerTitles = {
      mdm: 'PM POSHAN Cooking Cost',
      smc: 'SMC Normal Savings',
      sna: 'Canara / State SNA Account'
    };

    copyHud.render(
      ledgerData,
      {
        schoolName: this.schoolProfile.schoolName,
        udise: this.schoolProfile.udise
      },
      {
        monthText,
        yearText: y,
        drawerTitle: drawerTitles[drawer] || 'Cash Book'
      }
    );
  }

  _renderStockRegister() {
    const stockContainer = document.getElementById('view-stock-register');
    if (!stockContainer) return;

    const totalMeals = parseInt(this.monthlyForm.inpTotalMeals?.value, 10) || 0;
    const grainGrams = this.schoolProfile.category === 'UP' ? 150 : 100;
    const statutoryKgDrawn = ((totalMeals * grainGrams) / 1000).toFixed(2);
    const statutoryQtlDrawn = (statutoryKgDrawn / 100).toFixed(3);

    stockContainer.innerHTML = `
      <div class="card">
        <h3>📦 PM POSHAN Food Grain (Rice) Stock Register</h3>
        <p style="font-size:0.85rem; color:#64748b; margin-top:-4px;">
          Statutory allotment calculated at ${grainGrams}g per student per meal.
        </p>
        <div class="grid-3" style="margin-top:12px;">
          <div class="form-group">
            <label>Total Meals Served</label>
            <input type="text" value="${totalMeals}" readonly style="background:#f1f5f9; font-weight:bold;">
          </div>
          <div class="form-group">
            <label>Grain Consumed (Kg)</label>
            <input type="text" value="${statutoryKgDrawn} Kg" readonly style="background:#f1f5f9; font-weight:bold; color:var(--primary);">
          </div>
          <div class="form-group">
            <label>Grain Consumed (Quintals)</label>
            <input type="text" value="${statutoryQtlDrawn} Qtl" readonly style="background:#f1f5f9; font-weight:bold; color:var(--accent);">
          </div>
        </div>
      </div>
    `;
  }
}

// Bootstrap once DOM content is parsed
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.boot();
});
