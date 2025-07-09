from bs4 import BeautifulSoup
from flask import Blueprint, flash, render_template_string


def test_error_flash_message_rendering(client):
    """
    Test that error flash messages are properly rendered in the template.
    """
    # Create a test blueprint with a route that sets a flash message
    blueprint = Blueprint("test", __name__)

    @blueprint.route("/test-error-flash")
    def test_flash():
        flash("Test error flash message", category="error")
        return render_template_string(
            """
            {% extends "base.html" %}
            {% block content %}
            <div>Test content</div>
            {% endblock %}
        """
        )

    # Register the blueprint with the test app
    client.application.register_blueprint(blueprint)

    # Make the request
    response = client.get("/test-error-flash")
    assert response.status_code == 200

    soup = BeautifulSoup(response.data, "html.parser")

    # Check that the toast container exists
    toast_container = soup.find("div", id="toast-container-error")
    assert toast_container is not None

    # Check that the flash message template exists
    flash_template = soup.find("div", class_="toast-template-error")
    assert flash_template is not None

    # Check that the flash message content is correct
    assert flash_template.get("data-message") == "Test error flash message"

    # Check that the default toast container exists but is empty
    toast_container = soup.find("div", id="toast-container-default")
    assert toast_container is not None
    assert toast_container.get_text(strip=True) == ""

    # Check that no default flash message template exists
    flash_template = soup.find("div", class_="toast-template-default")
    assert flash_template is None


def test_default_flash_message_rendering(client):
    """
    Test that default flash messages are properly rendered in the template.
    """
    # Create a test blueprint with a route that sets a flash message
    blueprint = Blueprint("test", __name__)

    @blueprint.route("/test-default-flash")
    def test_flash():
        flash("Test default flash message")
        return render_template_string(
            """
            {% extends "base.html" %}
            {% block content %}
            <div>Test content</div>
            {% endblock %}
        """
        )

    # Register the blueprint with the test app
    client.application.register_blueprint(blueprint)

    # Make the request
    response = client.get("/test-default-flash")
    assert response.status_code == 200

    soup = BeautifulSoup(response.data, "html.parser")

    # Check that the toast container exists
    toast_container = soup.find("div", id="toast-container-default")
    assert toast_container is not None

    # Check that the flash message template exists
    flash_template = soup.find("div", class_="toast-template-default")
    assert flash_template is not None

    # Check that the flash message content is correct
    assert flash_template.get("data-message") == "Test default flash message"

    # Check that the error toast container exists but is empty
    toast_container = soup.find("div", id="toast-container-error")
    assert toast_container is not None
    assert toast_container.get_text(strip=True) == ""

    # Check that no flash error message template exists
    flash_template = soup.find("div", class_="toast-template-error")
    assert flash_template is None


def test_no_flash_message(client):
    """
    Test that flash message containers don't exist when no flash message is set.
    """
    # Create a test blueprint with a route that doesn't set a flash message
    blueprint = Blueprint("test", __name__)

    @blueprint.route("/test-no-flash")
    def test_no_flash():
        return render_template_string(
            """
            {% extends "base.html" %}
            {% block content %}
            <div>Test content</div>
            {% endblock %}
        """
        )

    # Register the blueprint with the test app
    client.application.register_blueprint(blueprint)

    # Make the request
    response = client.get("/test-no-flash")
    assert response.status_code == 200

    soup = BeautifulSoup(response.data, "html.parser")

    toast_container = soup.find("div", id="toast-container-default")
    assert toast_container is not None
    assert toast_container.get_text(strip=True) == ""
    flash_template = soup.find("div", class_="toast-template-default")
    assert flash_template is None

    toast_container = soup.find("div", id="toast-container-error")
    assert toast_container is not None
    assert toast_container.get_text(strip=True) == ""
    flash_template = soup.find("div", class_="toast-template-error")
    assert flash_template is None
