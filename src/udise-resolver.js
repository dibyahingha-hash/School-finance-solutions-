/**
 * U-DISE Resolution & Immutable Institutional Anchor Module
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

  /**
   * Initializes profile check on startup
   */
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

  /**
   * Reads anchored identity from local storage
   */
  getAnchoredProfile() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Validates 11-digit numerical structure
   */
  validateUdiseCode(code) {
    const cleaned = String(code || '').trim();
    if (!/^\d{11}$/.test(cleaned)) {
      return { valid: false, error: 'U-DISE code must be exactly 11 digits (numeric).' };
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

  /**
   * Resolves the school details via API or fallback directory lookup
   */
  async handleResolve() {
    const rawVal = this.inputUdise ? this.inputUdise.value : '';
    const validation = this.validateUdiseCode(rawVal);

    if (!validation.valid) {
      if (this.errorMsg) this.errorMsg.textContent = validation.error;
      return;
    }

    if (this.errorMsg) this.errorMsg.textContent = '';
    if (this.btnResolve) {
      this.btnResolve.textContent = 'Verifying School Code...';
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
      if (this.errorMsg) this.errorMsg.textContent = err.message || 'Unable to resolve U-DISE code.';
    } finally {
      if (this.btnResolve) {
        this.btnResolve.textContent = 'Verify & Anchor School Profile';
        this.btnResolve.disabled = false;
      }
    }
  }

  /**
   * Queries central directory API or provides standard statutory institutional fallback
   */
  async queryDirectory(udiseCode) {
    try {
      const res = await fetch(`/api/school-directory?udise=${udiseCode}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Local development fallback
    }

    // Default structure conforming to national school profiles
    return {
      udise: udiseCode,
      schoolName: `GOVT. ELEMENTARY SCHOOL (${udiseCode})`,
      category: 'COMPOSITE', // LP, UP, or COMPOSITE
      district: 'STATE DISTRICT',
      block: 'EDUCATION BLOCK',
      enrolled: 120, // Initial default baseline strength
      anchoredAt: new Date().toISOString()
    };
  }

  saveAnchoredProfile(profile) {
    localStorage.setItem(this.storageKey, JSON.stringify(profile));
  }

  applyProfileToUI(profile) {
    if (this.headerSchoolName) {
      this.headerSchoolName.textContent = profile.schoolName.toUpperCase();
    }
    if (this.headerSchoolMeta) {
      this.headerSchoolMeta.textContent = `UDISE: ${profile.udise} | Category: ${profile.category} | Block: ${profile.block || '-'}`;
    }

    // Auto-fill baseline in the form if element is present
    const inpEnrolled = document.getElementById('inp-enrolled');
    if (inpEnrolled && profile.enrolled) {
      inpEnrolled.value = profile.enrolled;
    }
  }
}

export const udiseResolver = new UdiseResolver();

