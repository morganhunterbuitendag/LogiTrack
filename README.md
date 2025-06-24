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

### Data directory

The server stores JSON data in a `data/` folder. When deploying to a platform
with a read-only filesystem (e.g. Vercel) specify a writable location with the
`DATA_DIR` environment variable. `/tmp/data` is a good default on such systems.

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
