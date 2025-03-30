# Kernelboard

This is the repo for Kernelboard, the webapp front end for GPU MODE. Kernelboard
will be a friendly source for information about GPU kernels submitted to the
Discord cluster manager, and will contain helpful links related to GPU MODE.

## Development environment

Here's how to get started:

1. Create and activate a virtual environment:

   ```shell
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```shell
   pip install -r requirements.txt
   ```

3. Create a .env file in the root directory of your sandbox with SECRET_KEY and
   DATABASE_URL entries. The DATABASE_URL should be a Postgres database (in the
   future, we would like to provide a Docker image for the database). The secret
   key can be anything you like; `dev` will work well.
   ```env
   SECRET_KEY=dev
   DATABASE_URL=postgresql://user:password@host:port/dbname
   ```

## Running tests

We use pytest for testing and coverage.py for measuring code coverage. Follow
these steps to run the test suite:

1. Make the project installable:

   ```shell
   pip install -e .
   ```

   This tells `pip` to install the project in editable mode, so that as you make
   changes to your local sandbox, you only need to reinstall if you make
   metadata changes such as adding new dependencies.

2. Next, run pytest:

   ```shell
   pytest -v
   ```

3. Finally, take a look at code coverage:

   ```shell
   coverage run -m pytest
   coverage report -m
   ```

   We would like to keep code coverage high, ideally above 90%.

## Run the development server

Let's get the development server up and running! Use this command:

```
flask --app kernelboard run --debug
```
Once the server is running, open your browser and visit
http://localhost:5000/health

You should see this response, indicating everything is working:

```json
{
  "service": "kernelboard",
  "status": "healthy"
}
```

If making changes to Procfile, gunicorn.conf.py, or other Heroku-related
changes, use this command to test:

```
heroku local web
```

And the server will use port 8000, so visit http://localhost:8000/health
(instead of the Flask server, which used port 5000).