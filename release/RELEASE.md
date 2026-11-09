# Releasing (dev only, never shipped)

This repository is public. Never write a download link, a Drive file id, an owner email or a benefit note here:
a buyer's download link in the repo gives the paid kit away.

The steps, the product table and the ids live in one place, the `ksa-release` skill in the kaiship-business
repository (`.agents/skills/ksa-release/SKILL.md`, steps 0-8). In short:

1. A PR named `release: vX` bumps `product.json` and `tmv/product.json` to `X`, dates the `CHANGELOG.md` section
   and updates the `--tag` example in `release/build.mjs`. Kai merges it.
2. Tag `vX` on `main` and push it. The tag runs `install.yml` on every machine. Wait for green.
3. `node release/build.mjs --tag vX --tier starter|pro|tmv` writes the zips and `SHA256SUMS`. Same ref, same bytes.
   `build.mjs` refuses a tag that differs from either product version.
4. Upload as the skill says (Drive "Manage versions" keeps each buyer link), then download through the buyer link and
   compare size and SHA-256 with `dist/`.
5. Polar edits are additive only (description, benefit note). Kai approves prices, discounts and new benefits.
