# API Contract Usage Guide

## Files

- OpenAPI contract: `/Volumes/ORICO/杨/docs/api/ai-social.openapi.yaml`

## Recommended use

This contract is intended to be imported directly into:

- Apifox
- Postman
- Swagger UI / Swagger Editor
- Stoplight / Redocly toolchain

## Local environment

- API base URL: `http://127.0.0.1:3100`
- Business API prefix: `/api`
- Public endpoints:
  - `GET /health`
  - `POST /auth/wechat`

## Demo accounts

### H5 / user-side

- User: `nova / Demo@123456`
- Digital human: `mobai / Human@123456`

### Admin-side

- Admin: `opsadmin / Admin@123456`

## How frontend / QA should authenticate

1. Call `POST /api/auth/login`
2. Copy `token` from the response
3. Add request header:

```http
Authorization: Bearer <token>
```

## Recommended import workflow

### Apifox

1. Import OpenAPI / Swagger
2. Select file `ai-social.openapi.yaml`
3. Set environment variable `baseUrl=http://127.0.0.1:3100`
4. Run `POST /api/auth/login`
5. Save returned `token` into global auth header

### Postman

1. Import file `ai-social.openapi.yaml`
2. Create environment variable `baseUrl=http://127.0.0.1:3100`
3. Login first
4. Put `Bearer {{token}}` into Authorization

## Engineering notes

- The OpenAPI file is the source of truth for API paths, parameters, auth, and response shapes.
- The two Markdown documents in the project root are for human-readable handoff.
- For frontend integration and API testing, prefer the OpenAPI file first.
