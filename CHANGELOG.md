# Changelog

All notable changes to this fork are documented here.

## [1.6.6.4.2] - 2026-02-25
- Fork changes:
  - Fixed `FT_statusesConfig` changes (e.g. highlight color edits) not being pushed to Google Sheets sync
    - `optimizeOperations` now correctly collapses stale `set` ops: a newer `set` for the same key always replaces an older one, regardless of value — previously two different `set` values for the same key would both remain in the queue
    - `updateLocalStorage` no longer overwrites the local `FT_statusesConfig` with stale server data when there is an unpushed local change (detected via diff against `FT_lastSyncedStatusesConfig`); new custom statuses from the server config are still merged in, but local display settings (colors, borders, opacity) are preserved

## [1.6.6.4.1] - 2026-02-24
- Upstream base: `1.6.6.4`
- Fork changes:
  - Non-destructive Google Sheets initialization flow for secondary browsers
  - Safer sync success handling for multiple API response shapes
  - Added guard to prevent empty-browser initialization from overwriting remote data
  - Included kudos storage key in initialization payload
  - Synced custom status definitions via `FT_statusesConfig` (userscript-side)
  - Applied status config before status lists during pull so custom keys load correctly
  - Added userscript fallback to infer missing custom statuses from synced `FT_*` status keys
  - Persisted merged/inferred status config back to local settings for new-device initialization
  - Manual `Sync Now` now saves in-panel settings before syncing, preventing stale highlight/status config uploads
  - Added status-config confirmation logic after sync and automatic re-queue when server response does not confirm `FT_statusesConfig`
  - Fixed pending queue dedupe for status operations (duplicate same-action ops are no longer re-enqueued)
  - Updated remote status-config apply to be deletion-aware (remote config now replaces local status set by storage key)
  - Matched initialize pull behavior with the same deletion-aware status-config replacement semantics
  - Reset Sync Settings now also clears stale sync state keys (`FT_pendingChanges`, `FT_lastSyncedStatusesConfig`)
  - Added debug trace for initialize pull showing how many statuses were applied from remote config
  - Improved mobile reliability for AO3 top-menu dropdown labels by replacing one-shot injection with retry-based injection
  - Added DOM-aware retry triggers (`MutationObserver`, `pageshow`, and `visibilitychange`) so dropdown links appear when menu markup loads late
  - Hardened dropdown username detection with a fallback profile-link lookup and success/failure return flow for `addDropdownOptions`

## Versioning scheme
- Format: `upstream.major.minor.patch.forkPatch`
- Example progression:
  - `1.6.6.4.1`
  - `1.6.6.4.2`
  - upstream updates to `1.6.6.5` -> next fork release `1.6.6.5.1`
