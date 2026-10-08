# GitHub release cleanup handoff

Date: 2026-10-08. Scope: the `HearthVale/` Git repository only. Sibling repositories, workspace archives, and unrelated files were left alone. No commit, push, APK build, gameplay rebalance, RNG change, or save-format change was made by this cleanup/review.

## Removed

- Temporary release-validation folders from the Phase 8/9, playtest, legacy-audit, magic-alignment, and multi-sell work: pre-edit snapshots, hashes/status listings, logs, screenshots, result summaries, and one-off editing scripts. Permanent handoffs and reusable tests remain.
- Root test/syntax/diff logs and `artifacts/` debug APK copies.
- Generated `www/`, Android Gradle/build/plugin/public-asset output, copied native web assets, generated native configuration, and caches. The normal sync/build commands recreate them.
- Obsolete empty `.gitkeep` files in Content, Story, and UI.

## Public-repository cleanup

- `.gitignore` covers dependencies, coverage, generated mobile output, validation folders, packaged binaries, signing keys, local caches/credentials, environment files, backups, Word temp files, and common editor/OS files. `android/local.properties` remains locally useful and ignored by the Android project.
- Public Markdown uses project-neutral implementation/review wording. Personal Windows paths were converted to repository-relative references where appropriate. Historical reports remain historical rather than being silently rewritten to current mechanics.
- `README.md` now describes HearthVale v0.1, local setup, test commands, browser checks, Android development, repository layout, architecture, save behavior, and the relationship to the sibling LWE-Core checkout. `docs/README.md` distinguishes current corrections from historical design material.
- The Word implementation brief's seven tool-specific phrases were neutralized and its creator metadata was cleared. The edited brief was rendered through Microsoft Word to a 21-page PDF and every page was reviewed as a PNG. No clipping, overlap, broken tables, missing glyphs, or layout regression was found. A pre-cleanup backup remains outside the Git repository and is not part of publication.
- No broad code refactor was attempted. The release cleanup preserved current gameplay behavior and the existing compatibility paths. The one browser assertion that still described obsolete Barrier timing was updated to assert the current next-offensive-action/no-Stability rule.

## Security and publication review

- Publishable text and Word XML/relationships were scanned for credential patterns, private machine paths, and tool-workspace language. No credential candidate or private-machine path remains in publishable content. The only private local path observed is the ignored Android SDK path in `android/local.properties`.
- No unexplained generated or ignored directories remain in the repo. Current ignored local content is limited to `node_modules/` and `android/local.properties`.
- Release metadata is now consistent with the public label: `package.json` and `package-lock.json` use `0.1.0`; Android uses `versionCode 1` and `versionName "0.1.0"`.
- No repository `LICENSE` is present, matching the current LWE-Core repository. Publishing without a license keeps default copyright restrictions; add a license only if third-party reuse is intended.
- The compatible LWE-Core revision used for final verification is `d1a91f588d14b9742dfb20e19dd9d135183799ed`.

## Verification

- Independent final HearthVale suite: **466 passed, 0 failed, 0 skipped**, exit 0, **262324.2891 ms**. This includes both production completion campaigns plus the current magic, reward, Barrier/Teleport, and multi-select-selling regressions.
- Independent final LWE-Core suite: **73 passed, 0 failed, 0 skipped**, exit 0, **6606.0391 ms**.
- Release-cleanup verification before the independent review: **763 browser groups passed** across the ten automated browser runners; changed JavaScript syntax checks passed across **169 files**.
- `npm run build:mobile` succeeded again under package version `0.1.0`; the verification-only `www/` output was removed afterward.
- The implementation brief rendered as **21 pages** and all 21 rendered pages passed visual inspection.
- `git diff --check` passes; the repository's existing LF/CRLF advisories are not whitespace failures.
- Markdown relative-link verification from the cleanup pass reported **0 broken links**.

## Current repository state

The working tree remains intentionally uncommitted. At independent review it contains **67 modified tracked files, 3 intentional tracked deletions, and 70 legitimate untracked files**. The untracked files are current source modules, permanent docs, regression tests, browser harnesses/checkpoints, and fixture generators; there are no unexplained root-level files. The three deletions are obsolete `.gitkeep` files.

The current branch is `packaging/android-playtest`, which is one committed revision ahead of `main` before these uncommitted v0.1 changes. After the final gameplay decision below and a reviewed commit, `main` can be fast-forwarded rather than requiring a conflict-heavy merge.

## Final gameplay decision and playtest

The Poison-on-Pit-exit question is resolved: **successful ordinary Return, Return victory, and Teleport continue to preserve Poison.** The player is expected to use an Antidote or another authored cure rather than receiving a free cure for leaving the Pit. This matches the current runtime and tests, so no gameplay code change was required.

A fresh `v0.1.0` Android debug APK was then built successfully from the cleaned tree and passed the final manual playtest. Other previously deferred balance observations (for example Bow strength or overall difficulty) remain non-blocking observations rather than release changes.

## Final status

**READY FOR PUBLIC GITHUB RELEASE.** Repository cleanup, public presentation, Word-document sanitation/visual QA, version alignment, security checks, automated verification, Android build verification, and final manual playtest are complete. The next step is commit, push, tag/release, and browser deployment.
