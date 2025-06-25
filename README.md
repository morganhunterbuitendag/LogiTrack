# LogiTrack

Simple logistics distance calculator with user login.

## Setup

Install dependencies and start the server:

```bash
npm install
npm start
```

If `npm start` fails with an error like `Cannot find package 'nodemailer'`, make sure
the dependencies are installed by running `npm install` first.

This serves the application and API on `http://localhost:3101/`. Open that URL in your browser.

Run tests with:

```bash
npm test
```

### Data storage

Data such as users and producers is stored using
[Vercel KV](https://vercel.com/docs/storage/vercel-kv). When running locally you
need the `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the corresponding
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) environment variables
so the server can access the KV database.

Without these variables the application falls back to storing data on disk or in
memory. This works for local development but **does not persist** in serverless
deployments (for example on Vercel). In such environments user registrations are
lost and the admin board will show no pending approvals. Ensure the KV
connection variables are configured when deploying.

#### Setting up KV on Vercel

1. In your Vercel dashboard go to **Storage → KV** and create a new database.
2. From the database page copy the `KV_REST_API_URL` and `KV_REST_API_TOKEN` values.
3. Add these values as environment variables in your Vercel project settings or in a local `.env` file when testing locally.
4. Redeploy or restart the project so the new variables take effect.

Without this setup the server prints a warning and the registration API returns a
`503` error on Vercel because data cannot be persisted.

### Build

This project does not require a compilation step. The `build` script simply
outputs a message confirming that all files are ready to use:

```bash
npm run build
```

### Password reset emails

To enable password reset emails, set the following environment variables before
starting the server:

```
SMTP_HOST     # SMTP server host
SMTP_PORT     # SMTP server port
SMTP_USER     # username
SMTP_PASS     # password
SMTP_SECURE   # set to "true" if the server requires TLS
```
If these variables are not set, reset links are printed to the console.

### Creating an admin user

If all users have been removed you can add a new administrator via Vercel KV:

```bash
node addAdmin.js morganbuitendag@gmail.com Compal01
```

Ensure the KV connection environment variables are set before running the script.
