# API Configuration

This project uses multiple external services. Keep all credentials in `.env.local`; never commit real keys or tokens.

## OpenAI-compatible LLM API

- Purpose: Agent reasoning and Function Calling
- Endpoint: `${LLM_BASE_URL}/chat/completions`
- Environment variables: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`
- Requirement: OpenAI-compatible chat completions with tool calling support

## AMap Web Service API

- Purpose: geocoding, POI search, weather, driving and walking routes
- Endpoint: `https://restapi.amap.com/v3`
- Server environment variable: `AMAP_MAPS_API_KEY`
- Browser static map variable: `NEXT_PUBLIC_AMAP_MAPS_API_KEY`
- Used endpoints:
  - `/geocode/geo`
  - `/place/text`
  - `/weather/weatherInfo`
  - `/direction/driving`
  - `/direction/walking`

## Zhihu Open Platform API

- Purpose: community reviews, travel guides, hotel reputation, and pitfall checks
- Endpoint: `https://developer.zhihu.com/api/v1/content`
- Environment variable: `ZHIHU_API_KEY`
- Auth: Bearer token and `X-Request-Timestamp`
- Used endpoints:
  - `/zhihu_search`
  - `/global_search`
  - `/hot_list`

## Meituan Travel Search

- Purpose: hotel search and comparison
- Default local config: `~/.config/meituan-travel/config.json`
- Optional environment variable: `MEITUAN_TRAVEL_TOKEN`
- The raw Markdown response is parsed into structured hotel data in `lib/meituan-parser.ts`.
