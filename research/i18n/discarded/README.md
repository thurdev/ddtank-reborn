# Discarded image batch (2026-10-03)

Every script-rendered PT-BR caption image, the night-grade filter, the dark-mode chrome recolor and the
bespoke dark window frames (`tools/i18n/images/{replace,night-hall,night-loading,dark-mode-skins,dark-frames}.mjs`)
were discarded from the served overlay: some buttons broke, hall captions regressed to Vietnamese after a
later repack, and the night filter looked worse than the original art. The served client is back to 100%
vendor bitmaps; only text (ABC string literals + static-array lazy getters, via `tools/i18n/build-client-art.mjs`)
is patched now.

Nothing binary was copied here -- the generated PNGs lived in a scratch directory outside the repo and are
not reproduced. The historical before/after record (screenshots taken while the batch was live) is still at
`research/i18n/before-after.html` and `research/i18n/darkmode-verify/` -- kept as a record of what was tried,
not as what's currently served.

The reusable inputs for a future AI image-to-image remaster are kept in place and untouched:
- `tools/i18n/images/curated-captions.json` -- VI->PT-BR caption text per image, including the hall labels
- `tools/i18n/images/targets.json` -- the full {swf: {file: viText}} map of every caption that was found
- `research/i18n/image-inventory.json` -- the OCR sweep this was all built from

Plan: redo the actual pixel edits later with an AI image-to-image model (inpaint + style-matched caption),
not the deterministic canvas-drawn renders. Run `node tools/i18n/build-client-art.mjs --images --night --dark`
once that replacement exists to re-wire it into the pipeline (ordering is already fixed there: text always
stages before night-grade, into the same stage root).
