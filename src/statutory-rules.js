/**
 * PM POSHAN Statutory Rules, Schemas & Natural Narration Matcher
 */

export const STATUTORY_CONFIG = {
  GRAIN_PER_STUDENT_GRAMS: {
    LP: 100,  // Bal Vatika to Class 5
    UP: 150   // Classes 6 to 8
  },
  MAX_MONTHLY_ATTENDANCE_VARIANCE: 0.05 // +/- 5%
};

// Statutory Drawer Schemas (Preserved from legacy engine)
export const DRAWER_SCHEMAS = {
  mdm: {
    RECEIPT: [
      { text: "To Cooking Cost Grant received via PFMS/SNA into Bank Account", lf: "5", channel: "BANK", keywords: ["grant", "cooking grant", "fund", "received", "sna"] },
      { text: "To Bank Interest credited in MDM Savings Bank Account as per passbook", lf: "3", channel: "BANK", keywords: ["interest", "bank interest", "savings interest"] },
      { text: "To Bank Account (Contra - Cash drawn for daily marketing)", lf: "C", channel: "CASH", keywords: ["contra", "drawn", "withdrawn", "self", "cheque"] },
      { text: "To Temporary Advance from In-charge/Teacher (Out-of-pocket funding)", lf: "8", channel: "CASH", keywords: ["advance", "deficit", "pocket", "teacher advance"] }
    ],
    PAYMENT: [
      { text: "By Cooking Cost for meals served", lf: "1", channel: "CASH", isMealExpense: true, keywords: ["cooking cost", "marketing", "vegetable", "egg", "spices", "oil"] },
      { text: "By LPG Cylinder / Firewood supply refilling charges for MDM kitchen", lf: "2", channel: "CASH", keywords: ["gas", "lpg", "cylinder", "fuel", "firewood"] },
      { text: "By Cook-cum-Helper monthly engagement honorarium payment", lf: "3", channel: "BANK", keywords: ["cook", "helper", "cch", "honorarium", "salary"] },
      { text: "By Kitchen Devices & Utensils purchased under MDM Grant", lf: "4", channel: "CASH", keywords: ["utensil", "device", "plate", "pot", "kitchen device"] },
      { text: "By Carrying & transportation charges for lifting FCI food grains", lf: "5", channel: "CASH", keywords: ["carriage", "transport", "grain lifting", "fci"] },
      { text: "By Kitchen Garden seeds, manure & minor repair expenses", lf: "6", channel: "CASH", keywords: ["garden", "seed", "kitchen garden"] },
      { text: "By Statutory Bank Charges / SMS alert charges in SNA Account", lf: "7", channel: "BANK", keywords: ["charge", "bank charges", "sms", "service charge"] },
      { text: "By Reimbursement of In-charge out-of-pocket advance (Ledger Folio 8)", lf: "8", channel: "BANK", keywords: ["reimburse", "reimbursement", "refund advance", "repay"] }
    ]
  },
  smc: {
    RECEIPT: [
      { text: "To Composite School Grant received under Samagra Shiksha via PFMS/SNA", lf: "1", channel: "BANK", keywords: ["composite", "school grant", "csg"] },
      { text: "To Sports & Physical Education Grant received via PFMS/SNA", lf: "2", channel: "BANK", keywords: ["sports grant", "sports"] },
      { text: "To Library Books & Learning Materials Grant received", lf: "3", channel: "BANK", keywords: ["library", "tlm grant", "books"] },
      { text: "To Bank Interest credited in SMC Savings / SNA Account as per passbook", lf: "4", channel: "BANK", keywords: ["interest", "bank interest"] },
      { text: "To Community Contribution / Public Donation for School Development", lf: "5", channel: "CASH", keywords: ["donation", "contribution", "public"] },
      { text: "To Bank Account (Contra - Cash drawn for school development)", lf: "C", channel: "CASH", keywords: ["drawn", "contra", "withdrawn"] }
    ],
    PAYMENT: [
      { text: "By Minor Repairs / whitewashing / maintenance of school premises", lf: "1", channel: "CASH", keywords: ["repair", "whitewash", "painting", "maintenance"] },
      { text: "By Purchase of Teaching-Learning Materials (TLM) & stationery", lf: "2", channel: "CASH", keywords: ["tlm", "stationery", "paper", "teaching aids"] },
      { text: "By Electricity bill / drinking water / sanitation facility maintenance", lf: "3", channel: "BANK", keywords: ["electricity", "water", "sanitation", "bill"] },
      { text: "By First-Aid kit medicines and school safety equipment", lf: "4", channel: "CASH", keywords: ["first aid", "medicine", "safety"] },
      { text: "By Sports items and recreational play materials purchased", lf: "5", channel: "CASH", keywords: ["sports item", "balls", "sports goods"] },
      { text: "By Statutory Bank Charges / SMS alert charges in SNA Account", lf: "6", channel: "BANK", keywords: ["charge", "sms", "bank charges"] }
    ]
  },
  sna: {
    RECEIPT: [
      { text: "To Central/State Share SNA Grant received via PFMS limit credit", lf: "1", channel: "BANK", keywords: ["limit", "credit", "sna limit", "grant"] },
      { text: "To Bank Interest / statutory adjustment credited", lf: "2", channel: "BANK", keywords: ["interest", "adjustment"] }
    ],
    PAYMENT: [
      { text: "By Direct Vendor Payment via PFMS SNA Portal for approved activity", lf: "1", channel: "BANK", keywords: ["vendor", "ppa", "vendor payment"] },
      { text: "By Statutory Bank charges / deductions in SNA portal", lf: "2", channel: "BANK", keywords: ["charges", "deduction"] }
    ]
  }
};

/**
 * Natural language phrase matcher (replaces confusing dropdowns)
 */
export function matchNarration(inputQuery, drawer = 'mdm') {
  if (!inputQuery || typeof inputQuery !== 'string') return null;
  const q = inputQuery.toLowerCase().trim();
  const drawerData = DRAWER_SCHEMAS[drawer] || DRAWER_SCHEMAS.mdm;

  // Search across Receipts and Payments
  const pool = [
    ...drawerData.RECEIPT.map(item => ({ ...item, type: 'RECEIPT' })),
    ...drawerData.PAYMENT.map(item => ({ ...item, type: 'PAYMENT' }))
  ];

  for (const item of pool) {
    if (item.keywords && item.keywords.some(k => q.includes(k) || k.includes(q))) {
      return item;
    }
    if (item.text.toLowerCase().includes(q)) {
      return item;
    }
  }

  // Fallback if user types "contra" or "withdrawn"
  if (q.includes('drawn') || q.includes('withdraw') || q.includes('contra')) {
    return {
      text: "To Bank Account (Contra - Cash drawn for expenses)",
      lf: "C",
      channel: "CASH",
      type: "WITHDRAWAL"
    };
  }

  return null;
}

