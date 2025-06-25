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
