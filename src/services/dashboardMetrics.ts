export const KYC_STEP_TOTAL = 4;
export const PROTECTED_ITEM_TOTAL = 16;
export const VAULT_CAPACITY_GB = 10;

export const getVerifiedStepCount = (profile?: any) =>
  [
    profile?.verifications?.aadhaar,
    profile?.verifications?.pan,
    profile?.verifications?.payment,
    profile?.verifications?.land,
  ].filter(Boolean).length;

export const getProtectedItemCount = (profile?: any) => {
  const verifications = profile?.verifications || {};
  const landRows = Array.isArray(verifications.land?.officialRows)
    ? verifications.land.officialRows.length
    : 0;

  const count =
    (verifications.aadhaar ? 3 : 0) +
    (verifications.pan ? 3 : 0) +
    (verifications.payment ? 2 : 0) +
    (verifications.land ? Math.max(4, Math.min(8, landRows || 4)) : 0);

  return Math.min(PROTECTED_ITEM_TOTAL, count);
};

export const getProtectionScore = (profile?: any) =>
  Math.round((getVerifiedStepCount(profile) / KYC_STEP_TOTAL) * 100);

export const getVaultUsage = (profile?: any) => {
  const protectedItems = getProtectedItemCount(profile);
  const percentage = Math.round((protectedItems / PROTECTED_ITEM_TOTAL) * 100);
  const usedGb = Number(((percentage / 100) * VAULT_CAPACITY_GB).toFixed(1));

  return {
    protectedItems,
    percentage,
    usedGb,
    totalGb: VAULT_CAPACITY_GB,
  };
};

const formatCurrency = (value: any) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? `₹${numberValue.toFixed(2)}` : '';
};

export const getPaymentSummary = (payment?: any) => {
  if (!payment) return 'Payment not captured';

  const total = formatCurrency(payment.amount || payment.totalAmount);
  const base = formatCurrency(payment.baseAmount);
  const gst = formatCurrency(payment.gstAmount);
  const provider = payment.provider || 'Razorpay';

  if (base && gst && total) {
    return `Paid ${base} + ${gst} GST (Total ${total}) via ${provider}`;
  }

  return total ? `Paid ${total} via ${provider}` : `Paid via ${provider}`;
};
