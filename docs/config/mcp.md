# MCP Notes

The current implementation exposes tools to the Agent through OpenAI-compatible Function Calling rather than direct MCP connections.

The design can be migrated to MCP later:

- AMap tools can become MCP tools for geocoding, POI, weather, and route planning.
- Zhihu search can become an MCP search provider for community content.
- Hotel search can become a dedicated travel-data tool with typed results.

The current Function Calling layer is intentionally simple so the product workflow can be tested without requiring users to configure an MCP runtime.
