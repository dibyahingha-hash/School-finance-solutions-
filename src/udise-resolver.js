/**
 * U-DISE Resolution & Immutable Institutional Anchor Module
 * Auto-resolves any national school record via open proxy bridges
 */

export class UdiseResolver {
  constructor() {
    this.storageKey = 'poshan_anchored_school_profile';
    this.modal = document.getElementById('view-onboarding');
    this.inputUdise = document.getElementById('input-udise');
    this.btnResolve = document.getElementById('btn-resolve-udise');
    this.errorMsg = document.getElementById('udise-error');

    this.headerSchoolName = document.getElementById('header-school-name');
    this.headerSchoolMeta = document.getElementById('header-school-meta');
  }

  async init() {
    const profile = this.getAnchoredProfile();
    if (!profile) {
      this.showOnboardingModal();
      return new Promise((resolve) => {
        this.onProfileAnchored = resolve;
      });
    }

    this.applyProfileToUI(profile);
    return profile;
  }

  getAnchoredProfile() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  validateUdiseCode(code) {
    const cleaned = String(code || '').trim();
    if (!/^\d{11}$/.test(cleaned)) {
      return { valid: false, error: 'U-DISE code must be exactly 11 numeric digits.' };
    }
    return { valid: true, code: cleaned };
  }

  showOnboardingModal() {
    if (!this.modal) return;
    this.modal.style.display = 'flex';

    if (this.btnResolve) {
      this.btnResolve.onclick = () => this.handleResolve();
    }

    if (this.inputUdise) {
      this.inputUdise.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleResolve();
      });
    }
  }

  hideOnboardingModal() {
    if (this.modal) this.modal.style.display = 'none';
  }

  async handleResolve() {
    const rawVal = this.inputUdise ? this.inputUdise.value : '';
    const validation = this.validateUdiseCode(rawVal);

    if (!validation.valid) {
      if (this.errorMsg) this.errorMsg.textContent = validation.error;
      return;
    }

    if (this.errorMsg) this.errorMsg.textContent = '';
    if (this.btnResolve) {
      this.btnResolve.textContent = 'Resolving National Records...';
      this.btnResolve.disabled = true;
    }

    try {
      const profile = await this.queryDirectory(validation.code);
      this.saveAnchoredProfile(profile);
      this.applyProfileToUI(profile);
      this.hideOnboardingModal();

      if (typeof this.onProfileAnchored === 'function') {
        this.onProfileAnchored(profile);
      }
    } catch (err) {
      if (this.errorMsg) this.errorMsg.textContent = err.message || 'Unable to fetch school details.';
    } finally {
      if (this.btnResolve) {
        this.btnResolve.textContent = 'Verify & Anchor School Profile';
        this.btnResolve.disabled = false;
      }
    }
  }

  /**
   * Fetches real-time school directory records for ANY 11-digit U-DISE code
   */
  async queryDirectory(udiseCode) {
    const endpoints = [
      `https://corsproxy.io/?${encodeURIComponent(
        `https://src.udiseplus.gov.in/api/school-info/by-udise/${udiseCode}`
      )}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(
        `https://src.udiseplus.gov.in/api/school-info/by-udise/${udiseCode}`
      )}`
    ];

    let schoolRecord = null;

    // 1. Try Primary Gateway
    try {
      const resp = await fetch(endpoints[0]);
      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.schoolName || data.school_name)) {
          schoolRecord = data;
        }
      }
    } catch (err) {
      console.warn('Primary open directory gateway busy, trying alternate...', err);
    }

    // 2. Try Alternate Gateway
    if (!schoolRecord) {
      try {
        const resp = await fetch(endpoints[1]);
        if (resp.ok) {
          const wrapper = await resp.json();
          const parsed = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents;
          if (parsed && (parsed.schoolName || parsed.school_name)) {
            schoolRecord = parsed;
          }
        }
      } catch (err) {
        console.warn('Secondary gateway failed:', err);
      }
    }

    // 3. Normalize returned record
    if (schoolRecord) {
      const rawName = schoolRecord.schoolName || schoolRecord.school_name || '';
      const rawDist = schoolRecord.districtName || schoolRecord.district_name || 'DISTRICT';
      const rawBlock = schoolRecord.blockName || schoolRecord.block_name || 'BLOCK';
      const rawCat = schoolRecord.categoryName || schoolRecord.school_category || '';
      const rawEnrol = parseInt(schoolRecord.totalEnrolment || schoolRecord.total_enrolment, 10);

      let category = 'COMPOSITE';
      if (/Primary|LPS|LP/i.test(rawCat) && !/Upper/i.test(rawCat)) {
        category = 'LP';
      } else if (/Upper|ME|MES/i.test(rawCat)) {
        category = 'UP';
      }

      return {
        udise: udiseCode,
        schoolName: rawName.toUpperCase(),
        district: rawDist.toUpperCase(),
        block: rawBlock.toUpperCase(),
        category: category,
        enrolled: !isNaN(rawEnrol) && rawEnrol > 0 ? rawEnrol : 80,
        anchoredAt: new Date().toISOString()
      };
    }

    throw new Error(`U-DISE code ${udiseCode} was not found in the open school registry. Please verify the 11 digits.`);
  }

  saveAnchoredProfile(profile) {
    localStorage.setItem(this.storageKey, JSON.stringify(profile));
  }

  applyProfileToUI(profile) {
    if (this.headerSchoolName) {
      this.headerSchoolName.textContent = profile.schoolName;
    }
    if (this.headerSchoolMeta) {
      this.headerSchoolMeta.textContent = `UDISE: ${profile.udise} | Category: ${profile.category} | Block: ${profile.block} (${profile.district})`;
    }

    const inpEnrolled = document.getElementById('inp-enrolled');
    if (inpEnrolled && profile.enrolled) {
      inpEnrolled.value = profile.enrolled;
    }
  }
}

export const udiseResolver = new UdiseResolver();
