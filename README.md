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

   ```shell
   npm install
   ```

3. Docker is required for running the test suite, so please ensure you have it
   installed.

4. Next, you'll need a Postgres database to store leaderboard information. Feel
   free to set this up wherever works best for you -- running it on your local
   machine (directly or with Docker) is usually a smooth way to get going. Once
   your database is up and running, load it with sample data using the provided
   `tests/data.sql` file:

   ```shell
   createdb kernelboard
   psql [postgres_options] kernelboard < tests/data.sql
   ```

   Or, download a database snapshot from Heroku, and install it:

   ```shell
   pg_restore -d kernelboard path/to/snapshot/file
   ```

4. Finally, create a .env file in the root directory of your sandbox with
   SECRET_KEY and DATABASE_URL entries. The secret key can be anything you like;
   `dev` will work well.

   ```env
   SECRET_KEY=dev
   DATABASE_URL=postgresql://user:password@host:port/kernelboard
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

The gunicorn server will use port 8000, so visit http://localhost:8000/health
(instead of port 5000, used by the Flask server).