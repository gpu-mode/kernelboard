# Heroku Postgres Schema Clone + Fake Data Guide

This guide explains how to:

-   Clone schema from the production database
-   Load it into a separate testing database (BLACK)
-   Remove YoYo migration tables
-   Insert fake data
-   Ensure production database is never modified

------------------------------------------------------------------------

## Environment

App: `kernelboard`\
Production DB: `DATABASE`\
Test DB: `HEROKU_POSTGRESQL_BLACK`

------------------------------------------------------------------------

# 🔒 Safety Rules (MUST FOLLOW)

Production (`DATABASE`) must NEVER be modified.

Allowed operations on production:

-   `pg_dump`
-   `heroku config:get`
-   read-only `SELECT`
-   `\dt`

Never use:

-   `heroku pg:promote`
-   `heroku pg:copy`
-   `DROP/ALTER/INSERT` on `DATABASE`

All write operations must target:

    HEROKU_POSTGRESQL_BLACK

Always include:

    --app kernelboard

------------------------------------------------------------------------

# 🟢 STEP 0 --- Verify Database URLs

``` bash
heroku config:get DATABASE_URL --app kernelboard
heroku config:get HEROKU_POSTGRESQL_BLACK_URL --app kernelboard
```

Confirm they are different hosts.

------------------------------------------------------------------------

# 🟢 STEP 1 --- Reset BLACK (Safe)

⚠️ This affects BLACK only.

``` bash
heroku pg:psql HEROKU_POSTGRESQL_BLACK --app kernelboard -c '
DROP SCHEMA IF EXISTS leaderboard CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
'
```

Do NOT drop `_heroku`.

------------------------------------------------------------------------

# 🟢 STEP 2 --- Export Schema from Production (Read-only)

``` bash
export PGSSLMODE=require

pg_dump "$(heroku config:get DATABASE_URL --app kernelboard)"   --schema-only   --schema=leaderboard   --no-owner --no-privileges   > schema_leaderboard.sql
```

------------------------------------------------------------------------

# 🟢 STEP 3 --- Import Schema into BLACK

``` bash
sed -E '/^CREATE EVENT TRIGGER /,/;$/d; /^ALTER EVENT TRIGGER /d; /^DROP EVENT TRIGGER /d' schema_leaderboard.sql | psql "$(heroku config:get HEROKU_POSTGRESQL_BLACK_URL --app kernelboard)"
```

------------------------------------------------------------------------

# 🟢 STEP 4 --- Remove YoYo Migration Tables (BLACK Only)

``` bash
heroku pg:psql HEROKU_POSTGRESQL_BLACK --app kernelboard -c "
DROP TABLE IF EXISTS leaderboard._yoyo_log CASCADE;
DROP TABLE IF EXISTS leaderboard._yoyo_migration CASCADE;
DROP TABLE IF EXISTS leaderboard._yoyo_version CASCADE;
DROP TABLE IF EXISTS leaderboard.yoyo_lock CASCADE;
"
```

------------------------------------------------------------------------

# 🟢 STEP 5 --- Load Fake Data into BLACK

Ensure you have:

    data_insert_only.sql

Then run:

``` bash
export PGSSLMODE=require

psql "$(heroku config:get HEROKU_POSTGRESQL_BLACK_URL --app kernelboard)"   < data_insert_only.sql
```

------------------------------------------------------------------------

# 🟢 STEP 6 --- Verification

``` bash
heroku pg:psql HEROKU_POSTGRESQL_BLACK --app kernelboard -c "\dt leaderboard.*"
```

``` bash
heroku pg:psql HEROKU_POSTGRESQL_BLACK --app kernelboard -c "SELECT count(*) FROM leaderboard.submission;"
```

------------------------------------------------------------------------

# 🔁 Reproducibility

To recreate the test DB:

1.  Run STEP 1 (reset BLACK)
2.  Run STEP 3 (import schema)
3.  Run STEP 5 (load fake data)

Production remains untouched.

------------------------------------------------------------------------

# ✅ Final Result

-   Production DB unchanged
-   Test DB isolated
-   Schema cloned
-   YoYo removed
-   Fake data loaded
-   Fully reproducible process
