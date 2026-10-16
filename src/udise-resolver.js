/**
 * U-DISE Resolution & Resilient Institutional Profiler
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
      this.inputUdise.onkeydown = (e) => {
        if (e.key === 'Enter') this.handleResolve();
      };
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
      this.btnResolve.textContent = 'Verifying Registry...';
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
      if (this.errorMsg) {
        this.errorMsg.textContent = err.message || 'Lookup failed. Please verify code.';
      }
    } finally {
      if (this.btnResolve) {
        this.btnResolve.textContent = 'Verify & Anchor School Profile';
        this.btnResolve.disabled = false;
      }
    }
  }

  async queryDirectory(udiseCode) {
    // 1. Direct local repository catalog check
    try {
      const res = await fetch('./data/schools.json');
      if (res.ok) {
        const catalog = await res.json();
        if (catalog[udiseCode]) {
          return {
            udise: udiseCode,
            schoolName: catalog[udiseCode].schoolName,
            district: catalog[udiseCode].district,
            block: catalog[udiseCode].block,
            category: catalog[udiseCode].category || 'LP',
            anchoredAt: new Date().toISOString()
          };
        }
      }
    } catch (_) {}

    // 2. Decode district & block hierarchy from U-DISE prefix
    const distPrefix = udiseCode.substring(2, 4);
    const blockPrefix = udiseCode.substring(4, 6);

    const assamDistricts = {
      '01': 'KOKRAJHAR', '02': 'DHUBRI', '03': 'GOALPARA', '04': 'BARPETA',
      '05': 'MORIGAON', '06': 'NAGAON', '07': 'SONITPUR', '08': 'LAKHIMPUR',
      '09': 'DHEMAJI', '10': 'TINSUKIA', '11': 'DIBRUGARH', '12': 'SIBSAGAR',
      '13': 'JORHAT', '14': 'GOLAGHAT', '15': 'DIBRUGARH', '16': 'MAJULI',
      '17': 'KAMRUP METRO', '18': 'KAMRUP RURAL'
    };

    const district = assamDistricts[distPrefix] || 'ASSAM';
    const block = blockPrefix === '03' ? 'KHOWANG' : `BLOCK-${blockPrefix}`;

    // 3. Fallback: prompt for the school name once if missing from catalog
    const enteredName = prompt(
      `School not found in catalog for U-DISE ${udiseCode}.\nDetected: ${district}, ${block}.\n\nEnter Official School Name:`,
      `GOVT. LPS (${udiseCode})`
    );

    return {
      udise: udiseCode,
      schoolName: (enteredName && enteredName.trim()) ? enteredName.trim().toUpperCase() : `GOVT. SCHOOL (${udiseCode})`,
      district: district,
      block: block,
      category: 'LP',
      anchoredAt: new Date().toISOString()
    };
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
    if (inpEnrolled) {
      inpEnrolled.value = profile.enrolled ? profile.enrolled : '';
      inpEnrolled.placeholder = 'Enter enrolled count from register';
      inpEnrolled.removeAttribute('readonly');
    }
  }
}

export const udiseResolver = new UdiseResolver();
