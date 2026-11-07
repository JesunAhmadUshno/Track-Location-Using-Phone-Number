// Browser-side stage 1: split an E.164 number into country calling code and national significant number
// by matching it against results/calling_codes.json (exported from the phonenumbers metadata).
// It checks shape only; whether the number range is actually allocated needs the full Python library.

export function inspect(input, codes) {
  const raw = String(input).trim();
  if (!raw) return { ok: false, error: 'Type a number starting with + and its country code.' };
  if (!raw.startsWith('+')) return { ok: false, error: 'E.164 numbers start with + followed by the country calling code.' };
  const digits = raw.slice(1).replace(/[\s().-]/g, '');
  if (!/^\d+$/.test(digits)) return { ok: false, error: 'Only digits, spaces, dots, dashes and brackets are allowed after the +.' };
  if (digits.length > 15) return { ok: false, digits, error: `E.164 allows at most 15 digits; this has ${digits.length}.` };
  // ITU calling codes are prefix-free (1 to 3 digits), so the longest matching prefix is the only one.
  for (let len = 3; len >= 1; len--) {
    const cc = digits.slice(0, len);
    if (codes[cc]) {
      const nsn = digits.slice(len);
      if (!nsn) return { ok: false, digits, cc, regions: codes[cc], error: 'Country code found; now type the rest of the number.' };
      return { ok: true, digits, cc, regions: codes[cc], nsn, nonGeographic: codes[cc].length === 1 && codes[cc][0] === '001' };
    }
  }
  return { ok: false, digits, error: `No country calling code matches the start of +${digits.slice(0, 3)}.` };
}

export function summarize(codes, rows) {
  const lists = Object.values(codes);
  const shared = lists.filter((r) => r.length > 1);
  const mobiles = rows.filter((r) => r.source === 'mobile' || r.type === 'MOBILE' || r.type === 'FIXED_LINE_OR_MOBILE');
  return {
    calling_codes: lists.length,
    non_geographic_codes: lists.filter((r) => r.length === 1 && r[0] === '001').length,
    shared_codes: shared.length,
    regions_on_shared_codes: shared.reduce((s, r) => s + r.length, 0),
    largest_shared_code: Object.keys(codes).reduce((a, b) => (codes[b].length > codes[a].length ? b : a)),
    example_rows: rows.length,
    rows_with_description: rows.filter((r) => r.description).length,
    rows_finer_than_country: rows.filter((r) => r.description && r.description !== r.country_name).length,
    mobile_rows: mobiles.length,
    mobile_rows_with_carrier: mobiles.filter((r) => r.carrier).length,
  };
}
