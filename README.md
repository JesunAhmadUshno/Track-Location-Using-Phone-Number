# Track-Location-Using-Phone-Number

Live dashboard: https://jesunahmadushno.github.io/Track-Location-Using-Phone-Number/

Python Projects | Find Phone Number Location Using Python In MAP

**What this really does:** it finds a phone number's *registered region* and the carrier its range was
originally allocated to, then puts a map pin on the centre of that region's name. It does **not** track a
device or find where a phone is: every phone with the same prefix gets the same pin.

## Pipeline

1. `phonenumbers.parse` and `is_valid_number`: split the number into country code and national number.
2. `geocoder.description_for_number`: offline place name for the prefix (often just the country).
3. `carrier.name_for_number`: original carrier of a mobile range (out of date after number porting).
4. `OpenCageGeocode.geocode`: centre point of that place name (needs an OpenCage API key).
5. `folium.Map`: saves `mylocation.html` with a pin on that point.

## Usage

```bash
pip install -r requirements.txt
python main.py +8801812345678                      # stages 1-3, offline
OPENCAGE_API_KEY=your-key python main.py +8801812345678   # also geocodes and writes mylocation.html
```

Sample output of the offline stages for the library's example Bangladeshi mobile number:

```
Bangladesh
Robi
OPENCAGE_API_KEY not set: skipping geocode and map (stages 4-5).
```

Run the offline tests with `python -m pytest -q test_lookup.py`. Regenerate the dashboard data with
`python scripts/export_metadata.py` (writes `results/calling_codes.json` and `results/example_lookups.json`).

## Ethics and privacy

Only look up numbers you own or have permission to look up. The output is what the dialling code already
reveals; it cannot locate a person, and it should not be presented as if it could. Real device location
needs the network operator or the device itself and is legally protected in most countries.
An earlier version committed an API key and a personal number; both are removed from the current code and
the key should be revoked. See [docs/research-review.md](docs/research-review.md) for the full review.

## Libraries

- Phonenumbers Python Library: https://pypi.org/project/phonenumbers/
- OpenCage Geocoding Module for Python: https://pypi.org/project/opencage/
- OpenCage Geocoding API: https://opencagedata.com/
- Folium: https://pypi.org/project/folium/
- PyCharm (Code Editor): https://www.jetbrains.com/pycharm/
