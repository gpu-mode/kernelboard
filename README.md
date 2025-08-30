# Kernelboard

This is the repo for Kernelboard, the webapp front end for GPU MODE. Kernelboard
is a friendly source for information about GPU kernels submitted to the Discord
cluster manager, and contains helpful links related to GPU MODE.

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

5. You'll also need a Redis instance to store sessions. Again, feel free to set
   this up in whatever way works best for you.

6. [Optional] if you want to test submission end to end, you need to run and setup [discord-cluster-manager](https://github.com/gpu-mode/discord-cluster-manager), otherwise, just set DISCORD_CLUSTER_MANAGER_API_BASE_URL to a dummy url in .env file.

7. Finally, create a .env file in the root directory of your sandbox with
   SECRET_KEY, DATABASE_URL, REDIS_URL and DISCORD_CLUSTER_MANAGER_API_BASE_URL URL entries. The secret key can be
   anything you like; `dev` will work well.

   ```env
   SECRET_KEY=dev
   DATABASE_URL=postgresql://user:password@host:port/kernelboard
   REDIS_URL=redis://localhost:6379
   DISCORD_CLUSTER_MANAGER_API_BASE_URL=http://localhost:8080
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

## Continuous Integration

Tests run automatically in CI via GitHub Actions on all pull requests and pushes to main. The CI workflow runs:

- **Frontend tests**: React/TypeScript tests using Vitest (83 tests)
- **Backend tests**: Python tests using pytest with Docker (42+ tests)
- **Coverage reporting**: Code coverage analysis

See `.github/workflows/test.yml` for the complete CI configuration.

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

## React Web App [WIP]

The React frontend is currently under development. Here's how to run it and view your changes locally.

### Build for Flask (Static Mode)
To build the React app and serve it through the Flask backend at `http://localhost:5000/v2/`:

1. Make changes to your React code.
2. Run the following command to rebuild the static assets:

```bash
cd frontend && npm run build
```
or at root:
```bash
```
npm run heroku-postbuild
```

then run the Flask server:
```
flask --app kernelboard run --debug
```

> **Note:** You need to re-run this command **every time** you update the React code, as Flask serves from the generated `build/` folder.

### Development Mode (Live Reload)
To preview React changes instantly (without rebuilding manually each time):
1. Start the Flask backend server as shown above.
2. In a new terminal, run:

```bash
cd frontend && npm run dev
```

3. Open the React dev server (e.g. `http://localhost:5173/v2/about`) in your browser.

> In this mode, the React app is served separately with hot-reloading. Use it for faster iteration during development.

### Test submission
we pass the submission job to [discord-cluster-manager](https://github.com/gpu-mode/discord-cluster-manager), which will run the job and return the result to the gpumode backend. To test locally end-to-end, you should follow the instructions in the [discord-cluster-manager](https://github.com/gpu-mode/discord-cluster-manager) repo to set up the server locally.

 then run the server:
```bash
python src/kernelbot/main.py --debug
```
and pass the url to your .env file:
```env
DISCORD_CLUSTER_MANAGER_API_BASE_URL=http://localhost:8080
```
Please notice, you need to make sure both of them connects to same db instance.
