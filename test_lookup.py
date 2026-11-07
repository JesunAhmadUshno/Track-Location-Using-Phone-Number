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
