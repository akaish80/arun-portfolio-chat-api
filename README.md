# Arun Portfolio Chat API

Standalone Vercel Function backend for portfolio chat.

## Endpoint

- `POST /api/chat`

Request body:

```json
{
  "message": "What are Arunkumar's core skills?"
}
```

Response:

```json
{
  "reply": "..."
}
```

## Environment Variables

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, default: `gpt-4.1-mini`)
- `ALLOWED_ORIGIN` (optional, use your frontend origin for CORS)

## Deploy on Vercel

1. Create a new Vercel project from this repository.
2. Add the environment variables above.
3. Deploy.

## Local development (optional)

```bash
npm install -g vercel
vercel dev
```
