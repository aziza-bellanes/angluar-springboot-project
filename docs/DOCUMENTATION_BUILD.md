# Rebuilding the document set

The guide and report adapt the BigDataZaaa HTML-to-PDF workflow to ATELIER's exact application colors: midnight `#101d35`, cobalt `#315c91`, sunflower `#e7b84b` and ivory `#f4edde`. Their text and page structure live in `build/content.mjs`; `build/render.mjs` embeds Archivo/Poppins fonts and prints the PDFs with Playwright. The database reference generates its dictionary directly from Flyway V1 and V2.

## Install the documentation dependencies

Use Node 22.23.2 or a compatible newer version, Python 3 and Graphviz (`dot`). From the repository root:

```bash
cd docs/build
npm ci
npx playwright install chromium
cd ../..
```

## Guide and report

```bash
node docs/build/render.mjs
```

Outputs are `docs/guide.pdf`, `docs/report.pdf` and editable HTML under `docs/guide/` and `docs/report/`. Screenshots in `docs/evidence/screenshots/` must exist. The renderer fails if a page overflows or an image is missing. It does not replace visual review of all PDF pages.

## Database reference

```bash
python3 docs/database/generate.py
node docs/database/render.mjs
```

This regenerates `docs/DATABASE.md`, the complete `docs/database/schema.json`, its editable HTML/CSS, relationship graph and `docs/database.pdf`. The main graph under `docs/diagrams/` can be rebuilt with `dot -Tsvg docs/diagrams/database.dot -o docs/diagrams/database.svg` and the analogous PNG command. `python3 docs/build/diagrams.py` regenerates the detailed ER graphs under `docs/diagrams/` directly from the SQL. The simplified `cdc-overview.dot` diagram can be rendered with the same Graphviz commands.

## Browser evidence

`capture.mjs` exercises and captures a running demo instance. It creates and deletes its own catalogue records and places a demonstration bid. Use a disposable demo database, not a real gallery database. The capture expects the demo users and defaults to the isolated audit address:

```bash
ATELIER_URL=http://127.0.0.1:18081 node docs/build/capture.mjs
```

Results go to `docs/evidence/browser-checks.json` and its `screenshots/` directory. The audit used a locally built Java 17 production image with separate MySQL and Mailpit containers. Standard development ports remain those in `compose.yaml`.

## Editable presentation

See [slides/README.md](slides/README.md). Its `build.mjs` uses the official Codex Artifact Tool runtime and validates the PowerPoint before export. The PDF is exported from the finalized PPTX. The core relationship diagram, tables and all slide text remain editable.

## Review and evidence

Keep the date and test results aligned with the actual recorded run. Do not infer VPS deployment or real SMTP delivery from local results. Render all final PDF pages to images with `pdftoppm`, inspect them, and regenerate any document whose content changed.
