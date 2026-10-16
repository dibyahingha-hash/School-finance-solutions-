/**
 * Statutory Constraint Validator: Ceiling Math (M <= W x E) & Attendance Variance
 */

import { STATUTORY_CONFIG } from './statutory-rules.js';

export class Validator {
  /**
   * Validates if monthly meals fit within enrolled capacity
   */
  static validateMealCeiling(workingDays, enrolledStudents, totalMeals) {
    const W = parseInt(workingDays, 10) || 0;
    const E = parseInt(enrolledStudents, 10) || 0;
    const M = parseInt(totalMeals, 10) || 0;

    if (W <= 0) return { valid: false, error: "Working days must be greater than 0." };
    if (W > 31) return { valid: false, error: "Working days cannot exceed calendar month days." };
    if (E <= 0) return { valid: false, error: "Baseline student enrollment is required." };

    const maxPermissibleMeals = W * E;

    if (M > maxPermissibleMeals) {
      return {
        valid: false,
        error: `Statutory Ceiling Violation: Max permissible meals for ${E} students across ${W} cooking days is ${maxPermissibleMeals}. You entered ${M}.`,
        maxPermissibleMeals,
        rate: ((M / maxPermissibleMeals) * 100).toFixed(1)
      };
    }

    const attendanceRate = maxPermissibleMeals > 0 ? ((M / maxPermissibleMeals) * 100).toFixed(1) : 0;

    return {
      valid: true,
      maxPermissibleMeals,
      attendanceRate,
      warning: attendanceRate < 40 ? "Warning: Attendance rate is under 40%. Requires departmental justification." : null
    };
  }

  /**
   * Enforces the intra-year +/- 5% attendance shift guardrail
   */
  static validateAttendanceVariance(baselineEnrollment, targetEnrollment) {
    const base = parseFloat(baselineEnrollment) || 0;
    const target = parseFloat(targetEnrollment) || 0;
    if (base <= 0) return { allowed: true };

    const variance = Math.abs(target - base) / base;
    if (variance > STATUTORY_CONFIG.MAX_MONTHLY_ATTENDANCE_VARIANCE) {
      return {
        allowed: false,
        variancePercent: (variance * 100).toFixed(1),
        requiresToll: true,
        reason: `Enrollment change of ${(variance * 100).toFixed(1)}% exceeds the statutory 5% intra-year threshold.`
      };
    }
    return { allowed: true, variancePercent: (variance * 100).toFixed(1), requiresToll: false };
  }
}

