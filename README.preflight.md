# Trae Preflight

This folder is prepared for `wangxt-779-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18079
- API_PORT: 19079
- WEB_PORT: 20079
- DB_PORT: 21079
- REDIS_PORT: 22079

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
