/**
 * DHK PM POSHAN & School CashBook Pro
 * Module: src/udise-resolver.js
 * 
 * Statutory School Profile & U-DISE Registry Resolver
 * - Resolves and validates 11-digit Assam U-DISE identification codes
 * - Anchors school metadata: Name, Category (LP/UP), Block, District, and Accounts
 * - Ensures local persistence via storage engine
 */

import { storage } from './storage.js';

export class UdiseResolver {
  constructor() {
    // Built-in registry cache for instant offline resolution
    this.KNOWN_SCHOOLS = {
      '18150301501': {
        udise: '18150301501',
        schoolName: 'NO. 79 BETONI LPS',
        category: 'LP',
        block: 'KHOWANG',
        district: 'DIBRUGARH',
        state: 'ASSAM',
        accountMdm: 'PM POSHAN SNA / CANARA BANK',
        accountSmc: 'SMC GENERAL SAVINGS'
      }
    };
  }

  /**
   * Validates standard 11-digit Indian U-DISE code format
   */
  validateUdise(udiseStr) {
    const cleaned = String(udiseStr || '').trim();
    return /^\d{11}$/.test(cleaned);
  }

  /**
   * Resolves school metadata by U-DISE code from local cache or storage
   */
  async resolve(udiseInput) {
    const cleanUdise = String(udiseInput || '').trim();

    if (!this.validateUdise(cleanUdise)) {
      throw new Error('Invalid U-DISE code: Must be exactly 11 numeric digits.');
    }

    // 1. Check currently active saved profile
    const activeProfile = storage.getProfile();
    if (activeProfile && activeProfile.udise === cleanUdise) {
      return activeProfile;
    }

    // 2. Check local offline registry
    if (this.KNOWN_SCHOOLS[cleanUdise]) {
      const found = { ...this.KNOWN_SCHOOLS[cleanUdise] };
      storage.saveProfile(found);
      return found;
    }

    // 3. Fallback: Create structured institutional record from U-DISE prefix
    const stateCode = cleanUdise.slice(0, 2);
    const isAssam = stateCode === '18';

    const fallbackProfile = {
      udise: cleanUdise,
      schoolName: `GOVT SCHOOL (${cleanUdise})`,
      category: 'LP',
      block: 'EDUCATIONAL BLOCK',
      district: isAssam ? 'ASSAM DISTRICT' : 'DISTRICT',
      state: isAssam ? 'ASSAM' : 'INDIA',
      accountMdm: 'PM POSHAN SNA ACCOUNT',
      accountSmc: 'SMC SAVINGS ACCOUNT'
    };

    storage.saveProfile(fallbackProfile);
    return fallbackProfile;
  }

  /**
   * Saves or updates full institutional school profile manually
   */
  saveManualProfile(profileData) {
    if (!this.validateUdise(profileData.udise)) {
      throw new Error('Cannot save profile: Invalid 11-digit U-DISE code.');
    }

    const cleanedData = {
      udise: String(profileData.udise).trim(),
      schoolName: String(profileData.schoolName || 'SCHOOL').trim().toUpperCase(),
      category: profileData.category === 'UP' ? 'UP' : 'LP',
      block: String(profileData.block || '').trim().toUpperCase(),
      district: String(profileData.district || '').trim().toUpperCase(),
      state: 'ASSAM',
      accountMdm: String(profileData.accountMdm || '').trim(),
      accountSmc: String(profileData.accountSmc || '').trim()
    };

    storage.saveProfile(cleanedData);
    return cleanedData;
  }
}

export const udiseResolver = new UdiseResolver();
