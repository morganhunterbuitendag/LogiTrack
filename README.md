# LogiTrack

Simple logistics distance calculator with user login.

## Setup

Install dependencies and start the server:

```bash
npm install
npm start
```

This serves the application and API on `http://localhost:3101/`. Open that URL in your browser.

Run tests with:

```bash
npm test
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
