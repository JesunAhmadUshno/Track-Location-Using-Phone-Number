"""Export the phonenumbers metadata the dashboard reads (offline, a few seconds).

Writes:
  results/calling_codes.json   country calling code -> region codes, plus summary counts
  results/example_lookups.json stages 1-2 of main.py run on the library's own example numbers

Only phonenumbers.example_number* values are used, never a real person's number.
Run: python scripts/export_metadata.py
"""
import json
import pathlib
import sys

import phonenumbers
from phonenumbers import PhoneNumberType, geocoder

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from main import lookup  # noqa: E402

TYPE_NAMES = {v: k for k, v in vars(PhoneNumberType).items() if k.isupper()}
OUT = ROOT / "results"


def main():
    OUT.mkdir(exist_ok=True)
    codes = {str(cc): list(regions) for cc, regions in sorted(phonenumbers.COUNTRY_CODE_TO_REGION_CODE.items())}

    rows = []
    for region in sorted(phonenumbers.SUPPORTED_REGIONS):
        seen = set()
        for kind, num in (("example", phonenumbers.example_number(region)),
                          ("mobile", phonenumbers.example_number_for_type(region, PhoneNumberType.MOBILE))):
            if num is None:
                continue
            e164 = phonenumbers.format_number(num, phonenumbers.PhoneNumberFormat.E164)
            if e164 in seen:
                continue
            seen.add(e164)
            info = lookup(e164)
            rows.append({
                "region": region, "source": kind, "e164": e164, "country_code": info["country_code"],
                "description": info["location"], "country_name": geocoder.country_name_for_number(num, "en"),
                "carrier": info["carrier"], "type": TYPE_NAMES[info["type"]],
            })

    mobiles = [r for r in rows if r["source"] == "mobile" or r["type"] in ("MOBILE", "FIXED_LINE_OR_MOBILE")]
    summary = {
        "calling_codes": len(codes),
        "geographic_regions": len(phonenumbers.SUPPORTED_REGIONS),
        "non_geographic_codes": sum(1 for r in codes.values() if r == ["001"]),
        "shared_codes": sum(1 for r in codes.values() if len(r) > 1),
        "regions_on_shared_codes": sum(len(r) for r in codes.values() if len(r) > 1),
        "largest_shared_code": max(codes, key=lambda c: len(codes[c])),
        "example_rows": len(rows),
        "rows_with_description": sum(1 for r in rows if r["description"]),
        "rows_finer_than_country": sum(1 for r in rows if r["description"] and r["description"] != r["country_name"]),
        "mobile_rows": len(mobiles),
        "mobile_rows_with_carrier": sum(1 for r in mobiles if r["carrier"]),
    }
    meta = {"phonenumbers_version": phonenumbers.__version__, "generated_by": "scripts/export_metadata.py"}
    (OUT / "calling_codes.json").write_text(json.dumps({**meta, "summary": summary, "codes": codes}, indent=1) + "\n")
    (OUT / "example_lookups.json").write_text(json.dumps({**meta, "rows": rows}, indent=1) + "\n")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
