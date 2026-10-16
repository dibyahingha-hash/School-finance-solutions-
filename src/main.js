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
    // 1. Reset button handles immediate local wipe
    const btnReset = document.getElementById('btn-reset-profile');
    if (btnReset) {
      btnReset.onclick = () => {
        localStorage.removeItem('dhk_anchored_profile');
        location.reload();
      };
    }

    // 2. Wire navigation tabs
    this._initNavigation();

    // 3. Populate Financial Years (Full historical and future range)
    this._populateFinancialYears();

    // 4. Resolve School Profile
    this.schoolProfile = await udiseResolver.init();

    // 5. Initialize Monthly Form
    this.monthlyForm = new MonthlyForm();
    this.monthlyForm.activeSchoolMeta = this.schoolProfile;
    window.monthlyForm = this.monthlyForm;

    // 6. Load initial period
    await this.monthlyForm.loadActivePeriod();
  }

  _populateFinancialYears() {
    const selFy = document.getElementById('sel-fy');
    if (!selFy) return;

    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const endYear = currentYear + 4;
    const years = [];

    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }

    selFy.innerHTML = years.map(y => {
      const nextY = String(y + 1).slice(-2);
      const isSelected = y === 2026 ? 'selected' : '';
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
      this._renderCopyHud();
    } else if (view === 'stock') {
      this._renderStockRegister();
    }
  }

  _renderCopyHud() {
    const m = this.monthlyForm.selMonth ? this.monthlyForm.selMonth.value : '09';
    const y = this.monthlyForm.selFy ? this.monthlyForm.selFy.value : '2026';
    const drawer = this.monthlyForm.currentDrawer;

    const rec = storage.getRecord(this.schoolProfile.udise, drawer, y, m);
    const opCash = rec ? rec.opCash : (parseFloat(this.monthlyForm.inpObCash?.value) || 0);
    const opBank = rec ? rec.opBank : (parseFloat(this.monthlyForm.inpObBank?.value) || 0);
    const vouchers = rec ? rec.vouchers : this.monthlyForm.currentVouchers;
    const enrolled = rec ? rec.enrolled : (parseInt(this.monthlyForm.inpEnrolled?.value, 10) || 0);
    const days = rec ? rec.days : (parseInt(this.monthlyForm.inpDays?.value, 10) || 0);
    const rate = rec ? rec.rate : (parseFloat(this.monthlyForm.inpRate?.value) || 0);

    const mSelect = this.monthlyForm.selMonth;
    const monthText = mSelect ? mSelect.options[mSelect.selectedIndex].text : 'September';

    const ledgerData = accountingEngine.computeLedger({
      monthText,
      yearText: y,
      opCash,
      opBank,
      totalMeals: enrolled * days,
      mealRate: rate,
      vouchers,
      drawer
    });

    copyHud.render(
      ledgerData,
      this.schoolProfile,
      { monthText, yearText: y }
    );
  }

  _renderStockRegister() {
    const stockContainer = document.getElementById('view-stock-register');
    if (!stockContainer) return;

    const e = parseInt(this.monthlyForm.inpEnrolled?.value, 10) || 0;
    const w = parseInt(this.monthlyForm.inpDays?.value, 10) || 0;
    const totalMeals = e * w;
    const grainGrams = this.schoolProfile.category === 'UP' ? 150 : 100;
    const statutoryKgDrawn = ((totalMeals * grainGrams) / 1000).toFixed(2);
    const statutoryQtlDrawn = (statutoryKgDrawn / 100).toFixed(3);

    stockContainer.innerHTML = `
      <div class="card">
        <h3>📦 PM POSHAN Food Grain (Rice) Stock Register</h3>
        <p style="font-size:0.85rem; color:#64748b; margin-top:4px;">
          Statutory allotment calculated at ${grainGrams}g per student per meal.
        </p>
        <div class="grid-3" style="margin-top:14px;">
          <div class="form-group">
            <label>Total Meals Served</label>
            <input type="text" value="${totalMeals}" readonly class="form-control" style="background:#f1f5f9; font-weight:bold;">
          </div>
          <div class="form-group">
            <label>Grain Consumed (Kg)</label>
            <input type="text" value="${statutoryKgDrawn} Kg" readonly class="form-control" style="background:#f1f5f9; font-weight:bold; color:var(--primary);">
          </div>
          <div class="form-group">
            <label>Grain Consumed (Quintals)</label>
            <input type="text" value="${statutoryQtlDrawn} Qtl" readonly class="form-control" style="background:#f1f5f9; font-weight:bold; color:var(--accent);">
          </div>
        </div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.boot();
});
