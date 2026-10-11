# Role illustrations

`hidden-identities-original.png` is an unchanged copy of the supplied PNG sheet.
It is kept outside `public` so the sheet with English captions is not served by the UI.

The six portraits in `public/images/roles` use the existing role IDs as filenames:
`alien`, `spy`, `vampire`, `time_traveler`, `thief`, and `ghost`.
They are 512 × 512 lossless WebP images. The illustration and original background
are cropped above the English caption, fitted without stretching into a shared
480 × 480 area, and given a 16 px cream margin. No SVG conversion or redraw is used.

Crop coordinates and the source SHA-256 are recorded in `crops.json`.
Regenerate with `node scripts/prepare-role-images.mjs` using the installed Sharp
dependency supplied by Next.js. Thai names remain separate HTML text from the role catalog.
