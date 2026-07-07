# Agent Workflow Notes

The travel assistant follows a tool-first workflow:

1. Collect travel requirements from the user.
2. Decide whether external data is needed.
3. Search community guides and reviews when reputation or subjective quality matters.
4. Verify hotels, POIs, weather, and routes with structured data sources.
5. Summarize recommendations with source-aware wording.
6. Save a markdown snapshot of known requirements for debugging and iteration.

Important product constraints:

- Do not invent prices, ratings, hotels, restaurants, weather, or route facts.
- If a tool fails, explain the failure and suggest a verifiable next step.
- Prefer concise follow-up questions when the user has not provided enough constraints.
- Keep generated plans editable and open to revision.
