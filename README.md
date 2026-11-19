# Order Desk Explorer

A static walkthrough of the OB Automation API. No install, no backend.

From this directory:

```bash
python3 -m http.server 8765
```

Open http://localhost:8765

ES modules do not load reliably from a `file://` URL, so use the small server above.

## How to move around

- **Floor** — click a room. Keys `1`–`7` open a worker bay.
- **Guided tour** — from Start, or `#/floor?tour=1`.
- **Simulate** — step PO-4412. Right arrow advances when the step is not a choice.
- **Search** — `/` or the search button. Glossary terms jump to the room that explains them.
- **Challenges** — sixteen short checks. Progress stays in this browser (`localStorage`).

Esc closes search and the side panel.
