# Core

Plain JavaScript modules shared independently of the browser interface. No dependencies or build step.

## Draw

`draw(participants, exclusions)` returns `{ giverId, recipientId }` pairs in participant order. People have stable IDs, distinct display names, and optional hints. Rules are directed: Alice not drawing Bob does not also prohibit Bob drawing Alice. Self-assignment is always forbidden. Groups of 2 to 50 are supported.

The algorithm uses randomised bipartite matching with augmenting paths. It finds a matching whenever one exists in O(n³) time, without retrying random full draws indefinitely. Random integers use `crypto.getRandomValues` with rejection sampling to avoid modulo bias. Edge and giver order are shuffled. **Complete assignments are not guaranteed to be uniformly distributed.** Multiple cycles and reciprocal pairs are permitted unless exclusions forbid them.

The optional `randomInt` argument is a deterministic testing seam. The application uses the default cryptographic implementation.

## Invitation format v1

```
#santa=1.<unpadded-base64url-of-UTF8-JSON>
```

Payload fields:

```json
{
  "v": 1,
  "giver": "Alice",
  "recipient": "Bob",
  "hint": "Books",
  "exchange": {
    "name": "Family Christmas",
    "budget": "25 €",
    "date": "2026-12-25",
    "instructions": "Bring a wrapped gift."
  }
}
```

Each invitation includes only that giver's assignment and shared exchange details. It contains no full participant list or draw. The codec limits fields and fragments (8000 characters), checks calendar dates, and rejects malformed encodings, invalid UTF-8, unknown versions, and incorrect field types. Unknown fields are discarded; required fields are checked. Names and text are trimmed and NFC-normalised. UI code must insert them as text, never HTML.

This is encoding, not encryption or authentication. A link can be read, copied, or modified by anyone holding it. Keep v1 decoding compatible with the committed fixture; introduce an explicit new format version if the schema changes incompatibly. The site URL is not embedded in the payload. `invitationUrl` strips query parameters and preserves the hosting subpath.

Budget is free text rather than a currency-specific number. Hints and instructions are static snapshots; changing them after sending requires new links. There is no remote revocation or delivery tracking.
