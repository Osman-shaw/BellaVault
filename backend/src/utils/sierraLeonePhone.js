/**
 * Sierra Leone mobile MSISDN: country code 232 + 8-digit national significant number.
 * Allowlisted prefixes for Orange, Africell, and QCell (common published ranges).
 */

const PREFIXES_ORANGE = new Set(["30", "72", "74", "75", "76", "78"]);
const PREFIXES_AFRICELL = new Set(["73", "79", "88", "99"]);
const PREFIXES_QCELL = new Set(["31", "33", "34", "35", "36", "37"]);

const ALL_PREFIXES = new Set([...PREFIXES_ORANGE, ...PREFIXES_AFRICELL, ...PREFIXES_QCELL]);

const INVALID_MESSAGE =
  "Enter a valid Sierra Leone mobile number (Orange, Africell, or QCell). Use +232 or 0 prefix, e.g. +232 74 123456.";

function carrierLabel(twoDigitPrefix) {
  if (PREFIXES_ORANGE.has(twoDigitPrefix)) return "Orange";
  if (PREFIXES_AFRICELL.has(twoDigitPrefix)) return "Africell";
  if (PREFIXES_QCELL.has(twoDigitPrefix)) return "QCell";
  return null;
}

/**
 * @param {string} raw
 * @returns {{ ok: true, normalized: string, national8: string, carrier: string } | { ok: false, message: string }}
 */
function parseSierraLeoneMobile(raw) {
  if (raw === undefined || raw === null) {
    return { ok: false, message: INVALID_MESSAGE };
  }
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("00232")) d = d.slice(2);
  if (d.startsWith("232")) {
    // already has CC
  } else if (d.startsWith("0") && d.length >= 9) {
    d = `232${d.slice(1)}`;
  } else if (d.length === 8) {
    d = `232${d}`;
  } else {
    return { ok: false, message: INVALID_MESSAGE };
  }

  if (d.length !== 11 || !d.startsWith("232")) {
    return { ok: false, message: INVALID_MESSAGE };
  }

  const national8 = d.slice(3);
  const prefix2 = national8.slice(0, 2);

  if (national8.length !== 8 || !/^\d{8}$/.test(national8)) {
    return { ok: false, message: INVALID_MESSAGE };
  }

  if (!ALL_PREFIXES.has(prefix2)) {
    return { ok: false, message: INVALID_MESSAGE };
  }

  const carrier = carrierLabel(prefix2);
  return {
    ok: true,
    normalized: d,
    national8,
    carrier: carrier || "Mobile",
  };
}

function syntheticEmailForPhone(national8) {
  return `sl.${national8}@phone.bellavault.local`;
}

function maskPhoneNormalized(normalized) {
  if (!normalized || normalized.length < 6) return "••••";
  return `+${normalized.slice(0, 3)} ••• ••${normalized.slice(-2)}`;
}

module.exports = {
  parseSierraLeoneMobile,
  syntheticEmailForPhone,
  maskPhoneNormalized,
  INVALID_MESSAGE,
};
