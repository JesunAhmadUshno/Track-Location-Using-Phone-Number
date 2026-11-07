"""Find the registered region and carrier of a phone number, then pin that region on a map.

This is region-level metadata from the number's prefix, not device tracking: the map pin sits on
the geocoded centre of a place name (for example "Dhaka"), never on where the phone actually is.

Usage:
    python main.py +12015550123            # stages 1-3 only (offline, no key needed)
    OPENCAGE_API_KEY=... python main.py +12015550123   # also geocodes and writes mylocation.html
"""
import os
import sys

import phonenumbers
from phonenumbers import carrier, geocoder


def lookup(number, lang="en"):
    """Stages 1-3: parse the number and read its offline region description and carrier."""
    parsed = phonenumbers.parse(number)  # raises NumberParseException on malformed input
    if not phonenumbers.is_valid_number(parsed):
        raise ValueError(f"not a valid phone number: {number!r}")
    return {
        "e164": phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164),
        "country_code": parsed.country_code,
        "region": phonenumbers.region_code_for_number(parsed),
        "location": geocoder.description_for_number(parsed, lang),
        "carrier": carrier.name_for_number(parsed, lang),
        "type": phonenumbers.number_type(parsed),
    }


def geocode(location, key):
    """Stage 4: turn the region description into the centre point of that place (OpenCage API)."""
    from opencage.geocoder import OpenCageGeocode

    results = OpenCageGeocode(key).geocode(str(location))
    if not results:
        raise LookupError(f"OpenCage found no place called {location!r}")
    return results[0]["geometry"]["lat"], results[0]["geometry"]["lng"]


def save_map(lat, lng, label, path="mylocation.html"):
    """Stage 5: drop a pin on the geocoded centre and save an HTML map."""
    import folium

    my_map = folium.Map(location=[lat, lng], zoom_start=9)
    folium.Marker([lat, lng], popup=label).add_to(my_map)
    my_map.save(path)
    return path


def main(argv):
    number = argv[1] if len(argv) > 1 else os.environ.get("PHONE_NUMBER")
    if not number:
        from myphone import number  # a library example number, see myphone.py
    info = lookup(number)
    print(info["location"])
    print(info["carrier"])
    key = os.environ.get("OPENCAGE_API_KEY")
    if not key:
        print("OPENCAGE_API_KEY not set: skipping geocode and map (stages 4-5).")
        return 0
    import requests
    from opencage.geocoder import OpenCageGeocodeError

    try:
        lat, lng = geocode(info["location"], key)
    except (OpenCageGeocodeError, requests.exceptions.RequestException, LookupError) as err:
        # The client already retries network errors and server faults with backoff; what is left
        # (bad key, quota, rate limit, offline, no match) is reported in one line, exit code 1.
        print(f"geocode failed ({type(err).__name__}): {err}", file=sys.stderr)
        return 1
    print(lat, lng)
    print("saved", save_map(lat, lng, info["location"]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
