import re

from kernelboard.color import to_color


def test_to_color():
    color = to_color("some string")
    assert re.match(r"^[a-z\-]+$", color) is not None
