# Changelog

All notable changes to this fork are documented here.

## Backend Update (2026-10-20)

- **Fixed "Sync failed: Argument too large: value"** — syncing no longer fails for large libraries; when your data is too big for Google's temporary cache, it is skipped and read straight from the sheet instead
- **Action required:** Paste the updated `caching.gs` into your sheet's script editor and redeploy (Deploy → Manage deployments → Edit → New version) to get this fix

## [1.6.7.10.1] - 2026-10-15

- **Improved AO3's Subscribe and Mark for Later buttons** — pick a tag for each under Additional Settings (e.g. "Subscribed", "To Read") and marking a work with it also subscribes you or adds it to Marked for Later on AO3; removing the tag undoes it. Off by default
- **New: Sortable bookmark shortcuts** (Date Bookmarked, Date Updated or Word Count), under Tag And Labels Settings
- **Merged upstream fixes through 1.6.7.10**, including a customizable loading label in settings
- **Failed status changes now undo themselves** — if AO3 rejects a new bookmark, the status, highlight and Google Sheets sync are rolled back instead of showing a status that doesn't exist (works and series)
- **Prefilled bookmark notes stay under AO3's 5000-character limit** by trimming tags first, then the summary; works in multiple series now list all of them
- **"Sync Now" now tells you when a sync actually failed** (and why) instead of always saying it succeeded; changes made mid-sync no longer briefly disappear
- **Fixed connecting a brand-new Google Sheet** skipping the upload of your existing data, leaving the sheet marked "not connected" and clearing your local notes

## [1.6.7.4.5] - 2026-10-15

- **Google Sheets sync no longer asks for cross-site permission** on fresh installs — the script now declares the Google domains it talks to up front (from upstream 1.6.7.10)

## [1.6.7.4.4] - 2026-09-27

- **Option to hide the "Add Note" button on search/bookmark/collection listings** — the button still shows on the fic page itself, and any notes you've already written always display

## [1.6.7.4.3] - 2026-06-17

- **Kudos history import** from [AO3: No Re-Kudos](https://greasyfork.org/en/scripts/551623) — absorbed automatically on first run and kept in sync going forward if you use both
- **Change Status dropdown and note boxes now match your active skin's real styling** (colors, borders, spacing) instead of a generic look
- **Fixed highlight-disabled status tags (e.g. "Dropped", "Finished Reading") stripping a work's normal border and shadow** instead of just skipping the glow effect

## [1.6.7.4.2] - 2026-06-17

- **Fixed AO3's History page not being recognized** — status highlighting, the quick-tag dropdown, and notes now work there too

## [1.6.7.4.1] - 2026-06-17

- **Rebased onto upstream 1.6.7.4**
- **Prefill bookmark note with work details** — auto-fills a customizable template (title, author, fandom, pairings, summary, series) when adding a status tag, with a live preview in settings
- **Highlight priority per status** — when a work matches multiple tracked statuses, the highest-priority one now controls the highlight instead of layering unpredictably
- **Fixed kudos/status/note changes occasionally being lost** if you made a change while a Google Sheets sync was in progress
- **Fixed "Reset Sync Settings" leaving behind stale sync state**

## [1.6.6.4.8] - 2026-05-12

- **Change Status now works on series**, not just individual works — buttons on series pages and the bookmarks listing
- **Fixed several series bookmark bugs**: stale tags/collections being re-sent on update, private/rec settings not applying to updates, wrong dropdown labels on the bookmarks listing, and stale status highlighting after deleting a series bookmark

## [1.6.6.4.7] - 2026-04-27

- **Fixed "Change Status" dropdown items scrolling the page to the top** when clicked

## [1.6.6.4.6] - 2026-04-24

- **Change Status dropdown redesigned** to sit directly in AO3's stats bar
- **Fixed the dropdown menu getting clipped** on bookmark listing pages
- **Added a customizable label** for the Change Status dropdown button
- **Fixed UI preference sync** (dropdown label, etc.) not syncing reliably across devices

## [1.6.6.4.2] - 2026-02-25

- **Fixed status config changes (e.g. highlight color edits) not syncing** to Google Sheets

## [1.6.6.4.1] - 2026-02-24

- **Safer, non-destructive Google Sheets setup** — connecting a second device now checks for existing data first instead of risking an overwrite
- **Custom status tags now sync across devices** along with their colors and settings
- **Fixed "Sync Now" occasionally uploading stale settings**
- **Improved reliability of the AO3 menu dropdown links** on mobile and slow-loading pages

## Versioning scheme

- Format: `upstream.major.minor.patch.forkPatch`
- Example progression:
    - `1.6.6.4.1`
    - `1.6.6.4.2`
    - upstream updates to `1.6.6.5` -> next fork release `1.6.6.5.1`
