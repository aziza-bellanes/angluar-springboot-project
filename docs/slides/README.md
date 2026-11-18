# ATELIER presentation source

`build.mjs` authors the 18-slide editable presentation with the official `@oai/artifact-tool` JavaScript package (validated with version 2.8.134). It uses the project palette, fresh screenshots from `docs/evidence/screenshots`, native editable tables and an editable core database diagram. Measured totals load from `docs/evidence/verification.json`. Every slide contains presenter notes with repository source paths.

## Rebuild

Use the official Codex primary runtime. Do not replace the authoring library with python-pptx. The build directory must resolve `@oai/artifact-tool` from the official runtime packages. For example:

```sh
mkdir -p /tmp/atelier-slides/build
ln -s /path/to/codex-primary-runtime/dependencies/node/node_modules /tmp/atelier-slides/build/node_modules
cp docs/slides/build.mjs /tmp/atelier-slides/build/build.mjs
ATELIER_ROOT="$PWD" \
CODEX_RUNTIME=/path/to/codex-primary-runtime \
PRESENTATIONS_SKILL=/path/to/presentations/skills/presentations \
ATELIER_SLIDES_BUILD=/tmp/atelier-audit/slides-build \
ATELIER_SLIDES_OUTPUT=/tmp/atelier-audit/slides-output-new \
/path/to/codex-primary-runtime/dependencies/node/bin/node /tmp/atelier-slides/build/build.mjs
```

The finalizer workspace defaults to `/tmp/atelier-audit` and can be set with `ATELIER_SLIDES_WORKSPACE`. Build and output paths must remain inside it. Select a new output directory for each revision. Validation receipts remain in the build directory, separate from the final outputs. The generated PPTX uses Noto Sans and DejaVu Sans, which should be available when rebuilding.

Export the finalized presentation to PDF with LibreOffice:

```sh
libreoffice -env:UserInstallation=file:///tmp/atelier-slides/lo-profile --headless \
  --convert-to pdf --outdir /tmp/atelier-audit/slides-output-new \
  /tmp/atelier-audit/slides-output-new/slides.pptx
```

Inspect every slide in the generated PNGs and the exported PDF before copying final files to `docs/slides.pptx` and `docs/slides.pdf`.

## Scope

The presentation distinguishes the course requirements from auction extensions. It demonstrates editable roles, stable permission profiles and dynamic user assignment. It acknowledges the Argon-inspired Angular rebuild. Production packaging works locally. A live VPS deployment remains pending, so CDC step 12 is not claimed as complete.
