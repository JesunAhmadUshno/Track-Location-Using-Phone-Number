"""Offline smoke test for stages 1-3 (no network, no API key)."""
import pytest
from phonenumbers import NumberParseException

from main import lookup


def test_example_mobile_number_has_region_and_carrier():
    info = lookup("+8801812345678")  # phonenumbers.example_number_for_type("BD", MOBILE)
    assert info["country_code"] == 880
    assert info["region"] == "BD"
    assert info["location"] == "Bangladesh"
    assert info["carrier"] == "Robi"


def test_fixed_line_resolves_to_a_city_not_a_device():
    info = lookup("+88027111234")  # phonenumbers.example_number("BD")
    assert info["location"] == "Dhaka"
    assert info["carrier"] == ""  # carrier data exists only for mobile ranges


@pytest.mark.parametrize("bad", ["+880123", "+12005550123"])
def test_invalid_numbers_are_rejected(bad):
    with pytest.raises(ValueError):
        lookup(bad)


def test_malformed_input_is_rejected():
    with pytest.raises(NumberParseException):
        lookup("not a number")


# Stages 4-5 with the OpenCage client replaced by a fake: no key, no network, no paid call.
# The fixture is hand-written in the shape OpenCage documents for geocode() results
# (a list of dicts with geometry.lat / geometry.lng); it is not a recorded live response.
DHAKA_FIXTURE = [{"formatted": "Dhaka, Bangladesh", "geometry": {"lat": 23.7644, "lng": 90.389}}]


class FakeOpenCage:
    response = DHAKA_FIXTURE

    def __init__(self, key):
        self.key = key

    def geocode(self, query):
        FakeOpenCage.last = (self.key, query)
        return self.response


def test_geocode_returns_first_result_centre(monkeypatch):
    import opencage.geocoder
    from main import geocode

    monkeypatch.setattr(opencage.geocoder, "OpenCageGeocode", FakeOpenCage)
    assert geocode("Dhaka", "test-key") == (23.7644, 90.389)
    assert FakeOpenCage.last == ("test-key", "Dhaka")


def test_geocode_empty_result_raises_lookup_error(monkeypatch):
    import opencage.geocoder
    from main import geocode

    monkeypatch.setattr(FakeOpenCage, "response", [])
    monkeypatch.setattr(opencage.geocoder, "OpenCageGeocode", FakeOpenCage)
    with pytest.raises(LookupError, match="Nowhere"):
        geocode("Nowhere", "test-key")


def test_save_map_writes_html_with_the_pin(tmp_path):
    from main import save_map

    path = save_map(23.7644, 90.389, "Dhaka", path=str(tmp_path / "map.html"))
    html = (tmp_path / "map.html").read_text()
    assert path.endswith("map.html")
    assert "23.7644" in html and "90.389" in html and "Dhaka" in html


def test_main_reports_opencage_errors_without_a_traceback(monkeypatch, capsys):
    import opencage.geocoder
    from main import main

    class Unauthorized(FakeOpenCage):
        def geocode(self, query):
            raise opencage.geocoder.NotAuthorizedError()

    monkeypatch.setenv("OPENCAGE_API_KEY", "bad-key")
    monkeypatch.setattr(opencage.geocoder, "OpenCageGeocode", Unauthorized)
    assert main(["main.py", "+88027111234"]) == 1
    assert "geocode failed (NotAuthorizedError)" in capsys.readouterr().err
