# Sigil backend (AWS)

A single dependency-free Lambda (`index.mjs`) behind an API Gateway HTTP API,
with one DynamoDB table. Modeled on the BinderBooks sync backend, grown into
real per-user accounts + a server-authoritative game economy.

```
Browser (GitHub Pages)  ──HTTPS──>  API Gateway HTTP API ($default)  ──>  Lambda sigil-sync  ──>  DynamoDB "sigil"
```

## What the API does

| Route                | Auth   | Purpose                                                        |
|----------------------|--------|---------------------------------------------------------------|
| `POST /register`     | public | create account (+ starter coins), returns session token       |
| `POST /login`        | public | verify password, returns session token + profile              |
| `POST /logout`       | user   | invalidate the current session token                          |
| `GET  /me`           | user   | username, isAdmin, profile (app boot)                         |
| `GET  /cards`        | public | the card DB (canon) — the engine loads this                   |
| `GET  /packs`        | public | pack definitions                                              |
| `GET  /profile`      | user   | coins, collection, decks                                      |
| `PUT  /profile`      | user   | save decks (coins/collection are server-owned, not writable)  |
| `POST /match/start`  | user   | issue a single-use reward nonce for a campaign match          |
| `POST /reward`       | user   | consume the nonce; grant coins on a win                       |
| `POST /openpack`     | user   | spend coins, server-side pack RNG, add cards to collection    |
| `PUT  /cards`        | admin  | overwrite the card DB (Admin CardEditor)                      |
| `PUT  /packs`        | admin  | overwrite pack definitions (Admin PackEditor)                 |

Passwords are hashed with `scrypt` (node:crypto). Sessions are random 32-byte
tokens stored in DynamoDB with a TTL. Coins/collection only ever change via
`/reward` and `/openpack` (and the registration starter grant). Anti-cheat is
light by design — see the header comment in `index.mjs`.

## One-time provisioning (manual, no IaC)

Requires the AWS CLI authenticated (`aws login`) in `us-west-2`. All free-tier.

### 1. DynamoDB table

```bash
aws dynamodb create-table --table-name sigil --region us-west-2 \
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# enable TTL so expired sessions/match-nonces auto-delete
aws dynamodb update-time-to-live --table-name sigil --region us-west-2 \
  --time-to-live-specification "Enabled=true,AttributeName=ttl"
```

### 2. IAM role for the Lambda

Create a role `sigil-sync-role` trusted by `lambda.amazonaws.com`, with
`AWSLambdaBasicExecutionRole` (CloudWatch logs) + a policy allowing
`dynamodb:GetItem/PutItem/UpdateItem/DeleteItem/Query` on the `sigil` table.

```bash
aws iam create-role --role-name sigil-sync-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name sigil-sync-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam put-role-policy --role-name sigil-sync-role --policy-name sigil-ddb \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["dynamodb:GetItem","dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:DeleteItem","dynamodb:Query"],"Resource":"arn:aws:dynamodb:us-west-2:*:table/sigil"}]}'
```

### 3. Lambda function

```bash
# from aws/ — package the single file
Compress-Archive -Force -Path index.mjs -DestinationPath lambda.zip   # PowerShell
aws lambda create-function --function-name sigil-sync --region us-west-2 \
  --runtime nodejs20.x --handler index.handler \
  --role arn:aws:iam::<ACCOUNT_ID>:role/sigil-sync-role \
  --environment "Variables={TABLE_NAME=sigil,ADMIN_USER=<your-username>,SESSION_TTL_DAYS=30}" \
  --zip-file fileb://lambda.zip
```

`ADMIN_USER` is the username that, when registered, is flagged admin (unlocks the
Admin tab + `PUT /cards` / `PUT /packs`). Register that username after deploy.

### 4. API Gateway HTTP API

Create an HTTP API with a `$default` route → Lambda `sigil-sync` integration
(payload v2), and enable CORS:

- Allowed origins: your Pages origin (`https://ajhollowayvrm.github.io`) and `http://localhost:5173`
- Allowed methods: `GET, PUT, POST, OPTIONS`
- Allowed headers: `content-type, x-session-token`

Note the invoke URL (e.g. `https://xxxx.execute-api.us-west-2.amazonaws.com`).
Set it as the frontend's `VITE_API_BASE` (see the repo root `.env` / deploy workflow).

### 5. Seed the card DB + packs

```bash
npm install            # gets the @aws-sdk/* dev deps
node aws/seed.mjs      # seeds CARDS#DB from src/data/cards.json and default themed packs
```

## Redeploying code

```bash
./aws/deploy.ps1                      # code only
./aws/deploy.ps1 -AdminUser <you>     # code + (re)set env vars
```

## Smoke test

```bash
BASE=https://xxxx.execute-api.us-west-2.amazonaws.com
curl -s $BASE/cards | head -c 200                                  # public card DB
curl -s -XPOST $BASE/register -d '{"username":"alice","password":"hunter2"}'   # -> {token,...}
curl -s $BASE/me -H "x-session-token: <token>"                    # -> profile
```
