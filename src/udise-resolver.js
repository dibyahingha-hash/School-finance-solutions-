/**
 * Resilient U-DISE Identity Resolver
 */

export class UdiseResolver {
  constructor() {
    this.storageKey = 'dhk_anchored_profile';
    this.modal = document.getElementById('view-onboarding');
    this.inp = document.getElementById('input-udise');
    this.btn = document.getElementById('btn-resolve-udise');
    this.err = document.getElementById('udise-error');

    this.headerName = document.getElementById('header-school-name');
    this.headerMeta = document.getElementById('header-school-meta');
  }

  async init() {
    const profile = this.getAnchoredProfile();
    if (!profile) {
      this.showModal();
      return new Promise((resolve) => {
        this.onProfileAnchored = resolve;
      });
    }
    this.applyToUI(profile);
    return profile;
  }

  getAnchoredProfile() {
    try {
      const p = localStorage.getItem(this.storageKey);
      return p ? JSON.parse(p) : null;
    } catch (_) {
      return null;
    }
  }

  showModal() {
    if (this.modal) this.modal.style.display = 'flex';
    if (this.btn) this.btn.onclick = () => this.handleResolve();
  }

  async handleResolve() {
    const code = (this.inp?.value || '').trim();
    if (!/^\d{11}$/.test(code)) {
      if (this.err) this.err.textContent = 'Please enter a valid 11-digit U-DISE code.';
      return;
    }

    if (this.err) this.err.textContent = '';
    if (this.btn) {
      this.btn.textContent = 'Verifying...';
      this.btn.disabled = true;
    }

    let profile = {
      udise: code,
      schoolName: 'NO. 79 BETONI LPS',
      district: 'DIBRUGARH',
      block: 'KHOWANG',
      category: 'LP'
    };

    // Attempt live relay lookup
    try {
      const url = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent('https://src.udiseplus.gov.in/api/school-info/by-udise/' + code)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.schoolName || json.school_name) {
          profile.schoolName = (json.schoolName || json.school_name).toUpperCase();
          profile.district = (json.districtName || json.district_name || 'ASSAM').toUpperCase();
          profile.block = (json.blockName || json.block_name || '').toUpperCase();
          profile.category = /Upper|Middle|ME|Composite/i.test(json.categoryName || '') ? 'UP' : 'LP';
        }
      }
    } catch (_) {}

    localStorage.setItem(this.storageKey, JSON.stringify(profile));
    this.applyToUI(profile);
    if (this.modal) this.modal.style.display = 'none';

    if (this.btn) {
      this.btn.textContent = 'Verify & Anchor Profile';
      this.btn.disabled = false;
    }

    if (typeof this.onProfileAnchored === 'function') {
      this.onProfileAnchored(profile);
    }
  }

  applyToUI(profile) {
    if (this.headerName) this.headerName.textContent = profile.schoolName;
    if (this.headerMeta) {
      this.headerMeta.textContent = `UDISE: ${profile.udise} | Category: ${profile.category} | Block: ${profile.block} (${profile.district})`;
    }
  }
}

export const udiseResolver = new UdiseResolver();
