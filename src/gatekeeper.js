/**
 * Institutional U-DISE Identity, Anti-Exploitation Locks & Third-Party Toll Handshake
 */

import { Validator } from './validator.js';

export class Gatekeeper {
  constructor() {
    this.modal = document.getElementById('modal-paywall');
    this.feeDisplay = document.getElementById('toll-fee-display');
    this.msgDisplay = document.getElementById('toll-message');
    this.btnVerify = document.getElementById('btn-verify-toll');
    this.qrContainer = document.getElementById('toll-qr-container');

    // Escalating toll schedule for school/student shifts
    this.TIER_FEES = [100, 100, 400, 800, 1000];

    // Third-party checkout configuration (replace with your external gateway/portal)
    this.THIRD_PARTY_CHECKOUT_ENDPOINT = 'https://checkout.yourpaymentpartner.com/pay';
  }

  /**
   * Calculates the statutory toll fee based on modification history count
   */
  getEscalatedFee(alterationCount = 0) {
    if (alterationCount <= 0) return this.TIER_FEES[0];
    const index = Math.min(alterationCount - 1, this.TIER_FEES.length - 1);
    return this.TIER_FEES[index];
  }

  /**
   * Checks if the active work session complies with the locked U-DISE & baseline enrollment
   */
  checkAccess({ udise, financialYear, currentEnrollment, baselineRecord, alterationHistory = 0 }) {
    if (!udise || udise.length !== 11) {
      return { allowed: false, error: 'A valid 11-digit U-DISE code is required.' };
    }

    // Lazy baseline initialization on first access of an FY
    if (!baselineRecord || !baselineRecord.enrollment) {
      return {
        allowed: true,
        isNewBaseline: true,
        message: `Baseline enrollment of ${currentEnrollment} set for FY ${financialYear}.`
      };
    }

    // Validate the 5% monthly attendance variance rule
    const varianceCheck = Validator.validateAttendanceVariance(
      baselineRecord.enrollment,
      currentEnrollment
    );

    if (!varianceCheck.allowed) {
      const requiredFee = this.getEscalatedFee(alterationHistory + 1);
      return {
        allowed: false,
        requiresToll: true,
        fee: requiredFee,
        reason: varianceCheck.reason,
        alterationCount: alterationHistory + 1
      };
    }

    return { allowed: true };
  }

  /**
   * Displays the toll notification and provides a direct handoff to the third-party payment partner
   */
  presentThirdPartyTollModal({ udise, financialYear, fee, reason, onPaymentSuccess }) {
    if (!this.modal) return;

    if (this.feeDisplay) this.feeDisplay.textContent = `₹${Number(fee).toFixed(2)}`;
    if (this.msgDisplay) this.msgDisplay.textContent = reason || 'Statutory threshold exceeded for this school code.';

    // Prepare third-party handoff UI
    if (this.qrContainer) {
      this.qrContainer.innerHTML = `
        <div style="font-size:0.85rem; color:#475569; margin-bottom:12px;">
          All toll transactions are processed securely through our external payment partner.
        </div>
        <button id="btn-external-pay" class="btn btn-primary" style="background:#0284c7; width:100%; padding:12px; font-weight:700;">
          💳 Proceed to External Payment Gateway (₹${fee})
        </button>
      `;

      const extBtn = document.getElementById('btn-external-pay');
      if (extBtn) {
        extBtn.onclick = () => {
          this.redirectToThirdPartyGateway({ udise, financialYear, fee });
        };
      }
    }

    // Secondary hook to verify return token/webhook from third party
    if (this.btnVerify) {
      this.btnVerify.textContent = 'I Have Completed Payment (Verify Status)';
      this.btnVerify.onclick = async () => {
        const isVerified = await this.verifyThirdPartyReceipt(udise, financialYear);
        if (isVerified) {
          this.closeModal();
          if (typeof onPaymentSuccess === 'function') onPaymentSuccess();
        } else {
          alert('No verified payment record found from the payment partner. Please complete transaction.');
        }
      };
    }

    this.modal.style.display = 'flex';
  }

  /**
   * Redirects the browser to the third-party checkout provider
   */
  redirectToThirdPartyGateway({ udise, financialYear, fee }) {
    const returnUrl = encodeURIComponent(window.location.href);
    const checkoutUrl = `${this.THIRD_PARTY_CHECKOUT_ENDPOINT}?udise=${udise}&fy=${financialYear}&amount=${fee}&callback=${returnUrl}`;
    window.location.href = checkoutUrl;
  }

  /**
   * Asks your serverless worker or webhook listener if the third party has marked this order paid
   */
  async verifyThirdPartyReceipt(udise, financialYear) {
    try {
      const response = await fetch(`/api/verify-toll?udise=${udise}&fy=${financialYear}`);
      if (!response.ok) return false;
      const data = await response.json();
      return !!data.paid;
    } catch (e) {
      console.warn('Third-party verification fallback trigger:', e);
      return false;
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }
}

export const gatekeeper = new Gatekeeper();

