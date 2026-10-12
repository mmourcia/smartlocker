import pathlib
import sys

import pytest

# Rend `custom_components.smart_locker` importable depuis homeassistant/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "homeassistant"))

pytest_plugins = ["pytest_homeassistant_custom_component"]


@pytest.fixture(autouse=True)
def auto_enable(enable_custom_integrations):
    yield
