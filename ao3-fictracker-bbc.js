// ==UserScript==
// @name         AO3 FicTracker - BlackBatCat's Version
// @author       infiniMotis, BlackBatCat
// @version      1.6.7.10.1
// @namespace    https://github.com/Wolfbatcat/AO3-FicTracker
// @description  Customized fork with chapter tracking, kudos button hiding, and Rose Piné-inspired theme. Tracks favorite, finished, to-read and disliked fanfics on AO3 with sync across devices.
// @license      GNU GPLv3
// @icon         https://archiveofourown.org/favicon.ico
// @match        *://archiveofourown.org/*
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @supportURL   https://github.com/Wolfbatcat/AO3-FicTracker/issues
// ==/UserScript==

// Description:
// Customized fork of infiniMotis's AO3 FicTracker. Original: https://greasyfork.org/en/scripts/513435-ao3-fictracker
//
// FicTracker helps you manage your fanfics on AO3. Mark fics with a status, add custom tags and notes,
// and highlight tracked works on listing pages.
//
// Key Features:
// **Status Tracking:** Mark fics with a custom status and highlight them on listing pages.
// **Custom Tags & Notes:** Add personal tags and notes to any fic for easy organization.
// **Data Synchronization:** Tracking data is linked to your AO3 account and syncs across devices.
// **Google Sheets Storage Sync:** Syncs highlights, notes, and status data across multiple devices.
// **Quick Access:** Use the dropdown menu in the top right corner of AO3 to access your tracked lists.
// **Optimized Performance:** Features only run on relevant pages for quick and efficient performance.
//
// Fork-Only Additions:
// **Chapter Tracking:** On chapter pages, use the "Mark Current Chapter" button to save your reading progress to your note automatically.
// **Kudos Sync:** Giving kudos hides the kudos button across all your devices, with cross-compatibility for the "AO3: No Re-Kudos" script.
// **Series Support:** Change Status also works on series, not just individual works.
//
// Usage Instructions:
// 1. **Tracking Fics:** On a fic's page, click the status button. On listing pages, use the dropdown in the bottom right corner of each work.
// 2. **Settings Panel:** Find the settings panel at the bottom of your AO3 preferences page.
// 3. **Accessing Your Lists:** Use the dropdown menu in the top right corner of AO3 to access your tracked lists.
// 4. **Multi-Device Sync (Optional):**
//    - On your main device, initialize Google Sheets storage via the settings panel.
//    - On other devices, enter the same Sheet URL and initialize — data will sync automatically.

(function () {
    "use strict";

    // Prevent script from running multiple times
    if (window.FicTrackerInitialized) {
        return;
    }
    window.FicTrackerInitialized = true;

    // [FORK: update-notice] Shown once at the top of AO3 pages after FicTracker updates, until dismissed.
    // Edit freely - HTML is allowed
    const UPDATE_NOTICE_MESSAGE = `FicTracker has been updated to version ${GM_info.script.version}! <a href="https://github.com/Wolfbatcat/AO3-FicTracker-BlackBatCat/blob/main/CHANGELOG.md" target="_blank" rel="noopener">See what's new</a>.`;
    const UPDATE_NOTICE_SEEN_KEY = "FT_updateNoticeSeen";

    // Default formatting for bookmark notes prefill
    const DEFAULT_BOOKMARK_NOTE_FORMAT = `<details>
    <summary>Work: {TITLE}</summary>
    <p>{TITLE} by {AUTHOR} | {FANDOM}</p>
    <p>{SERIES}</p>
    <details>
        <summary>Pairings:</summary>
        <ul>{PAIRING_TAGS}</ul>
    </details>
    <details>
        <summary>Summary</summary>
        <blockquote>{SUMMARY}</blockquote>
    </details>
    </details>`;

    // Default script settings
    let settings = {
        version: GM_info.script.version,
        // [TWEAK: statuses] renamed/recolored/reordered; added Subscribed
        statuses: [
            {
                tag: "Reading",
                dropdownLabel: "My Current Fanfics",
                positiveLabel: "❤️ Mark as Reading",
                negativeLabel: "💔 Remove from Reading",
                selector: "favorite_btn",
                storageKey: "FT_favorites",
                enabled: true,
                collapse: false,
                displayInDropdown: true,
                highlightColor: "#eb6f92",
                borderSize: 2,
                opacity: 1,
                borderOpacity: 125,
                hide: false,
                highlightPriority: 1,
            },
            {
                tag: "Subscribed",
                dropdownLabel: "My Subscribed Fanfics",
                positiveLabel: "🪄 Mark as Subscribed",
                negativeLabel: "🧹 Remove from Subscribed",
                selector: "subscribed_btn",
                storageKey: "FT_subscribed",
                enabled: true,
                collapse: false,
                displayInDropdown: true,
                highlightColor: "#ea9a97",
                borderSize: 2,
                opacity: 1,
                borderOpacity: 125,
                hide: false,
                highlightPriority: 1,
            },
            {
                tag: "To Read",
                dropdownLabel: "My To Read Fanfics",
                positiveLabel: "📚 Mark as To Read",
                negativeLabel: "🧹 Remove from To Read",
                selector: "to_read_btn",
                storageKey: "FT_toread",
                enabled: true,
                collapse: false,
                displayInDropdown: true,
                highlightColor: "#9ccfd8",
                borderSize: 2,
                opacity: 1,
                borderOpacity: 125,
                hide: false,
                highlightPriority: 1,
            },
            {
                tag: "Dropped",
                dropdownLabel: "My Dropped Fanfics",
                positiveLabel: "👎 Mark as Dropped",
                negativeLabel: "🧹 Remove from Dropped",
                selector: "disliked_btn",
                storageKey: "FT_disliked",
                enabled: true,
                collapse: true,
                displayInDropdown: false,
                highlightColor: "#000000",
                borderSize: 0,
                opacity: 0.6,
                borderOpacity: 255,
                hide: true,
                highlightPriority: 1,
            },
            {
                tag: "Finished Reading",
                dropdownLabel: "My Finished Fanfics",
                positiveLabel: "✔️ Mark as Finished",
                negativeLabel: "🗑️ Remove from Finished",
                selector: "finished_reading_btn",
                storageKey: "FT_finished",
                enabled: true,
                collapse: true,
                displayInDropdown: true,
                highlightColor: "#000000",
                borderSize: 0,
                opacity: 0.6,
                borderOpacity: 255,
                hide: false,
                highlightPriority: 1,
            },
        ],
        loadingLabel: "⏳Loading...",
        hideDefaultToreadBtn: true,
        hideDefaultSubscribeBtn: true, // [FORK: subscribe-btn] new setting, on by default
        newBookmarksPrivate: true,
        newBookmarksRec: false,
        lastExportTimestamp: null,
        displayBottomActionButtons: true,
        deleteEmptyBookmarks: true,
        debug: false,
        displayUserNotes: true,
        hideEmptyNoteButtonOnListings: false,
        expandUserNoteDetails: true,
        sheetUrl: "",
        syncInterval: 60,
        syncEnabled: false,
        syncDBInitialized: false,
        syncWidgetEnabled: false, // [TWEAK: defaults] off by default
        syncWidgetOpacity: 0.5,
        exportStatusesConfig: true,
        collapseAndHideOnBookmarks: false,
        displayMyNotesButton: false, // [TWEAK: defaults] off by default
        displayOnPageSorting: false, // [TWEAK: defaults] off by default
        enableMarkAsReadButton: true, // [FORK: chapter-tracking]
        kudosStorageKey: "FT_kudosGiven", // [FORK: kudos]
        changeStatusLabel: "✿ Change Status ▼", // [FORK: dropdown-label]
        prefillBookmarkNote: false,
        bookmarkNoteTemplate: DEFAULT_BOOKMARK_NOTE_FORMAT,
    };

    // Toggle debug info
    let DEBUG = settings.debug;

    // Utility function for status settings retrieval
    function getStatusSettingsByStorageKey(storageKey) {
        return settings.statuses.find(status => status.storageKey === storageKey);
    }

    // ==== [FORK] CUSTOM STATUS HELPERS ====
    // Lets users add/delete custom status tags and syncs definitions across devices.
    const RESERVED_SYNC_KEYS = new Set([
        "FT_userNotes",
        "FT_statusesConfig",
        "FT_uiConfig",
        "FT_kudosGiven",
        "FT_noReKudos",
    ]);

    function toTitleCaseWords(text) {
        return text
            .split(/\s+/)
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    function inferTagFromStorageKey(storageKey) {
        return toTitleCaseWords(
            storageKey
                .replace(/^FT_/, "")
                .replace(/^custom_\d+_?/, "")
                .replace(/^custom_/, "")
                .replace(/_/g, " ")
                .trim() || "Custom Tag",
        );
    }

    function createFallbackStatus(storageKey) {
        const tag = inferTagFromStorageKey(storageKey);
        return {
            tag,
            dropdownLabel: `My ${tag} Fanfics`,
            positiveLabel: `➕ Add ${tag}`,
            negativeLabel: `🧹 Remove ${tag}`,
            selector: `${storageKey}_btn`,
            storageKey,
            enabled: true,
            collapse: false,
            displayInDropdown: true,
            highlightColor: "#888888",
            borderSize: 2,
            opacity: 1,
            borderOpacity: 255,
            hide: false,
            highlightPriority: 1,
        };
    }

    function mergeStatusesByStorageKey(baseStatuses, incomingStatuses) {
        const merged = [];
        const byKey = new Map();

        for (const status of baseStatuses || []) {
            if (!status || !status.storageKey) continue;
            byKey.set(status.storageKey, status);
            merged.push(status);
        }

        for (const incoming of incomingStatuses || []) {
            if (!incoming || !incoming.storageKey) continue;
            const existing = byKey.get(incoming.storageKey);
            if (existing) {
                Object.assign(existing, incoming);
            } else {
                byKey.set(incoming.storageKey, incoming);
                merged.push(incoming);
            }
        }

        return merged;
    }

    function inferStatusesFromStatusData(statusData, existingStatuses) {
        const existingKeys = new Set((existingStatuses || []).map(s => s.storageKey));
        const inferred = [];

        for (const key of Object.keys(statusData || {})) {
            if (existingKeys.has(key)) continue;
            if (!key || !key.startsWith("FT_")) continue;
            if (RESERVED_SYNC_KEYS.has(key)) continue;
            inferred.push(createFallbackStatus(key));
        }

        return inferred;
    }
    // ==== END: CUSTOM STATUS HELPERS ====

    // Utility function to check if current page is users own bookmarks page
    function isOwnBookmarksPage() {
        const userMenu = document.querySelector("ul.menu.dropdown-menu");
        const username = userMenu?.previousElementSibling?.getAttribute("href")?.split("/").pop() ?? "";
        if (!username) return false;

        const url = window.location.pathname + window.location.search;
        return url.includes("/bookmarks") && url.includes(username);
    }

    // Utility function to replace bookmark note placeholders with fic details
    // [UPSTREAM 1.6.7.8] AO3 rejects bookmark notes over 5000 chars
    const MAX_BOOKMARK_NOTE_LENGTH = 5000;
    function fillBookmarkNoteTemplate(template, ficData, reservedLength = 0) {
        const budget = MAX_BOOKMARK_NOTE_LENGTH - reservedLength - 60; // buffer for the <div><abbr> wrapper

        let additionalTags = [...ficData.additionalTags];
        let characterTags = [...ficData.characterTags];
        let pairingTags = [...ficData.pairingTags];
        let summary = ficData.summary ?? "";
        const series = Array.isArray(ficData.series) ? ficData.series : [ficData.series].filter(Boolean);

        const build = () =>
            template
                .replaceAll("{AUTHOR}", `<a href="/users/${encodeURIComponent(ficData.author)}">${ficData.author}</a>`)
                .replaceAll("{TITLE}", `<a href="/works/${ficData.workId}">${ficData.title}</a>`)
                .replaceAll("{FANDOM}", ficData.fandom.map(item => item.outerHTML).join(" "))
                .replaceAll("{SUMMARY}", summary)
                .replaceAll("{PAIRING_TAGS}", pairingTags.join(""))
                .replaceAll("{CHARACTER_TAGS}", characterTags.join(""))
                .replaceAll("{ADDITIONAL_TAGS}", additionalTags.join(""))
                .replaceAll("{SERIES}", series.join("<br>"))
                .replaceAll("{WORK_ID}", ficData.workId ?? "")
                .replaceAll("{SERIES_SUMMARY}", ficData.seriesSummary ?? "");

        // Drop whole tags from the end first - each item is a complete <li>, so this
        // can never break HTML mid-tag. Least essential lists go first
        while (build().length > budget && additionalTags.length > 0) additionalTags.pop();
        while (build().length > budget && characterTags.length > 0) characterTags.pop();
        while (build().length > budget && pairingTags.length > 0) pairingTags.pop();

        // Last resort - shorten the plain-text summary (no markup here, safe to slice)
        while (build().length > budget && summary.length > 100) {
            summary = summary.slice(0, summary.length - 100).trim() + "…";
        }

        const result = build();

        return `<div><abbr title="ft_bookmark_note" style="display:none"></abbr>${result}</div>`;
    }

    // [UPSTREAM 1.6.7.7] Undo an optimistic status change after the AO3 request failed.
    // Queuing the opposite op (instead of only cancelling ours) also restores any
    // unsent op that ours had cancelled out in optimizeOperations.
    function rollbackStatusChange(storageManager, remoteSyncManager, storageKey, entityId, wasPresent, queuedOpId) {
        if (wasPresent) {
            // we had removed it locally - put it back
            storageManager.addIdToCategory(storageKey, entityId);
            if (remoteSyncManager) remoteSyncManager.addPendingStatusChange("add", storageKey, entityId);
        } else {
            // we had added it locally - take it back off
            storageManager.removeIdFromCategory(storageKey, entityId);
            if (remoteSyncManager) remoteSyncManager.addPendingStatusChange("remove", storageKey, entityId);
        }

        // Cancel the unsent op
        if (remoteSyncManager) remoteSyncManager.cancelPendingOperation(queuedOpId);
    }

    // Utility function for displaying modals
    function displayModal(modalTitle, htmlContent) {
        // Check if temp-content already exists, remove if yes (to avoid duplicates)
        const existing = document.getElementById("temp-content");
        if (existing) existing.remove();

        // Create hidden container
        const tempDiv = document.createElement("div");
        tempDiv.id = "temp-content";
        tempDiv.style.display = "none";
        tempDiv.innerHTML = htmlContent;

        document.body.appendChild(tempDiv);

        // Show modal using ao3modal
        ao3modal.show("#temp-content", modalTitle);
    }

    function escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Utility class for injecting CSS
    class StyleManager {
        // Method to add custom styles to the page
        static addCustomStyles(styles) {
            const customStyle = document.createElement("style");
            customStyle.innerHTML = styles;
            document.head.appendChild(customStyle);

            DEBUG && console.info("[FicTracker] Custom styles added successfully.");
        }

        static generateStatusStyles() {
            let css = "";

            settings.statuses
                .filter(s => s.enabled)
                // Sort statuses by numeric priority, defines the order of final css - thus prioritizing from bottom to top
                .sort((a, b) => (a.highlightPriority ?? 1) - (b.highlightPriority ?? 1))
                .forEach(status => {
                    const className = `glowing-border-${status.storageKey}`;
                    const color = status.highlightColor;
                    const bOpacity = Math.round(status?.borderOpacity ?? 255).toString(16);
                    const border = `${status.borderSize}px solid ${color + bOpacity}`;
                    const boxShadow = `0 0 10px ${color + bOpacity}, 0 0 20px ${color + bOpacity}`;
                    const boxShadowHover = `0 0 15px ${color + bOpacity}, 0 0 30px ${color + bOpacity}`;
                    const opacity = status.opacity;
                    const hasBorder = status.borderSize > 0;
                    const hide = status.hide;

                    // Check if we should hide this status based on bookmarks page setting
                    const ownBookmarksPage = isOwnBookmarksPage();
                    const shouldHide =
                        hide && ((ownBookmarksPage && settings.collapseAndHideOnBookmarks) || !ownBookmarksPage);

                    // [FIX: status-highlight] no longer strips the blurb's real border/shadow when borderSize is 0
                    css += `
                        .${className} {
                            ${shouldHide ? "display: none !important;" : ""}
                            ${hasBorder ? `border: ${border} !important;` : ""}
                            padding: 15px !important;
                            ${hasBorder ? `box-shadow: ${boxShadow} !important;` : ""}
                            transition: box-shadow 0.3s ease, opacity 0.3s ease !important;
                            opacity: ${opacity};
                        }
                        .${className}:hover {
                            ${hasBorder ? `box-shadow: ${boxShadowHover} !important;` : ""}
                            opacity: 1;
                        }
                    `;
                });

            return css;
        }

        // [FORK: dropdown-style] keeps the toggle/menu from being painted by generic .actions rules
        static generateQuickTagToggleStyles() {
            return `
                #header.region .ft-quicktag-toggle,
                #header.region .ft-quicktag-toggle:is(:hover, :focus, :active) {
                    background: transparent !important;
                    background-color: transparent !important;
                    background-image: none !important;
                    border: 0 !important;
                    box-shadow: none !important;
                    outline: none !important;
                    text-decoration: none !important;
                    text-shadow: none !important;
                    filter: none !important;
                    transform: none !important;
                    cursor: pointer !important;
                    color: currentColor !important;
                    font-weight: normal !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                :where(#header.region .ft-quicktag-menu) {
                    background: Canvas;
                    color: CanvasText;
                    border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
                    box-shadow: 0 2px 8px rgba(0,0,0,.25);
                }
            `;
        }
    }

    // Class for handling API requests
    class RequestManager {
        constructor(baseApiUrl) {
            this.baseApiUrl = baseApiUrl;
        }

        // Retrieve the authenticity token from a meta tag
        getAuthenticityToken() {
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            return metaTag ? metaTag.getAttribute("content") : null;
        }

        // Send an API request with the specified method
        sendRequest(url, formData = null, headers = null, method = "POST") {
            const options = {
                method: method,
                mode: "cors",
                credentials: "include",
            };

            // Attach headers if there are any
            if (headers) {
                options.headers = headers;
            }

            // If it's not a GET request, we include the formData in the request body
            if (method !== "GET" && formData) {
                options.body = formData;
            }

            return fetch(url, options)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Request failed with status ${response.status}`);
                    }
                    return response;
                })
                .catch(error => {
                    DEBUG && console.error("[FicTracker] Error during API request:", error);
                    throw error;
                });
        }

        // Create a bookmark for fanfic with given data
        createBookmark(workId, authenticityToken, bookmarkData) {
            const url = `${this.baseApiUrl}/works/${workId}/bookmarks`;
            const headers = this.getRequestHeaders();
            const formData = this.createFormData(authenticityToken, bookmarkData);

            DEBUG &&
                console.info("[FicTracker] Sending CREATE request for bookmark:", {
                    url,
                    headers,
                    bookmarkData,
                });

            return this.sendRequest(url, formData, headers)
                .then(response => {
                    // [UPSTREAM 1.6.7.7] A real success is always a redirect to /bookmarks/{id}.
                    // A 200 with no redirect means AO3 rejected creation (validation error,
                    // duplicate bookmark, note too long etc) and just re-rendered the page
                    const bookmarkIdMatch = response.url.match(/\/bookmarks\/(\d+)(?:[/?#]|$)/);

                    if (response.ok && response.redirected && bookmarkIdMatch) {
                        const bookmarkId = bookmarkIdMatch[1];

                        DEBUG && console.log("[FicTracker] Created bookmark ID:", bookmarkId);
                        return bookmarkId;
                    } else {
                        throw new Error("Failed to create bookmark. Status: " + response.status);
                    }
                })
                .catch(error => {
                    DEBUG && console.error("[FicTracker] Error creating bookmark:", error);
                    throw error;
                });
        }

        // Update a bookmark for fanfic with given data
        updateBookmark(bookmarkId, authenticityToken, updatedData) {
            const url = `${this.baseApiUrl}/bookmarks/${bookmarkId}`;
            const headers = this.getRequestHeaders();
            const formData = this.createFormData(authenticityToken, updatedData, "update");

            DEBUG &&
                console.info("[FicTracker] Sending UPDATE request for bookmark:", {
                    url,
                    headers,
                    updatedData,
                });

            return this.sendRequest(url, formData, headers)
                .then(data => {
                    DEBUG && console.log("[FicTracker] Bookmark updated successfully:", data);
                })
                .catch(error => {
                    DEBUG && console.error("[FicTracker] Error updating bookmark:", error);
                });
        }

        // Delete a bookmark by ID
        deleteBookmark(bookmarkId, authenticityToken) {
            const url = `${this.baseApiUrl}/bookmarks/${bookmarkId}`;
            const headers = this.getRequestHeaders();

            // FormData for this one is minimalist, method call is not needed
            const formData = new FormData();
            formData.append("authenticity_token", authenticityToken);
            formData.append("_method", "delete");

            DEBUG &&
                console.info("[FicTracker] Sending DELETE request for bookmark:", {
                    url,
                    headers,
                    authenticityToken,
                });

            return this.sendRequest(url, formData, headers)
                .then(data => {
                    DEBUG && console.log("[FicTracker] Bookmark deleted successfully:", data);
                })
                .catch(error => {
                    DEBUG && console.error("[FicTracker] Error deleting bookmark:", error);
                });
        }

        // Retrieve the request headers
        getRequestHeaders() {
            const headers = {
                Accept: "text/html", // Accepted content type
                "Cache-Control": "no-cache", // Prevent caching
                Pragma: "no-cache", // HTTP 1.0 compatibility
            };

            DEBUG && console.log("[FicTracker] Retrieving request headers:", headers);

            return headers;
        }

        // Create FormData for bookmarking actions based on action type
        createFormData(authenticityToken, bookmarkData, type = "create") {
            const formData = new FormData();

            // Append required data to FormData
            formData.append("authenticity_token", authenticityToken);
            formData.append("bookmark[pseud_id]", bookmarkData.pseudId);
            formData.append("bookmark[bookmarker_notes]", bookmarkData.notes);
            formData.append("bookmark[tag_string]", bookmarkData.bookmarkTags.join(","));
            formData.append("bookmark[collection_names]", bookmarkData.collections.join(","));
            formData.append("bookmark[private]", +bookmarkData.isPrivate);
            formData.append("bookmark[rec]", +bookmarkData.isRec);

            // Append action type
            formData.append("commit", type === "create" ? "Create" : "Update");
            if (type === "update") {
                formData.append("_method", "put");
            }

            DEBUG && console.log("[FicTracker] FormData created successfully:");
            DEBUG && console.table(Array.from(formData.entries()));

            return formData;
        }

        // [FORK: series] create a bookmark for a series with given data
        createSeriesBookmark(seriesId, authenticityToken, bookmarkData) {
            const url = `${this.baseApiUrl}/series/${seriesId}/bookmarks`;
            const headers = this.getRequestHeaders();
            const formData = this.createFormData(authenticityToken, bookmarkData);

            DEBUG &&
                console.info("[FicTracker] Sending CREATE request for series bookmark:", {
                    url,
                    headers,
                    bookmarkData,
                });

            return this.sendRequest(url, formData, headers)
                .then(response => {
                    // [UPSTREAM 1.6.7.7] same redirect check as createBookmark
                    const bookmarkIdMatch = response.url.match(/\/bookmarks\/(\d+)(?:[/?#]|$)/);

                    if (response.ok && response.redirected && bookmarkIdMatch) {
                        const bookmarkId = bookmarkIdMatch[1];
                        DEBUG && console.log("[FicTracker] Created series bookmark ID:", bookmarkId);
                        return bookmarkId;
                    } else {
                        throw new Error("Failed to create series bookmark. Status: " + response.status);
                    }
                })
                .catch(error => {
                    DEBUG && console.error("[FicTracker] Error creating series bookmark:", error);
                    throw error;
                });
        }
    }

    // ==== [FORK] CHAPTER TRACKING ====
    function isChapterPage() {
        // Match both /works/123/chapters/456 and direct /chapters/456 URLs
        return /\/chapters\/\d+/.test(window.location.pathname);
    }

    function getCurrentChapterNumber() {
        if (!isChapterPage()) return null;

        const chapterPreface = document.querySelector(".chapter.preface.group h3.title a");
        if (!chapterPreface) return null;

        const chapterText = chapterPreface.textContent.trim();
        const match = chapterText.match(/Chapter\s+(\d+)/i);

        return match ? parseInt(match[1], 10) : null;
    }
    // ==== END: CHAPTER TRACKING ====

    // Class for managing custom user notes
    class CustomUserNotesManager {
        constructor(storageManager, remoteSyncManager = null) {
            this.storageManager = storageManager;
            this.remoteSyncManager = remoteSyncManager;
        }

        // Get all saved notes
        getAllNotes() {
            try {
                return JSON.parse(this.storageManager.getItem("FT_userNotes")) || {};
            } catch (e) {
                return {};
            }
        }

        // Get note for specific work
        getNote(workId) {
            const notes = this.getAllNotes();
            return notes[workId] || null;
        }

        // Save note
        saveNote(workId, noteText, ficDetails) {
            const notes = this.getAllNotes();
            const date = new Date().toISOString();

            if (noteText.trim() === "") {
                delete notes[workId];
            } else {
                notes[workId] = {
                    ...notes[workId],
                    text: noteText,
                    date,
                };

                if (ficDetails && !("title" in notes[workId])) {
                    Object.assign(notes[workId], ficDetails);
                }
            }

            this.storageManager.setItem("FT_userNotes", JSON.stringify(notes));

            if (this.remoteSyncManager) {
                this.remoteSyncManager.addPendingNoteUpdate(workId, noteText, date);
            }

            return { text: noteText, date };
        }

        // Delete note
        deleteNote(workId) {
            const notes = this.getAllNotes();
            delete notes[workId];
            this.storageManager.setItem("FT_userNotes", JSON.stringify(notes));

            if (this.remoteSyncManager) {
                this.remoteSyncManager.addPendingNoteUpdate(workId, "", null);
            }
        }

        // ==== [FORK] SKIN THEME SAMPLING ====
        // Samples the active skin's real styling so injected note UI blends in

        // Detached li.blurb for sampling skin CSS on pages with no real blurb; caller removes it
        createTempBlurbElement() {
            if (!document.body) return null;

            const tempBlurb = document.createElement("li");
            tempBlurb.className = "blurb work";
            tempBlurb.style.cssText = "position:absolute;left:-9999px;visibility:hidden;";
            document.body.appendChild(tempBlurb);
            return tempBlurb;
        }

        // Samples background/border-radius off a real .actions button (excludes #header)
        getActionButtonStyle() {
            const sample = document.querySelector(".actions a:not(#header *), .actions button:not(#header *)");
            if (!sample) return null;

            const computed = getComputedStyle(sample);
            const backgroundColor =
                computed.backgroundColor &&
                computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
                computed.backgroundColor !== "transparent"
                    ? computed.backgroundColor
                    : null;
            const borderRadius = computed.borderRadius;

            if (!backgroundColor && !borderRadius) return null;

            return { backgroundColor, borderRadius };
        }

        // Samples real :hover background by reading stylesheet rules directly
        getActionButtonHoverBackground() {
            const hoverSubstrings = [
                ".actions a:is(:hover",
                ".actions button:is(:hover",
                ".actions a:hover",
                ".actions button:hover",
                "button:is(:hover",
                "button:hover",
            ];

            const resolveVars = val => {
                if (!val) return val;
                return val.replace(/var\(\s*(--[\w-]+)\s*\)/g, (match, prop) => {
                    const resolved = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
                    return resolved || match;
                });
            };

            let hoverBackground = null;

            for (const sheet of document.styleSheets) {
                let rules;
                try {
                    rules = sheet.cssRules;
                } catch (e) {
                    continue;
                }
                if (!rules) continue;

                for (const rule of rules) {
                    if (!rule.selectorText || !rule.style) continue;
                    if (/#header/.test(rule.selectorText)) continue;
                    if (!hoverSubstrings.some(p => rule.selectorText.includes(p))) continue;

                    const bg = rule.style.background || rule.style.backgroundColor;
                    const resolved = resolveVars(bg);
                    if (resolved && resolved !== "none" && resolved !== "transparent") {
                        hoverBackground = resolved;
                    }
                }
            }

            return hoverBackground;
        }

        // Matches the note's buttons to the skin's real .actions background/radius/hover
        getNoteButtonStyles(scopeSelector) {
            const style = this.getActionButtonStyle();

            const { backgroundColor, borderRadius } = style || {};
            const decls = [
                backgroundColor ? `background: ${backgroundColor};` : "",
                borderRadius ? `border-radius: ${borderRadius};` : "",
            ]
                .filter(Boolean)
                .join(" ");

            const hoverBackground = this.getActionButtonHoverBackground();
            const hoverDecls = hoverBackground ? `background: ${hoverBackground};` : "filter: brightness(1.1);";

            return `
                <style>
                    ${scopeSelector} button {
                        ${decls}
                        margin-block: 0 !important;
                    }
                    ${scopeSelector} button:is(:hover, :focus) {
                        ${hoverDecls}
                    }
                </style>
            `;
        }

        // Samples border/radius/shadow/background off a real or fabricated blurb
        readBlurbBorder(blurbElement) {
            let element = blurbElement;
            let isTemp = false;

            if (!element) {
                element = this.createTempBlurbElement();
                if (!element) return null;
                isTemp = true;
            }

            const glowingClasses = isTemp
                ? []
                : Array.from(element.classList).filter(cls => cls.startsWith("glowing-border-"));
            glowingClasses.forEach(cls => element.classList.remove(cls));

            const computed = getComputedStyle(element);
            const borderWidth = computed.borderTopWidth || "1px";
            const borderStyle = computed.borderTopStyle;
            const borderColor = computed.borderTopColor;
            const boxShadow = computed.boxShadow && computed.boxShadow !== "none" ? computed.boxShadow : null;
            const borderRadius = computed.borderTopLeftRadius;
            const backgroundColor =
                computed.backgroundColor &&
                computed.backgroundColor !== "rgba(0, 0, 0, 0)" &&
                computed.backgroundColor !== "transparent"
                    ? computed.backgroundColor
                    : null;
            const padding = computed.padding;

            glowingClasses.forEach(cls => element.classList.add(cls));
            if (isTemp) element.remove();

            const hasRealBorder = borderStyle && borderStyle !== "none";
            if (!hasRealBorder && !boxShadow) return null;

            return {
                borderWidth,
                borderStyle: hasRealBorder ? borderStyle : "none",
                borderColor,
                borderRadius,
                boxShadow,
                backgroundColor,
                padding,
            };
        }

        // Border+background style matching the active skin's blurb
        getBlurbBorderStyle(blurbElement) {
            const fallback = "border: 1px solid currentColor; border-radius: 4px;";
            const border = this.readBlurbBorder(blurbElement);
            if (!border) return fallback;

            return `border: ${border.borderWidth} ${border.borderStyle} ${border.borderColor}; border-radius: ${border.borderRadius};${border.boxShadow ? ` box-shadow: ${border.boxShadow};` : ""}${border.backgroundColor ? ` background: ${border.backgroundColor};` : ""}`;
        }

        // Same as getBlurbBorderStyle but for nested elements (no box-shadow)
        getBlurbInnerBorderStyle(blurbElement) {
            const fallback = "border: 1px solid rgba(128,128,128,0.2); border-radius: 4px;";
            const border = this.readBlurbBorder(blurbElement);
            if (!border) return fallback;

            return `border: ${border.borderWidth} ${border.borderStyle} ${border.borderColor}; border-radius: ${border.borderRadius};`;
        }
        // ==== END: SKIN THEME SAMPLING ====

        // Generate note block HTML
        generateNoteHtml(workId, isWorkPage = false, isNoteAggregatorModal = false, blurbElement = null) {
            const note = this.getNote(workId);
            const noteText = note?.text || "";
            const noteDate = note?.date || "";
            const displayDate = noteDate ? new Date(noteDate).toLocaleDateString() : "";
            const detailsOpen = settings.expandUserNoteDetails ? "open" : "";
            const detailsBorderStyle = this.getBlurbBorderStyle(blurbElement);
            const textareaBorderStyle = this.getBlurbInnerBorderStyle(blurbElement);

            // If note was deleted from note modal manager - leave empty space
            if (!noteText && isNoteAggregatorModal === true) return "";

            // If no note exists, show create button
            if (!noteText) {
                // Skip empty-note button on listing pages (search/bookmarks/etc) if hidden in settings
                if (!isWorkPage && settings.hideEmptyNoteButtonOnListings) return "";

                return `
                    <div class="user-note-preview" data-work-id="${workId}" style="order: 999; flex-basis: 100%;">
                        <div style="display: flex; justify-content: center; padding: ${isWorkPage ? "10px" : "3px"};">
                            <button class="create-note-btn" style="${isWorkPage ? "width: 30%;" : ""} padding: 4px 6px; display: flex; justify-content: center; align-items: center; gap: 8px; border: 1px dashed currentColor; border-radius: 4px; background: transparent; color: currentColor; cursor: pointer; opacity: 0.7;">
                                <span style="color: currentColor;">📝</span>
                                <span>Add Note</span>
                            </button>
                        </div>
                    </div>
                `;
            }

            let ficDetails;
            if (isNoteAggregatorModal) {
                ficDetails = this.getFicDetailsHTML(workId, note);
            }

            const noteButtonScope = `.user-note-preview[data-work-id="${workId}"]`;
            const noteButtonStyles = this.getNoteButtonStyles(noteButtonScope);

            return `
                <div class="user-note-preview" data-work-id="${workId}" style="order: 999; flex-basis: 100%;">
                    <style>
                        @media screen and (max-width: 42em) {
                            .user-note-preview[data-work-id="${workId}"]>div>div {
                                width: 100% !important;
                            }
                        }
                    </style>
                    ${noteButtonStyles}
                    <div style="display: flex; justify-content: center;">
                        <!-- Config edit form for works listing or fic page itself -->
                        <div style="width: ${isWorkPage ? "60%" : "100%"};">
                            <details ${detailsOpen} style="margin: 18px 0 1px 0;; ${detailsBorderStyle} padding: 0; overflow: hidden;">
                                <summary style="padding: 4px 6px; cursor: pointer; font-weight: bold; background: rgba(128,128,128,0.1); display: flex; justify-content: space-between; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span>${isNoteAggregatorModal ? ficDetails.outerHTML : "📝 Your Note"}</span>
                                    </div>
                                    <div class="note-actions" style="display: flex; gap: 8px;">
                                        <button class="edit-note-btn" title="Edit Note" style="cursor: pointer;">✏️</button>
                                        <button class="delete-note-btn" title="Delete Note" style="cursor: pointer;">🗑️</button>
                                    </div>
                                </summary>
                                <div class="note-body" style="padding: 12px; border-top: 1px solid rgba(128,128,128,0.2); background: rgba(128,128,128,0.05);">
                                    <div style="line-height: 1.4; white-space: pre-wrap;">${escapeHTML(noteText)}</div>
                                    <div style="margin-top: 8px; font-size: 0.85em; opacity: 0.7;">
                                        📅 Last updated: ${displayDate} | 📏 ${noteText.length} characters
                                    </div>
                                </div>
                                <div class="note-edit-form" style="display: none; padding: 12px; border-top: 1px solid rgba(128,128,128,0.2); background: rgba(128,128,128,0.05);">
                                    <textarea class="note-textarea" style="box-sizing: border-box; width: 100%; min-height: 100px; margin-bottom: 8px; padding: 8px; ${textareaBorderStyle}">${escapeHTML(noteText)}</textarea>
                                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                        <button class="save-note-btn" style="cursor: pointer;">💾 Save</button>
                                        <button class="cancel-edit-btn" style="cursor: pointer;">❌ Cancel</button>
                                    </div>
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            `;
        }

        // Setup event handlers
        setupNoteHandlers(container, isWorkPage = false, isNoteAggregatorModal = false) {
            container.addEventListener("click", e => {
                const noteBlock = e.target.closest(".user-note-preview");
                if (!noteBlock) return;

                const workId = noteBlock.dataset.workId;
                const btn = e.target.closest("button");
                if (!btn) return;

                if (btn.classList.contains("create-note-btn")) {
                    const blurbElement = isWorkPage ? null : noteBlock.closest("li.blurb, li.work");
                    noteBlock.innerHTML = this.generateEditFormHtml(isWorkPage, blurbElement);
                }

                if (btn.classList.contains("edit-note-btn")) {
                    // Prevent details from toggling
                    e.preventDefault();
                    const noteContent = noteBlock.querySelector("details");
                    noteContent.querySelector(".note-body").style.display = "none";
                    noteContent.querySelector(".note-edit-form").style.display = "block";

                    btn.closest("details").open = true;
                }

                if (btn.classList.contains("save-note-btn")) {
                    const textarea = noteBlock.querySelector(".note-textarea");
                    const ficDetails = this.getFicDetails(workId, isWorkPage);
                    this.saveNote(workId, textarea.value, ficDetails);
                    this.updateNoteDisplay(noteBlock, workId, isWorkPage, isNoteAggregatorModal);
                }

                if (btn.classList.contains("cancel-edit-btn")) {
                    this.updateNoteDisplay(noteBlock, workId, isWorkPage, isNoteAggregatorModal);
                }

                if (btn.classList.contains("delete-note-btn")) {
                    // Prevent details from toggling
                    e.preventDefault();
                    if (confirm("Delete this note?")) {
                        this.deleteNote(workId);
                        this.updateNoteDisplay(noteBlock, workId, isWorkPage, isNoteAggregatorModal);
                    }
                }
            });
        }

        generateEditFormHtml(isWorkPage = false, blurbElement = null) {
            const formBorderStyle = this.getBlurbBorderStyle(blurbElement);
            const textareaBorderStyle = this.getBlurbInnerBorderStyle(blurbElement);
            const noteButtonStyles = this.getNoteButtonStyles(".user-note-preview");
            return `
                <style>
                    @media screen and (max-width: 42em) {
                        .user-note-preview > div > div {
                            width: 100% !important;
                        }
                    }
                </style>
                ${noteButtonStyles}
                <div style="display: flex; justify-content: center;">
                    <div style="margin: 18px 0 1px 0; padding: 12px; background: rgba(128,128,128,0.05); box-sizing: border-box !important; width: ${isWorkPage ? "60%" : "100%"}; ${formBorderStyle}">
                        <textarea class="note-textarea" placeholder="Write your note here..." style="box-sizing: border-box; width: 100%; min-height: 100px; margin-bottom: 8px; padding: 8px; ${textareaBorderStyle}"></textarea>
                        <div style="display: flex; gap: 8px; justify-content: flex-end;">
                            <button class="save-note-btn" style="cursor: pointer;">💾 Save</button>
                            <button class="cancel-edit-btn" style="cursor: pointer;">❌ Cancel</button>
                        </div>
                    </div>
                </div>
            `;
        }

        updateNoteDisplay(noteBlock, workId, isWorkPage = false, isNoteAggregatorModal = false) {
            const blurbElement = isWorkPage ? null : noteBlock.closest("li.blurb, li.work");
            noteBlock.outerHTML = this.generateNoteHtml(workId, isWorkPage, isNoteAggregatorModal, blurbElement);
        }

        // [FORK: notes] narrowed to {title, author, fandom-as-text}
        getFicDetails(workId, isWorkPage = false) {
            if (isWorkPage) {
                const title = document.querySelector("h2.title.heading").textContent.trim();
                const author = document.querySelector('a[rel="author"]')?.textContent;
                const fandom = document.querySelector("dd.fandom.tags ul a.tag").textContent;
                return { title, author, fandom };
            } else {
                const fic = document.querySelector(`li#work_${workId}, li.work-${workId}`);
                if (!fic) return;

                const header = fic.querySelector("div.header.module");
                const title = header.querySelector('a[href^="/works/"]').textContent;
                const author = header.querySelector('a[rel="author"]')?.textContent;
                // explicitly save only one fandom to avoid clutter
                const fandom = header.querySelector("h5.fandoms.heading > a.tag").textContent;
                return { title, author, fandom };
            }
        }

        // [FORK: bookmark-prefill] original's full scrape, merged into one method
        getFicDetailsForBookmarkNote(workId, isWorkPage = false) {
            if (isWorkPage) {
                const title = document.querySelector("h2.title.heading").textContent.trim();
                const author = document.querySelector('a[rel="author"]')?.textContent;
                const fandom = [...document.querySelectorAll("dd.fandom.tags ul a.tag")];
                const summary = document.querySelector("div.summary.module > blockquote.userstuff")?.innerText ?? "";
                // [UPSTREAM 1.6.7.6] works can belong to multiple series
                const series = Array.from(document.querySelectorAll("dd.series span.position")).map(el =>
                    el.outerHTML.trim(),
                );

                const pairingTags = Array.from(document.querySelectorAll("dd.relationship.tags > ul.commas li")).map(
                    li => li.outerHTML.trim(),
                );

                const characterTags = Array.from(document.querySelectorAll("dd.character.tags > ul.commas li")).map(
                    li => li.outerHTML.trim(),
                );

                const additionalTags = Array.from(document.querySelectorAll("dd.freeform.tags > ul.commas li")).map(
                    li => li.outerHTML.trim(),
                );

                return {
                    workId,
                    title,
                    author,
                    fandom,
                    summary,
                    pairingTags,
                    characterTags,
                    additionalTags,
                    series,
                };
            } else {
                const fic = document.querySelector(`li#work_${workId}, li.work-${workId}`);
                if (!fic)
                    return {
                        workId,
                        title: "",
                        author: "",
                        fandom: [],
                        summary: "",
                        pairingTags: [],
                        characterTags: [],
                        additionalTags: [],
                        series: [],
                        seriesSummary: "",
                    };

                const header = fic.querySelector("div.header.module");
                const title = header.querySelector('a[href^="/works/"]').textContent;
                const author = header.querySelector('a[rel="author"]')?.textContent;
                const fandom = [...header.querySelectorAll("h5.fandoms.heading > a.tag")];
                const summary = fic.querySelector("blockquote.userstuff.summary")?.innerText ?? "";
                const series = Array.from(fic.querySelectorAll("li ul.series li")).map(li => li.innerHTML.trim());

                const pairingTags = Array.from(fic.querySelectorAll("ul.tags.commas li.relationships")).map(li =>
                    li.outerHTML.trim(),
                );

                const characterTags = Array.from(fic.querySelectorAll("ul.tags.commas li.characters")).map(li =>
                    li.outerHTML.trim(),
                );

                const additionalTags = Array.from(fic.querySelectorAll("ul.tags.commas li.freeforms")).map(li =>
                    li.outerHTML.trim(),
                );

                const seriesSummary = document.querySelector(
                    "div.series-show dl.series.meta.group blockquote.userstuff",
                )?.textContent;

                return {
                    workId,
                    title,
                    author,
                    fandom,
                    summary,
                    pairingTags,
                    characterTags,
                    additionalTags,
                    series,
                    seriesSummary,
                };
            }
        }

        // [FORK: chapter-tracking]
        prependChapterMarker(existingText, chapterNum) {
            // Remove any existing "Last Read: Ch. X" marker (including trailing newlines)
            const cleanedText = existingText.replace(/^Last Read: Ch\.\s*\d+\s*\n*/m, "").trim();

            // Prepend new marker with double line break
            const newMarker = `Last Read: Ch. ${chapterNum}`;

            return cleanedText ? `${newMarker}\n\n${cleanedText}` : newMarker;
        }

        getFicDetailsHTML(workId, note) {
            const container = document.createElement("span");

            if (note.title) {
                const fandomLink = document.createElement("a");
                fandomLink.target = "_blank";
                fandomLink.href = `/tags/${encodeURIComponent(note.fandom)}/works`;
                fandomLink.textContent = note.fandom;

                const workLink = document.createElement("a");
                workLink.target = "_blank";
                workLink.href = `/works/${workId}`;
                workLink.textContent = note.title;

                const authorLink = document.createElement("a");
                authorLink.target = "_blank";
                authorLink.href = `/users/${encodeURIComponent(note.author)}`;
                authorLink.textContent = note.author;

                container.append(fandomLink, " - ", workLink, " by ", authorLink);
            } else {
                // legacy fallback - only work link
                const workLink = document.createElement("a");
                workLink.target = "_blank";
                workLink.href = `/works/${workId}`;
                workLink.textContent = `Work #${workId}`;
                container.append(workLink);
            }

            return container;
        }

        // Add sorting options later
        getNotesSorted() {
            const userNotesObj = this.getAllNotes();
            const notesEntries = Object.entries(userNotesObj);
            // sort by most recent
            notesEntries.sort(([, noteA], [, noteB]) => new Date(noteB.date) - new Date(noteA.date));

            return notesEntries;
        }

        // Retrieve an arr of notes html specifically for MyNotes manager
        getNotesHTML(notesEntries) {
            const htmlNotesList = notesEntries.map(([workId, note]) => {
                return this.generateNoteHtml(workId, false, true);
            });
            return htmlNotesList;
        }

        getMyNotesModalHTML(htmlNotesList) {
            const notesModalHTML = `
                <div style="position: sticky;top: 0;z-index: 10;">
                    <label for="notes_search">Search Notes:</label>
                    <input type="search" id="ft_notes_search">
                </div>
                <div id='ft_notesList'>
                    ${htmlNotesList.join("")}
                </div>
            `;
            return notesModalHTML;
        }

        filterNotes(searchQuery) {
            const sortedNotes = this.getNotesSorted();
            const searchTokens = searchQuery.trim().toLowerCase().split(/\s+/);

            if (searchTokens.length === 0) return sortedNotes;

            const filteredNotes = sortedNotes.filter(([, note]) => {
                const noteTokens = [
                    ...(note.title || "").toLowerCase().split(/\s+/),
                    ...(note.author || "").toLowerCase().split(/\s+/),
                    ...(note.fandom || "").toLowerCase().split(/\s+/),
                    ...note.text.toLowerCase().split(/\s+/),
                ];

                // every search token must be present, ordering doent matter
                return searchTokens.every(token => noteTokens.some(word => word.startsWith(token)));
            });

            return filteredNotes;
        }
    }

    // Class for managing storage caching
    class StorageManager {
        // Store a value in local storage
        setItem(key, value) {
            localStorage.setItem(key, value);
        }

        // Retrieve a value from local storage
        getItem(key) {
            const value = localStorage.getItem(key);
            return value;
        }

        // Add an ID to a specific category
        addIdToCategory(category, id) {
            const existingIds = this.getItem(category);
            const idsArray = existingIds ? existingIds.split(",") : [];

            if (!idsArray.includes(id)) {
                idsArray.push(id);
                this.setItem(category, idsArray.join(",")); // Update the category with new ID
                DEBUG && console.debug(`[FicTracker] Added ID to category "${category}": ${id}`);
            }
        }

        // Remove an ID from a specific category
        removeIdFromCategory(category, id) {
            const existingIds = this.getItem(category);
            const idsArray = existingIds ? existingIds.split(",") : [];

            const idx = idsArray.indexOf(id);
            if (idx !== -1) {
                idsArray.splice(idx, 1); // Remove the ID
                this.setItem(category, idsArray.join(",")); // Update the category
                DEBUG && console.debug(`[FicTracker] Removed ID from category "${category}": ${id}`);
            }
        }

        // Get IDs from a specific category
        getIdsFromCategory(category) {
            const existingIds = this.getItem(category) || "";
            const idsArray = existingIds.split(",");
            DEBUG && console.debug(`[FicTracker] Retrieved IDs from category "${category}"`);
            return idsArray;
        }
    }

    // Manages syncing data between local storage and a remote backend (google sheets api)
    class RemoteStorageSyncManager {
        constructor() {
            this.storageManager = new StorageManager();
            // [FORK: config-sync] storage keys for custom status + UI config
            this.STATUS_CONFIG_KEY = "FT_statusesConfig";
            this.LAST_SYNCED_STATUS_CONFIG_KEY = "FT_lastSyncedStatusesConfig";
            this.UI_CONFIG_KEY = "FT_uiConfig";
            this.LAST_SYNCED_UI_CONFIG_KEY = "FT_lastSyncedUiConfig";
            this.rebuildSyncedKeys();
            this.PENDING_CHANGES_KEY = "FT_pendingChanges";
            this.LAST_SYNC_KEY = "FT_lastSync";
            this.LAST_SYNC_FAILED_KEY = "FT_lastSyncFailed"; // [FORK: settings-collapse] lets the settings page open the sync section

            // Configuration
            this.syncInterval = settings.syncInterval * 1000; //seconds
            this.syncTimer = null;
            this.isOnline = navigator.onLine;

            // Floating widget props
            this.syncWidget = null;
            this.timeUntilNextSync = 0;
            this.isSyncing = false;

            // Preserve this context
            this.handleOnline = this.handleOnline.bind(this);
            this.handleOffline = this.handleOffline.bind(this);
            this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

            DEBUG &&
                console.log(
                    "[FicTracker] Initialized RemoteStorageSyncManager with syncInterval:",
                    this.syncInterval / 1000,
                    "s",
                );
        }

        // [FORK: config-sync] dynamic key list for custom statuses + kudos
        rebuildSyncedKeys() {
            // Sync all configured status storage keys dynamically
            this.syncedKeys = settings.statuses.map(s => s.storageKey);
            // Sync custom status definitions, UI config, and kudos state as well
            this.syncedKeys.push(this.STATUS_CONFIG_KEY);
            this.syncedKeys.push(this.UI_CONFIG_KEY);
            this.syncedKeys.push(settings.kudosStorageKey);
        }

        // [FORK: config-sync] applies a status config pulled from another device
        applySyncedStatusesConfig(configRaw) {
            try {
                if (!configRaw) return false;

                const parsedStatuses = JSON.parse(configRaw);
                if (!Array.isArray(parsedStatuses)) return false;

                const validStatuses = parsedStatuses.filter(
                    s => s && typeof s.storageKey === "string" && typeof s.tag === "string",
                );
                if (validStatuses.length === 0) return false;

                const existingByStorageKey = new Map(
                    (settings.statuses || []).map(status => [status.storageKey, status]),
                );
                const syncedStatuses = validStatuses.map(status => {
                    const existing = existingByStorageKey.get(status.storageKey) || {};
                    return { ...existing, ...status };
                });
                settings.statuses = syncedStatuses;

                const currentSettings = JSON.parse(localStorage.getItem("FT_settings") || "{}");
                currentSettings.statuses = syncedStatuses;
                localStorage.setItem("FT_settings", JSON.stringify(currentSettings));
                localStorage.setItem(this.STATUS_CONFIG_KEY, JSON.stringify(syncedStatuses));

                this.rebuildSyncedKeys();
                DEBUG &&
                    console.log(
                        "[FicTracker] Applied synced status configuration. Total statuses:",
                        syncedStatuses.length,
                    );
                return true;
            } catch (error) {
                DEBUG && console.warn("[FicTracker] Failed to apply synced status configuration:", error);
                return false;
            }
        }

        // [FORK: config-sync] queues status config for cross-device sync
        syncStatusesConfigIfNeeded() {
            const localConfig = localStorage.getItem(this.STATUS_CONFIG_KEY) || JSON.stringify(settings.statuses || []);
            this.storageManager.setItem(this.STATUS_CONFIG_KEY, localConfig);

            const lastSyncedConfig = this.storageManager.getItem(this.LAST_SYNCED_STATUS_CONFIG_KEY) || "";
            if (localConfig !== lastSyncedConfig) {
                this.addPendingStatusChange("set", this.STATUS_CONFIG_KEY, localConfig);
                DEBUG && console.log("[FicTracker] Queued status config sync update");
            }
        }

        // [FORK: config-sync] UI preferences payload (e.g. dropdown label)
        buildUiConfigPayload() {
            return JSON.stringify({
                changeStatusLabel: settings.changeStatusLabel || "✿ Change Status ▼",
            });
        }

        // [FORK: config-sync] applies a UI config pulled from another device
        applyUiConfig(configRaw) {
            try {
                if (!configRaw) return;
                const parsed = JSON.parse(configRaw);
                if (!parsed || typeof parsed !== "object") return;

                if (parsed.changeStatusLabel) {
                    settings.changeStatusLabel = parsed.changeStatusLabel;
                    const currentSettings = JSON.parse(localStorage.getItem("FT_settings") || "{}");
                    currentSettings.changeStatusLabel = parsed.changeStatusLabel;
                    localStorage.setItem("FT_settings", JSON.stringify(currentSettings));
                    DEBUG && console.log("[FicTracker] Applied synced UI config:", parsed);
                }
            } catch (error) {
                DEBUG && console.warn("[FicTracker] Failed to apply UI config:", error);
            }
        }

        // [FORK: config-sync] queues UI config for cross-device sync
        syncUiConfigIfNeeded() {
            const localConfig = this.buildUiConfigPayload();
            this.storageManager.setItem(this.UI_CONFIG_KEY, localConfig);

            const lastSyncedConfig = this.storageManager.getItem(this.LAST_SYNCED_UI_CONFIG_KEY) || "";
            if (localConfig !== lastSyncedConfig) {
                this.addPendingStatusChange("set", this.UI_CONFIG_KEY, localConfig);
                DEBUG && console.log("[FicTracker] Queued UI config sync update");
            }
        }

        // Initialize sync system
        init() {
            // Initialize pending changes storage if not present
            if (!this.storageManager.getItem(this.PENDING_CHANGES_KEY)) {
                this.storageManager.setItem(
                    this.PENDING_CHANGES_KEY,
                    JSON.stringify({
                        operations: [],
                        notes: [],
                    }),
                );
            }

            // [FORK: config-sync] init storage for status + UI config
            if (!this.storageManager.getItem(this.STATUS_CONFIG_KEY)) {
                this.storageManager.setItem(this.STATUS_CONFIG_KEY, JSON.stringify(settings.statuses || []));
            }

            if (!this.storageManager.getItem(this.UI_CONFIG_KEY)) {
                this.storageManager.setItem(this.UI_CONFIG_KEY, this.buildUiConfigPayload());
            }

            DEBUG && console.log("[FicTracker] Pending changes storage initialized");
            DEBUG && console.log("[FicTracker] Synced keys:", this.syncedKeys);

            // Set up event listeners for (dis)connecting to network, tab focus change
            window.addEventListener("online", this.handleOnline);
            window.addEventListener("offline", this.handleOffline);

            document.addEventListener("visibilitychange", this.handleVisibilityChange);

            // Start sync timer
            this.startSyncTimer();

            // Add widget with timer
            if (settings.syncWidgetEnabled && settings.syncDBInitialized) {
                this.updateSyncWidget();
                setInterval(() => {
                    if (this.timeUntilNextSync > 0) this.timeUntilNextSync--;
                    this.updateSyncWidget(this.isOnline ? (this.isSyncing ? "syncing" : "normal") : "offline");
                }, 1000);
            }
        }

        // Method to create widget and handle all updates
        updateSyncWidget(state = "normal") {
            if (!settings.syncWidgetEnabled || !settings.syncDBInitialized) return;

            // create widget if it doesn't exist
            if (!this.syncWidget) {
                const mobile = window.innerWidth <= 768;

                document.body.insertAdjacentHTML(
                    "beforeend",
                    `
                    <div id="ft-sync-widget" style="position:fixed;bottom:15px;left:10px;z-index:10000;display:flex;align-items:center; opacity: ${settings.syncWidgetOpacity};gap:${mobile ? "2px" : "4px"};padding:${mobile ? "2px 3px" : "3px 5px"};background:#fff;border:1px solid #ddd;border-radius:${mobile ? "10px" : "16px"};cursor:pointer;font:${mobile ? "11px" : "12px"} -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#666;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:all 0.2s;user-select:none">
                        <svg width="${mobile ? "12" : "14"}" height="${mobile ? "12" : "14"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition:transform 0.3s">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                        <span style="font-weight:500;">Sync</span>
                        <span id="ft-sync-badge" style="display:none;background:#ff9800;color:white;border-radius:6px;padding:1px ${mobile ? "3px" : "5px"};font-size:${mobile ? "9px" : "10px"};font-weight:bold;margin-left:2px">0</span>
                    </div>
                `,
                );

                this.syncWidget = document.getElementById("ft-sync-widget");
                this.syncBadge = document.getElementById("ft-sync-badge");

                // spin animation
                if (!document.getElementById("ft-spin")) {
                    document.head.insertAdjacentHTML(
                        "beforeend",
                        '<style id="ft-spin">@keyframes ft-spin{to{transform:rotate(360deg)}}</style>',
                    );
                }

                // click handler
                this.syncWidget.onclick = () => this.isOnline && !this.isSyncing && this.performSync();

                // hover effect
                this.syncWidget.onmouseenter = () =>
                    !this.isSyncing &&
                    Object.assign(this.syncWidget.style, {
                        opacity: "1",
                        background: "#f8f9fa",
                        borderColor: "#0066cc",
                        transform: "translateY(-1px)",
                    });
                this.syncWidget.onmouseleave = () => {
                    this.syncWidget.style.opacity = settings.syncWidgetOpacity;
                    this.updateSyncWidget(this.isSyncing ? "syncing" : "normal");
                };
            }

            // Update badge based on pending count
            const pendingChanges = this.getPendingChanges();
            const pendingCount = (pendingChanges.operations?.length || 0) + (pendingChanges.notes?.length || 0);
            if (pendingCount > 0) {
                this.syncBadge.style.display = "inline-block";
                this.syncBadge.textContent = pendingCount;
            } else {
                this.syncBadge.style.display = "none";
            }

            // Update widget based on state
            const states = {
                normal: [
                    "#fff",
                    "#ddd",
                    "#666",
                    "none",
                    "pointer",
                    this.timeUntilNextSync <= 0
                        ? "Sync now"
                        : this.timeUntilNextSync > 60
                          ? `${Math.floor(this.timeUntilNextSync / 60)}m ${this.timeUntilNextSync % 60}s`
                          : `${this.timeUntilNextSync}s`,
                ],
                syncing: ["#e3f2fd", "#2196f3", "#1976d2", "ft-spin 1s linear infinite", "default", "Syncing..."],
                success: ["#e8f5e8", "#4caf50", "#2e7d32", "none", "pointer", "Synced!"],
                error: ["#ffebee", "#f44336", "#c62828", "none", "pointer", "Failed"],
                offline: ["#f5f5f5", "#ccc", "#999", "none", "default", "Offline"],
            };

            const [bg, border, color, animation, cursor, text] = states[state] || states.normal;
            const [icon, textEl, badge] = this.syncWidget.children;

            Object.assign(this.syncWidget.style, {
                background: bg,
                borderColor: border,
                cursor,
            });
            Object.assign(icon.style, {
                animation,
                color,
            });
            textEl.textContent = text;
            textEl.style.color = color;

            // Auto-revert success to normal
            if (state === "success") {
                setTimeout(() => this.updateSyncWidget("normal"), 2000);
            }
        }

        // Only sync when tab is focused to prevent redundant requests form multiple tabs
        handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                DEBUG && console.log("[FicTracker] Tab is visible – starting sync timer");
                this.startSyncTimer();
            } else {
                DEBUG && console.log("[FicTracker] Tab hidden – stopping sync timer");
                this.stopSyncTimer();
            }
        }

        // Start periodic sync timer
        startSyncTimer() {
            // Stop any existing sync timers to avoid duplicates
            this.stopSyncTimer();

            // If syncing is disabled in settings, update UI and exit
            if (!settings.syncEnabled) {
                DEBUG && console.log("[FicTracker] Sync is disabled, timer not started.");
                this.updateSyncWidget();
                return;
            }

            const now = Date.now();
            const lastSync = parseInt(this.storageManager.getItem(this.LAST_SYNC_KEY)) || 0;
            // Calculate how long it's been since the last successful sync
            const timeSinceLastSync = now - lastSync;

            DEBUG && console.log(`[FicTracker] Time since last sync: ${timeSinceLastSync / 1000}s`);

            // If enough time has passed, sync immediately and start interval
            if (timeSinceLastSync >= this.syncInterval) {
                DEBUG && console.log("[FicTracker] Sync interval exceeded - performing immediate sync");
                this.timeUntilNextSync = 0;
                this.performSync();
                this.syncTimer = setInterval(() => {
                    if (this.isOnline) this.performSync();
                }, this.syncInterval);

                // If not enough time has passed, schedule a one-time timeout to sync later
            } else {
                const timeUntilNextSync = this.syncInterval - timeSinceLastSync;
                this.timeUntilNextSync = Math.ceil(timeUntilNextSync / 1000);

                DEBUG &&
                    console.log(
                        `[FicTracker] Sync interval not yet reached - scheduling in ${timeUntilNextSync / 1000}s`,
                    );

                this.syncTimeout = setTimeout(() => {
                    if (this.isOnline) this.performSync();
                    this.syncTimer = setInterval(() => {
                        if (this.isOnline) this.performSync();
                    }, this.syncInterval);
                    this.syncTimeout = null; // clear reference
                }, timeUntilNextSync);
            }
        }

        // Stop sync timer
        stopSyncTimer() {
            DEBUG && console.log("[FicTracker] Stopping sync timers...");

            // Clear the periodic sync interval if it's active
            if (this.syncTimer) {
                clearInterval(this.syncTimer);
                this.syncTimer = null;
            }

            // Clear any scheduled one-time sync timeout if it's active
            if (this.syncTimeout) {
                clearTimeout(this.syncTimeout);
                this.syncTimeout = null;
            }
        }

        // Handle online event
        handleOnline() {
            this.isOnline = true;
            DEBUG && console.log("[FicTracker] Back online, resuming sync");
            this.performSync();
        }

        // Handle offline event
        handleOffline() {
            this.isOnline = false;
            DEBUG && console.log("[FicTracker] Gone offline, pausing sync");
        }

        // [FIX: sync-queue] unique id per entry, so only sent entries get cleared (see removeSyncedChanges)
        generatePendingEntryId() {
            RemoteStorageSyncManager._pendingEntrySeq = (RemoteStorageSyncManager._pendingEntrySeq || 0) + 1;
            return `${Date.now()}_${RemoteStorageSyncManager._pendingEntrySeq}`;
        }

        addPendingStatusChange(action, statusKey, fanficId) {
            const pendingChanges = this.getPendingChanges();

            // Optimize operations - remove conflicting operations
            const newOperation = {
                _id: this.generatePendingEntryId(),
                action,
                key: statusKey,
                value: fanficId,
            };

            DEBUG && console.log(`[FicTracker] Queuing pending status change: ${action} ${statusKey} → ${fanficId}`);
            const shouldEnqueue = this.optimizeOperations(pendingChanges.operations, newOperation);

            if (!shouldEnqueue) {
                this.savePendingChanges(pendingChanges);
                return null;
            }

            pendingChanges.operations.push(newOperation);
            this.savePendingChanges(pendingChanges);
            // [UPSTREAM 1.6.7.7] id lets callers cancel the op if the AO3 request fails
            return newOperation._id;
        }

        // [UPSTREAM 1.6.7.7] Remove a specific queued operation by id
        cancelPendingOperation(id) {
            if (!id) return;
            const pendingChanges = this.getPendingChanges();
            pendingChanges.operations = pendingChanges.operations.filter(op => op._id !== id);
            this.savePendingChanges(pendingChanges);
            DEBUG && console.log("[FicTracker] Cancelled unsent pending operation:", id);
        }

        // Add a note update to the pending queue
        addPendingNoteUpdate(fanficId, text, date) {
            const pendingChanges = this.getPendingChanges();
            DEBUG &&
                console.log(`[FicTracker] Updating note for fanficId="${fanficId}", text="${text}", date="${date}"`);

            // Remove any existing note update for this fanfic
            pendingChanges.notes = pendingChanges.notes.filter(update => update.fanficId !== fanficId);

            pendingChanges.notes.push({
                _id: this.generatePendingEntryId(),
                fanficId,
                text: text || "",
                date: date || null,
            });

            this.savePendingChanges(pendingChanges);
        }

        // Optimize operations by removing conflicting ones
        optimizeOperations(operations, newOperation) {
            const { action, key, value } = newOperation;

            // Find and remove conflicting operations
            for (let i = operations.length - 1; i >= 0; i--) {
                const existing = operations[i];

                if (existing.key === key) {
                    // [FIX: sync-queue] dedupe stale "set" entries for the same key (new op type)
                    if (action === "set" && existing.action === "set") {
                        // A newer 'set' always supersedes an older 'set' for the same key,
                        // regardless of value — remove the stale one so only the latest survives.
                        operations.splice(i, 1);
                        DEBUG &&
                            console.log(
                                `[FicTracker] Replaced stale 'set' operation for key "${key}" with updated value`,
                            );
                    } else if (existing.value === value) {
                        // Same key-value pair for add/remove operations
                        if (existing.action !== action) {
                            // Conflicting actions (add vs remove) - remove the existing one
                            operations.splice(i, 1);
                            DEBUG && console.log(`[FicTracker] Optimized conflicting operations for ${key}:${value}`);
                        } else {
                            // Same action - remove duplicate
                            DEBUG && console.log(`[FicTracker] Removed duplicate operation for ${key}:${value}`);
                            return false; // Don't add the new operation either
                        }
                    }
                }
            }

            return true;
        }

        // Get pending changes from localStorage
        getPendingChanges() {
            try {
                const changes = this.storageManager.getItem(this.PENDING_CHANGES_KEY);
                return changes
                    ? JSON.parse(changes)
                    : {
                          operations: [],
                          notes: [],
                      };
            } catch (error) {
                DEBUG && console.error("[FicTracker] Error parsing pending changes:", error);
                return {
                    operations: [],
                    notes: [],
                };
            }
        }

        // Save pending changes to localStorage
        savePendingChanges(changes) {
            this.storageManager.setItem(this.PENDING_CHANGES_KEY, JSON.stringify(changes));
            DEBUG && console.log("[FicTracker] Saved pending changes to storage");
        }

        // Clear pending changes
        clearPendingChanges() {
            // Reset pending operations and notes to an empty state in storage
            this.storageManager.setItem(
                this.PENDING_CHANGES_KEY,
                JSON.stringify({
                    operations: [],
                    notes: [],
                }),
            );
            DEBUG && console.log("[FicTracker] Cleared all pending changes (operations and notes).");
        }

        // [FIX: sync-queue] removes only entries actually sent, instead of clearing everything
        removeSyncedChanges(sentChanges) {
            const sentOperationIds = new Set((sentChanges.operations || []).map(op => op._id));
            const sentNoteIds = new Set((sentChanges.notes || []).map(note => note._id));

            const currentChanges = this.getPendingChanges();
            const remaining = {
                operations: currentChanges.operations.filter(op => !sentOperationIds.has(op._id)),
                notes: currentChanges.notes.filter(note => !sentNoteIds.has(note._id)),
            };

            this.savePendingChanges(remaining);
            DEBUG &&
                console.log(
                    "[FicTracker] Removed synced changes from pending queue. Remaining:",
                    remaining.operations.length,
                    "operations,",
                    remaining.notes.length,
                    "notes.",
                );
        }

        // [UPSTREAM 1.6.7.7] Re-apply whatever is still unsynced on top of the just-received
        // server data, so the overwrite never discards a change made mid-request.
        // 'set' ops (status/UI config) are skipped - updateLocalStorage protects those already
        reapplyPendingOperations() {
            const pending = this.getPendingChanges();

            pending.operations.forEach(op => {
                if (op.action === "add") {
                    this.storageManager.addIdToCategory(op.key, op.value);
                } else if (op.action === "remove") {
                    this.storageManager.removeIdFromCategory(op.key, op.value);
                }
            });

            if (pending.notes.length > 0) {
                const notes = JSON.parse(this.storageManager.getItem("FT_userNotes") || "{}");
                pending.notes.forEach(n => {
                    if (n.text.trim() === "") {
                        delete notes[n.fanficId];
                    } else {
                        notes[n.fanficId] = {
                            ...notes[n.fanficId],
                            text: n.text,
                            date: n.date,
                        };
                    }
                });
                this.storageManager.setItem("FT_userNotes", JSON.stringify(notes));
            }

            DEBUG &&
                console.log(
                    "[FicTracker] Reapplied",
                    pending.operations.length,
                    "pending ops and",
                    pending.notes.length,
                    "pending notes.",
                );
        }

        // Perform sync
        // [UPSTREAM 1.6.7.7] only one sync at a time - timers, the online event and
        // "Sync Now" could previously overlap. Callers during a sync get the in-flight one.
        async performSync() {
            if (this.currentSyncPromise) {
                DEBUG && console.log("[FicTracker] Sync already in progress, joining it.");
                return this.currentSyncPromise;
            }

            this.currentSyncPromise = this.runSync();
            try {
                return await this.currentSyncPromise;
            } finally {
                this.currentSyncPromise = null;
            }
        }

        // [FIX: sync-result] returns true/false (reason in this.lastSyncError) so
        // "Sync Now" stops reporting success for syncs that failed or never ran
        async runSync() {
            this.lastSyncError = null;

            if (!this.isOnline) {
                DEBUG && console.log("[FicTracker] Offline, skipping sync");
                this.lastSyncError = "Browser is offline";
                return false;
            }

            // [FORK: config-sync] queue status + UI config changes alongside regular sync
            this.syncStatusesConfigIfNeeded();
            this.syncUiConfigIfNeeded();

            // update widget appropriately
            this.isSyncing = true;
            this.updateSyncWidget("syncing");

            const pendingChanges = this.getPendingChanges();
            // [FORK: config-sync] confirms server actually saved a status-config update
            // before treating it as synced, so edits aren't silently lost
            const statusConfigSetOps = (pendingChanges.operations || []).filter(
                op => op && op.action === "set" && op.key === this.STATUS_CONFIG_KEY,
            );
            const attemptedStatusConfigSync = statusConfigSetOps.length > 0;
            const attemptedStatusConfigValue = attemptedStatusConfigSync
                ? String(statusConfigSetOps[statusConfigSetOps.length - 1].value || "")
                : "";
            DEBUG &&
                console.log(
                    "[FicTracker] Performing sync, pending operations:",
                    pendingChanges.operations.length,
                    "notes:",
                    pendingChanges.notes.length,
                );
            DEBUG &&
                pendingChanges.operations.length > 0 &&
                console.log("[FicTracker] Operations to sync:", pendingChanges.operations);

            try {
                let syncData = {
                    action: "sync",
                    queue: pendingChanges,
                };

                DEBUG && console.log("[FicTracker] Starting sync:", syncData);

                const response = await this.sendSyncRequest(syncData);

                const syncSucceeded = response?.success === true || response?.status === "success";

                if (syncSucceeded) {
                    const remoteStatusConfig = response?.status_data?.[this.STATUS_CONFIG_KEY];
                    const statusConfigConfirmed =
                        !attemptedStatusConfigSync || remoteStatusConfig === attemptedStatusConfigValue;

                    if (attemptedStatusConfigSync && !statusConfigConfirmed) {
                        DEBUG &&
                            console.warn(
                                "[FicTracker] FT_statusesConfig sync not confirmed by server response. Keeping local config and re-queuing update.",
                            );
                        response.status_data = response.status_data || {};
                        response.status_data[this.STATUS_CONFIG_KEY] = attemptedStatusConfigValue;
                    }

                    // Update local storage with server data
                    this.updateLocalStorage(response.status_data);

                    if (statusConfigConfirmed) {
                        const syncedConfig = this.storageManager.getItem(this.STATUS_CONFIG_KEY);
                        if (syncedConfig) {
                            this.storageManager.setItem(this.LAST_SYNCED_STATUS_CONFIG_KEY, syncedConfig);
                        }
                    }

                    const syncedUiConfig = this.storageManager.getItem(this.UI_CONFIG_KEY);
                    if (syncedUiConfig) {
                        this.storageManager.setItem(this.LAST_SYNCED_UI_CONFIG_KEY, syncedUiConfig);
                    }

                    this.timeUntilNextSync = this.syncInterval / 1000;
                    this.isSyncing = false;
                    this.updateSyncWidget("success");

                    // Update notes if provided
                    if (response.notes) {
                        this.updateLocalNotes(response.notes);
                    }

                    // Remove only the operations/notes that were actually sent in this request,
                    // so anything queued while the request was in flight (e.g. a kudos click) survives
                    this.removeSyncedChanges(pendingChanges);
                    // [UPSTREAM 1.6.7.7] re-apply anything still pending on top, so it isn't lost to the overwrite above
                    this.reapplyPendingOperations();

                    if (attemptedStatusConfigSync && !statusConfigConfirmed) {
                        this.addPendingStatusChange("set", this.STATUS_CONFIG_KEY, attemptedStatusConfigValue);
                    }

                    // Update last sync timestamp
                    this.storageManager.setItem(this.LAST_SYNC_KEY, Date.now().toString());
                    localStorage.removeItem(this.LAST_SYNC_FAILED_KEY);

                    DEBUG && console.log("[FicTracker] Sync completed successfully");
                    return true;
                } else {
                    // Apps Script error responses use "message", not "error"
                    this.lastSyncError = response?.message || response?.error || "Unknown server error";
                    console.error("[FicTracker] Sync failed:", this.lastSyncError);
                    this.storageManager.setItem(this.LAST_SYNC_FAILED_KEY, "1");
                    this.isSyncing = false;
                    this.updateSyncWidget("error");
                    return false;
                }
            } catch (error) {
                this.lastSyncError = error?.message || String(error);
                this.storageManager.setItem(this.LAST_SYNC_FAILED_KEY, "1");
                this.isSyncing = false;
                this.updateSyncWidget("error");
                console.error("[FicTracker] Sync failed:", error);
                return false;
            }
        }

        // Send sync request to server
        async sendSyncRequest(data) {
            // Wrap the sync request in a promise to handle async response with resolve/reject
            return new Promise((resolve, reject) => {
                DEBUG && console.log("[FicTracker] Sending sync request to:", settings.sheetUrl);

                // Use GM_xmlhttpRequest instead of fetch to avoid CORS
                GM_xmlhttpRequest({
                    method: "POST",
                    url: settings.sheetUrl,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    data: JSON.stringify(data),
                    timeout: 15000, // 15s timeout
                    onload: response => {
                        try {
                            const result = JSON.parse(response.responseText);
                            DEBUG &&
                                console.log("[FicTracker] Server response received and parsed successfully:", result);
                            resolve(result);
                        } catch (error) {
                            // Reject if server returns non-JSON or fails to parse
                            reject(new Error("Invalid JSON response"));
                        }
                    },
                    onerror: error => {
                        DEBUG && console.error("[FicTracker] Sync request failed due to network error:", error);
                        reject(new Error("Network error"));
                    },
                    ontimeout: () => {
                        DEBUG && console.warn("[FicTracker] Sync request timed out.");
                        reject(new Error("Request timeout"));
                    },
                });
            });
        }

        // Update local storage with server data
        updateLocalStorage(serverData) {
            const safeServerData = serverData || {};

            // ==== [FORK] CUSTOM STATUS + UI CONFIG SYNC ====
            // Apply UI config (changeStatusLabel, etc.)
            if (Object.prototype.hasOwnProperty.call(safeServerData, this.UI_CONFIG_KEY)) {
                const uiConfigValue = safeServerData[this.UI_CONFIG_KEY] || "";
                const lastSyncedUiConfig = this.storageManager.getItem(this.LAST_SYNCED_UI_CONFIG_KEY) || "";
                const localUiConfig = this.storageManager.getItem(this.UI_CONFIG_KEY) || "";
                const hasUnpushedUiChange = localUiConfig && localUiConfig !== lastSyncedUiConfig;

                if (!hasUnpushedUiChange) {
                    this.applyUiConfig(uiConfigValue);
                    this.storageManager.setItem(this.UI_CONFIG_KEY, uiConfigValue);
                } else {
                    DEBUG &&
                        console.log(
                            "[FicTracker] Skipping server UI config overwrite — local config has unpushed changes",
                        );
                }
            }

            // Apply status configuration first so syncedKeys include remote custom keys
            let configApplied = false;
            if (Object.prototype.hasOwnProperty.call(safeServerData, this.STATUS_CONFIG_KEY)) {
                const configValue = safeServerData[this.STATUS_CONFIG_KEY] || "";

                // Only overwrite the local config with the server's version when there is no
                // local change that hasn't been synced yet.  If the local config differs from
                // the last successfully-synced config it means the user just made a change that
                // hasn't reached the server — blindly overwriting it would silently discard that
                // change and prevent it from ever being queued again.
                const localConfig = this.storageManager.getItem(this.STATUS_CONFIG_KEY) || "";
                const lastSyncedConfig = this.storageManager.getItem(this.LAST_SYNCED_STATUS_CONFIG_KEY) || "";
                const hasUnpushedLocalChange = localConfig && localConfig !== lastSyncedConfig;

                if (!hasUnpushedLocalChange) {
                    this.storageManager.setItem(this.STATUS_CONFIG_KEY, configValue);
                    configApplied = this.applySyncedStatusesConfig(configValue);
                } else {
                    DEBUG &&
                        console.log(
                            "[FicTracker] Skipping server config overwrite — local config has unpushed changes",
                        );
                    // Still attempt to apply any new custom statuses from the server config
                    // (e.g. added on another device) without losing local display settings.
                    configApplied = this.applySyncedStatusesConfig(configValue);
                    // But restore the local config so the unpushed styling changes survive.
                    this.storageManager.setItem(this.STATUS_CONFIG_KEY, localConfig);
                }
            }

            if (!configApplied) {
                const inferredStatuses = inferStatusesFromStatusData(safeServerData, settings.statuses);
                if (inferredStatuses.length > 0) {
                    settings.statuses = mergeStatusesByStorageKey(settings.statuses, inferredStatuses);
                    const currentSettings = JSON.parse(localStorage.getItem("FT_settings") || "{}");
                    currentSettings.statuses = settings.statuses;
                    localStorage.setItem("FT_settings", JSON.stringify(currentSettings));
                    localStorage.setItem(this.STATUS_CONFIG_KEY, JSON.stringify(settings.statuses));
                    this.rebuildSyncedKeys();
                    DEBUG &&
                        console.log(
                            "[FicTracker] Inferred custom statuses from synced keys:",
                            inferredStatuses.map(s => s.storageKey),
                        );
                }
            }
            // ==== END: CUSTOM STATUS + UI CONFIG SYNC ====

            // Iterate through the list of keys that are eligible for syncing
            for (const key of this.syncedKeys) {
                // If the server response contains the key, update local storage with its value
                if (Object.prototype.hasOwnProperty.call(safeServerData, key)) {
                    this.storageManager.setItem(key, safeServerData[key]);
                    DEBUG &&
                        console.log(`[FicTracker] Synced key "${key}" updated from server data:`, safeServerData[key]);
                } else {
                    DEBUG && console.warn(`[FicTracker] Server data missing expected key "${key}"`);
                }
            }
        }

        // Update local storage with server notes data
        updateLocalNotes(serverNotes) {
            // Overwrite local user notes with the latest version from the server
            this.storageManager.setItem("FT_userNotes", JSON.stringify(serverNotes));
            DEBUG && console.log("[FicTracker] Local user notes updated from server.");
        }

        // Get sync status info
        getSyncStatus() {
            // Retrieve current pending operations and notes from storage
            const pendingChanges = this.getPendingChanges();
            const lastSync = this.storageManager.getItem(this.LAST_SYNC_KEY);

            DEBUG &&
                console.log("[FicTracker] Sync status retrieved:", {
                    pendingOperations: pendingChanges.operations.length,
                    pendingNoteUpdates: pendingChanges.notes.length,
                    lastSync: lastSync ? new Date(parseInt(lastSync)) : null,
                    isOnline: this.isOnline,
                });

            // Return an object summarizing sync status for UI/debug purposes
            return {
                pendingOperations: pendingChanges.operations.length,
                pendingNoteUpdates: pendingChanges.notes.length,
                lastSync: lastSync ? new Date(parseInt(lastSync)) : null,
                isOnline: this.isOnline,
            };
        }
    }

    // Class for bookmark data and tag management abstraction to keep things DRY
    class BookmarkTagManager {
        constructor(htmlSource) {
            // If it's already a document, use it directly, otherwise parse the HTML string
            if (htmlSource instanceof Document) {
                this.doc = htmlSource;
            } else {
                // Use DOMParser to parse the HTML response
                const parser = new DOMParser();
                this.doc = parser.parseFromString(htmlSource, "text/html");
            }
        }

        // Get the work ID from the DOM
        getWorkId() {
            return this.doc.getElementById("kudo_commentable_id")?.value || null;
        }

        // Get the bookmark ID from the form's action attribute
        getBookmarkId() {
            const bookmarkForm = this.doc.querySelector("div#bookmark_form_placement form");
            return bookmarkForm ? bookmarkForm.getAttribute("action").split("/")[2] : null;
        }

        // Get the pseud ID from the input
        getPseudId() {
            const singlePseud = this.doc.querySelector("input#bookmark_pseud_id");

            if (singlePseud) {
                return singlePseud.value;
            } else {
                // If user has multiple pseuds - use the default one to create bookmark
                const pseudSelect = this.doc.querySelector("select#bookmark_pseud_id");
                return pseudSelect?.value || null;
            }
        }

        // Gather all bookmark-related data into an object
        getBookmarkData() {
            return {
                workId: this.getWorkId(),
                bookmarkId: this.getBookmarkId(),
                pseudId: this.getPseudId(),
                bookmarkTags: this.getBookmarkTags(),
                notes: this.getBookmarkNotes(),
                collections: this.getBookmarkCollections(),
                isPrivate: this.isBookmarkPrivate(),
                isRec: this.isBookmarkRec(),
            };
        }

        getBookmarkTags() {
            return this.doc
                .querySelector("#bookmark_tag_string")
                .value.split(", ")
                .filter(tag => tag.length > 0);
        }

        getBookmarkNotes() {
            return this.doc.querySelector("textarea#bookmark_notes").textContent;
        }

        getBookmarkCollections() {
            return this.doc
                .querySelector("#bookmark_collection_names")
                .value.split(",")
                .filter(col => col.length > 0);
        }

        isBookmarkPrivate() {
            return this.doc.querySelector("#bookmark_private")?.checked || false;
        }

        isBookmarkRec() {
            return this.doc.querySelector("#bookmark_recommendation")?.checked || false;
        }

        async processTagToggle(
            tag,
            isTagPresent,
            bookmarkData,
            authenticityToken,
            storageKey,
            storageManager,
            requestManager,
            remoteSyncManager,
        ) {
            const previousTags = [...bookmarkData.bookmarkTags];
            let queuedOpId = null;

            // Toggle the bookmark tag and log the action
            if (isTagPresent) {
                DEBUG && console.log(`[FicTracker] Removing tag: ${tag}`);
                // Use case-insensitive search to find and remove the tag
                const tagIndex = bookmarkData.bookmarkTags.findIndex(t => t.toLowerCase() === tag.toLowerCase());
                if (tagIndex !== -1) {
                    bookmarkData.bookmarkTags.splice(tagIndex, 1);
                }
                storageManager.removeIdFromCategory(storageKey, bookmarkData.workId);

                if (remoteSyncManager) {
                    queuedOpId = remoteSyncManager.addPendingStatusChange("remove", storageKey, bookmarkData.workId);
                }
            } else {
                DEBUG && console.log(`[FicTracker] Adding tag: ${tag}`);
                bookmarkData.bookmarkTags.push(tag);
                storageManager.addIdToCategory(storageKey, bookmarkData.workId);

                if (remoteSyncManager) {
                    queuedOpId = remoteSyncManager.addPendingStatusChange("add", storageKey, bookmarkData.workId);
                }
            }

            try {
                // If the bookmark exists - update it, if not - create a new one
                if (bookmarkData.workId !== bookmarkData.bookmarkId) {
                    // If bookmark becomes empty (no notes, tags, collections) after status change - delete it
                    // A note containing only the auto-inserted prefill template counts as empty too
                    const noteIsOnlyPrefill = /^\s*<div>\s*<abbr title="ft_bookmark_note">/.test(bookmarkData.notes);
                    const hasNoData =
                        (bookmarkData.notes === "" || noteIsOnlyPrefill) &&
                        bookmarkData.bookmarkTags.length === 0 &&
                        bookmarkData.collections.length === 0;

                    if (settings.deleteEmptyBookmarks && hasNoData) {
                        DEBUG && console.log(`[FicTracker] Deleting empty bookmark ID: ${bookmarkData.bookmarkId}`);
                        await requestManager.deleteBookmark(bookmarkData.bookmarkId, authenticityToken);
                        bookmarkData.bookmarkId = bookmarkData.workId;
                    } else {
                        // Update the existing bookmark
                        await requestManager.updateBookmark(bookmarkData.bookmarkId, authenticityToken, bookmarkData);
                    }
                } else {
                    // Create a new bookmark
                    bookmarkData.isPrivate = settings.newBookmarksPrivate;
                    bookmarkData.isRec = settings.newBookmarksRec;
                    bookmarkData.bookmarkId = await requestManager.createBookmark(
                        bookmarkData.workId,
                        authenticityToken,
                        bookmarkData,
                    );

                    DEBUG && console.log(`[FicTracker] Created bookmark ID: ${bookmarkData.bookmarkId}`);
                }
            } catch (error) {
                // [UPSTREAM 1.6.7.7] Remote call failed/rejected - undo everything we applied
                DEBUG && console.warn("[FicTracker] Rolling back optimistic changes due to error:", error);
                bookmarkData.bookmarkTags = previousTags;
                rollbackStatusChange(
                    storageManager,
                    remoteSyncManager,
                    storageKey,
                    bookmarkData.workId,
                    isTagPresent,
                    queuedOpId,
                );
                throw error;
            }

            return bookmarkData;
        }

        // [FORK: series] gather series bookmark data from a series page document
        getSeriesBookmarkData(seriesId) {
            const form = this.doc.querySelector("div#bookmark_form_placement form");
            const action = form?.getAttribute("action") || "";
            // action is /series/ID/bookmarks (no bookmark) or /bookmarks/ID (existing bookmark)
            const hasExistingBookmark = action.startsWith("/bookmarks/");
            const bookmarkId = hasExistingBookmark ? action.split("/")[2] : null;

            return {
                workId: `series_${seriesId}`,
                bookmarkId,
                hasExistingBookmark,
                pseudId: this.getPseudId(),
                bookmarkTags: this.getBookmarkTags(),
                notes: this.getBookmarkNotes(),
                collections: this.getBookmarkCollections(),
                isPrivate: this.isBookmarkPrivate(),
                isRec: this.isBookmarkRec(),
            };
        }
    }

    // Class for managing bookmark status updates
    class BookmarkManager {
        constructor(baseApiUrl) {
            this.requestManager = new RequestManager(baseApiUrl);
            this.storageManager = new StorageManager();
            this.bookmarkTagManager = new BookmarkTagManager(document);
            this.ao3LinkManager = new Ao3LinkManager(this.requestManager); // [FORK: ao3-links]

            // Start remote manager if enabled in settings
            if (settings.syncEnabled) {
                this.remoteSyncManager = new RemoteStorageSyncManager();
                this.remoteSyncManager.init();
            }

            // Initialize user notes manager
            this.userNotesManager = new CustomUserNotesManager(this.storageManager, this.remoteSyncManager);

            // Extract bookmark-related data from the DOM
            this.bookmarkData = this.bookmarkTagManager.getBookmarkData();

            DEBUG && console.log(`[FicTracker] Initialized BookmarkManager with data:`);
            DEBUG && console.table(this.bookmarkData);

            // Hide the default "to read" button if specified in settings
            if (settings.hideDefaultToreadBtn) {
                document.querySelector("li.mark").style.display = "none";
            }

            // [FORK: subscribe-btn] hides default Subscribe button on work pages
            if (settings.hideDefaultSubscribeBtn) {
                const subscribeBtn = document.querySelector("li.subscribe");
                if (subscribeBtn) subscribeBtn.style.display = "none";
            }

            this.addButtons();
        }

        // Add action buttons and notes to the UI
        addButtons() {
            const actionsMenu = document.querySelector("ul.work.navigation.actions");
            const bottomActionsMenu = document.querySelector("div#feedback > ul");

            // Add user notes if enabled
            if (settings.displayUserNotes) {
                const ficWrapperContainer = document.querySelector("#main div.wrapper");
                const containerForNotes = ficWrapperContainer.parentElement;

                ficWrapperContainer.insertAdjacentHTML(
                    "afterend",
                    this.userNotesManager.generateNoteHtml(this.bookmarkData.workId, true, false, null),
                );
                this.userNotesManager.setupNoteHandlers(containerForNotes, true);
            }

            settings.statuses.forEach(({ tag, positiveLabel, negativeLabel, selector, enabled }) => {
                // Skip rendering btn for disabled status
                if (!enabled) return;

                // Case insensitive tag matching
                const isTagged = this.bookmarkData.bookmarkTags.some(t => t.toLowerCase() === tag.toLowerCase());

                const buttonHtml = `<li class="mark-as-read" id="${selector}"><a href="#">${isTagged ? negativeLabel : positiveLabel}</a></li>`;

                actionsMenu.insertAdjacentHTML("beforeend", buttonHtml);

                // insert button duplicate at the bottom
                if (settings.displayBottomActionButtons) {
                    bottomActionsMenu.insertAdjacentHTML("beforeend", buttonHtml);
                }
            });

            // [FORK: chapter-tracking] "Mark Chapter" button
            if (settings.enableMarkAsReadButton && isChapterPage()) {
                const markChapterButtonHtml =
                    '<li class="mark-as-read" id="mark-chapter-read"><a href="#">📖 Mark Chapter</a></li>';

                actionsMenu.insertAdjacentHTML("beforeend", markChapterButtonHtml);

                if (settings.displayBottomActionButtons) {
                    bottomActionsMenu.insertAdjacentHTML("beforeend", markChapterButtonHtml);
                }
            }

            this.setupClickListeners();

            // [FORK: kudos] initialize kudos hiding/tracking
            const kudosManager = new KudosManager(this.storageManager, this.remoteSyncManager);
            kudosManager.init();
        }

        // Set up click listeners for each action button
        setupClickListeners() {
            settings.statuses.forEach(({ selector, tag, positiveLabel, negativeLabel, storageKey, enabled }) => {
                // Don't setup listener for disabled btn
                if (!enabled) return;

                // Use querySelectorAll to get all elements with the duplicate ID (bottom menu)
                document.querySelectorAll(`#${selector}`).forEach(button => {
                    button.addEventListener("click", event => {
                        event.preventDefault();

                        this.handleActionButton(tag, positiveLabel, negativeLabel, selector, storageKey);
                    });
                });
            });

            // [FORK: chapter-tracking] listener for "Mark Chapter" button
            if (settings.enableMarkAsReadButton && isChapterPage()) {
                document.querySelectorAll("#mark-chapter-read").forEach(button => {
                    button.addEventListener("click", event => {
                        event.preventDefault();
                        this.handleMarkChapterAsRead();
                    });
                });
            }
        }

        // Handle the action for adding/removing/deleting a bookmark tag
        async handleActionButton(tag, positiveLabel, negativeLabel, selector, storageKey) {
            const authenticityToken = this.requestManager.getAuthenticityToken();
            // Use case-insensitive comparison to check if tag is present
            const isTagPresent = this.bookmarkData.bookmarkTags.some(t => t.toLowerCase() === tag.toLowerCase());

            // Consider button bottom menu duplication
            const buttons = document.querySelectorAll(`#${selector} a`);

            // Disable the buttons and show loading state
            buttons.forEach(btn => {
                btn.innerHTML = settings.loadingLabel;
                btn.disabled = true;
            });

            // Restored if the request fails, so the cached bookmark doesn't keep an unsaved prefill
            const previousNotes = this.bookmarkData.notes;

            // Fill the contents of bookmark note if enabled and note is not already there and we are adding tag
            if (
                settings.prefillBookmarkNote &&
                !this.bookmarkData.notes.includes("ft_bookmark_note") &&
                !isTagPresent
            ) {
                const ficDetails = this.userNotesManager.getFicDetailsForBookmarkNote(this.bookmarkData.workId, true);
                this.bookmarkData.notes += fillBookmarkNoteTemplate(
                    settings.bookmarkNoteTemplate,
                    ficDetails,
                    this.bookmarkData.notes.length,
                );
            }

            try {
                // Send tag toggle request and modify cached bookmark data
                this.bookmarkData = await this.bookmarkTagManager.processTagToggle(
                    tag,
                    isTagPresent,
                    this.bookmarkData,
                    authenticityToken,
                    storageKey,
                    this.storageManager,
                    this.requestManager,
                    this.remoteSyncManager,
                );

                // Update the labels for all buttons
                const finalLabel = isTagPresent ? positiveLabel : negativeLabel;
                buttons.forEach(btn => {
                    btn.innerHTML = finalLabel;
                });

                // [FORK: ao3-links] mirror the change on AO3's linked native buttons
                const linkFailures = await this.ao3LinkManager.syncWithStatus(
                    document,
                    storageKey,
                    !isTagPresent,
                    this.bookmarkData.workId,
                    "Work",
                );
                flashAo3LinkWarning(buttons, finalLabel, !isTagPresent, linkFailures);
            } catch (error) {
                console.error(`[FicTracker] Error during bookmark operation:`, error);
                this.bookmarkData.notes = previousNotes;
                buttons.forEach(btn => {
                    btn.innerHTML = "Error! Try Again";
                });
            } finally {
                buttons.forEach(btn => {
                    btn.disabled = false;
                });
            }
        }

        // [FORK: chapter-tracking] "Mark Chapter" button handler
        handleMarkChapterAsRead() {
            const chapterNum = getCurrentChapterNumber();
            if (!chapterNum) {
                console.error("[FicTracker] Could not determine chapter number");
                return;
            }

            const workId = this.bookmarkData.workId;
            const existingNote = this.userNotesManager.getNote(workId);
            const existingText = existingNote?.text || "";

            DEBUG && console.log("[FicTracker] Mark as Read - Before:", existingText);

            // Prepend chapter marker
            const updatedText = this.userNotesManager.prependChapterMarker(existingText, chapterNum);

            DEBUG && console.log("[FicTracker] Mark as Read - After:", updatedText);

            // Save note
            const ficDetails = this.userNotesManager.getFicDetails(workId, true);
            this.userNotesManager.saveNote(workId, updatedText, ficDetails);

            DEBUG && console.log("[FicTracker] Mark as Read - Saved to storage");

            // Verify save
            const savedNote = this.userNotesManager.getNote(workId);
            DEBUG && console.log("[FicTracker] Mark as Read - Verified:", savedNote?.text);

            // Update or create note display if displayUserNotes is enabled
            if (settings.displayUserNotes) {
                const ficWrapperContainer = document.querySelector("#main div.wrapper");
                const containerForNotes = ficWrapperContainer?.parentElement;

                if (containerForNotes) {
                    const noteBlock = containerForNotes.querySelector(`.user-note-preview[data-work-id="${workId}"]`);

                    if (noteBlock) {
                        // Update existing note display
                        this.userNotesManager.updateNoteDisplay(noteBlock, workId, true);
                    } else {
                        // Check if this is the first note being added (no handlers set up yet)
                        const hasExistingNotes = containerForNotes.querySelector(".user-note-preview") !== null;

                        // Create note display
                        ficWrapperContainer.insertAdjacentHTML(
                            "afterend",
                            this.userNotesManager.generateNoteHtml(workId, true, false, null),
                        );

                        // Only setup handlers if this is the first note (handlers not already set up)
                        if (!hasExistingNotes) {
                            this.userNotesManager.setupNoteHandlers(containerForNotes, true);
                        }
                    }
                }
            }

            // Visual feedback
            const buttons = document.querySelectorAll("#mark-chapter-read a");
            buttons.forEach(btn => {
                const originalText = btn.textContent;
                btn.textContent = "✓ Marked!";
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 1500);
            });
        }
    }

    // ==== [FORK] AO3 NATIVE BUTTON LINKS ====
    // Tags can be linked (one tag per action) to AO3's own Subscribe and Mark for Later buttons,
    // so marking/unmarking the tag also performs the native action

    // Storage key of the enabled tag carrying the given link flag, or null if none
    function getLinkedStatusKey(flag) {
        return settings.statuses.find(s => s[flag] && s.enabled)?.storageKey ?? null;
    }

    // Mirrors AO3's native Subscribe/Unsubscribe button
    class SubscriptionManager {
        constructor(requestManager) {
            this.requestManager = requestManager;
        }

        // AO3's subscribe form - present on work and series pages (also in fetched copies)
        getForm(doc) {
            return doc.querySelector("li.subscribe form");
        }

        // A subscribed form posts to /users/NAME/subscriptions/ID, an unsubscribed one to /users/NAME/subscriptions
        getSubscriptionId(form) {
            return form.getAttribute("action").match(/\/subscriptions\/(\d+)/)?.[1] ?? null;
        }

        // Subscribe (true) or unsubscribe (false); does nothing if already in that state
        async setSubscribed(doc, subscribe, subscribableId, subscribableType) {
            const form = this.getForm(doc);
            if (!form) throw new Error("AO3 Subscribe button not found");

            const subscriptionId = this.getSubscriptionId(form);
            if (subscribe === Boolean(subscriptionId)) return;

            const baseUrl = form.getAttribute("action").replace(/(\/subscriptions)\/\d+.*$/, "$1");
            const formData = new FormData();
            formData.append("authenticity_token", this.requestManager.getAuthenticityToken());

            // Same request AO3's own ajax-create-destroy form sends
            const headers = {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            };

            if (subscribe) {
                formData.append("subscription[subscribable_id]", subscribableId);
                formData.append("subscription[subscribable_type]", subscribableType);
                formData.append("commit", "Subscribe");

                const response = await this.requestManager.sendRequest(baseUrl, formData, headers);
                const data = await response.json().catch(() => ({}));
                if (!data.item_id) {
                    throw new Error("AO3 did not confirm the subscription");
                }
                this.updateForm(form, baseUrl, data.item_id);
            } else {
                formData.append("_method", "delete");
                await this.requestManager.sendRequest(`${baseUrl}/${subscriptionId}`, formData, headers);
                this.updateForm(form, baseUrl, null);
            }

            DEBUG &&
                console.log(
                    `[FicTracker] ${subscribe ? "Subscribed to" : "Unsubscribed from"} ${subscribableType} ${subscribableId}`,
                );
        }

        // Keep the (possibly hidden) native button in step, the way AO3's own script does
        updateForm(form, baseUrl, subscriptionId) {
            form.setAttribute("action", subscriptionId ? `${baseUrl}/${subscriptionId}` : baseUrl);

            const methodInput = form.querySelector('input[name="_method"]');
            if (subscriptionId && !methodInput) {
                form.insertAdjacentHTML(
                    "afterbegin",
                    '<input type="hidden" name="_method" value="delete" autocomplete="off">',
                );
            } else if (!subscriptionId && methodInput) {
                methodInput.remove();
            }

            const submit = form.querySelector('input[type="submit"]');
            if (submit) {
                submit.value = subscriptionId
                    ? form.dataset.destroyValue || "Unsubscribe"
                    : form.dataset.createValue || "Subscribe";
            }
        }

        // Called after a status change was saved. Returns false if the linked
        // subscription update failed (the status change itself is kept)
        async syncWithStatus(doc, storageKey, statusAdded, subscribableId, subscribableType) {
            if (!doc || storageKey !== getLinkedStatusKey("linkAo3Subscription")) return true;

            try {
                await this.setSubscribed(doc, statusAdded, subscribableId, subscribableType);
                return true;
            } catch (error) {
                console.error("[FicTracker] AO3 subscription update failed:", error);
                return false;
            }
        }
    }

    // Mirrors AO3's native Mark for Later / Mark as Read button (works only,
    // needs reading history enabled in AO3 preferences - otherwise AO3 shows no button)
    class MarkForLaterManager {
        constructor(requestManager) {
            this.requestManager = requestManager;
        }

        getForm(doc) {
            return doc.querySelector("li.mark form");
        }

        // Unmarked works post to /works/ID/mark_for_later, marked ones to /works/ID/mark_as_read
        isMarked(form) {
            return /\/mark_as_read(?:[?#]|$)/.test(form.getAttribute("action"));
        }

        // Mark (true) or unmark (false); does nothing if already in that state
        async setMarked(doc, mark, workId) {
            const form = this.getForm(doc);
            if (!form) {
                throw new Error("AO3 Mark for Later button not found (is reading history enabled?)");
            }
            if (mark === this.isMarked(form)) return;

            const url = `/works/${workId}/${mark ? "mark_for_later" : "mark_as_read"}`;
            const formData = new FormData();
            formData.append("_method", "patch");
            formData.append("authenticity_token", this.requestManager.getAuthenticityToken());

            await this.requestManager.sendRequest(url, formData, this.requestManager.getRequestHeaders());

            // Keep the (possibly hidden) native button in step
            form.setAttribute("action", `/works/${workId}/${mark ? "mark_as_read" : "mark_for_later"}`);
            const button = form.querySelector('button, input[type="submit"]');
            if (button) {
                const text = mark ? "Mark as Read" : "Mark for Later";
                if (button.tagName === "BUTTON") button.textContent = text;
                else button.value = text;
            }

            DEBUG && console.log(`[FicTracker] ${mark ? "Marked for later" : "Marked as read"}: work ${workId}`);
        }

        // Same contract as SubscriptionManager.syncWithStatus
        async syncWithStatus(doc, storageKey, statusAdded, workId, type) {
            if (!doc || type !== "Work" || storageKey !== getLinkedStatusKey("linkAo3MarkForLater")) return true;

            try {
                await this.setMarked(doc, statusAdded, workId);
                return true;
            } catch (error) {
                console.error("[FicTracker] AO3 Mark for Later update failed:", error);
                return false;
            }
        }
    }

    // Runs every native action linked to a tag; returns the names of any that failed
    class Ao3LinkManager {
        constructor(requestManager) {
            this.subscriptions = new SubscriptionManager(requestManager);
            this.markForLater = new MarkForLaterManager(requestManager);
        }

        async syncWithStatus(doc, storageKey, statusAdded, id, type) {
            const failures = [];
            if (!(await this.subscriptions.syncWithStatus(doc, storageKey, statusAdded, id, type)))
                failures.push(statusAdded ? "subscribe" : "unsubscribe");
            if (!(await this.markForLater.syncWithStatus(doc, storageKey, statusAdded, id, type)))
                failures.push(statusAdded ? "Mark for Later" : "Mark as Read");
            return failures;
        }
    }

    // Briefly show a warning on status buttons, then settle on their final label
    function flashAo3LinkWarning(elements, finalLabel, statusAdded, failures) {
        if (failures.length === 0) return;
        elements.forEach(el => {
            el.innerHTML = `⚠️ ${statusAdded ? "Tagged" : "Untagged"}, but AO3 ${failures.join(" & ")} failed`;
        });
        setTimeout(() => {
            elements.forEach(el => {
                el.innerHTML = finalLabel;
            });
        }, 4000);
    }
    // ==== END: AO3 NATIVE BUTTON LINKS ====

    // ==== [FORK] KUDOS HIDING & SYNC ====
    // Class for managing kudos button hiding and sync
    class KudosManager {
        constructor(storageManager, remoteSyncManager = null) {
            this.storageManager = storageManager;
            this.remoteSyncManager = remoteSyncManager;
            this.storageKey = settings.kudosStorageKey;
        }

        // Get work ID from the kudos form
        getWorkIdFromForm() {
            const workIdInput = document.getElementById("kudo_commentable_id");
            return workIdInput ? workIdInput.value : null;
        }

        // Get the kudos button element
        getKudosButton() {
            return document.getElementById("kudo_submit");
        }

        // Check if user has already given kudos to this work
        hasGivenKudos(workId) {
            const kudosGiven = this.storageManager.getIdsFromCategory(this.storageKey);
            if (kudosGiven.includes(workId)) return true;

            // Cross-compat fallback: recognize history from AO3: No Re-Kudos
            try {
                const noRekudos = JSON.parse(localStorage.getItem("ao3_no_rekudos_config") || "{}");
                return Boolean(noRekudos[workId]);
            } catch (e) {
                return false;
            }
        }

        // One-time absorb of AO3: No Re-Kudos history into FT_kudosGiven, so it
        // becomes part of FicTracker's synced data instead of only being
        // recognized locally via the fallback above.
        // [FIX: kudos] only marks absorption done once any absorbed IDs were actually
        // queued for sync (or there was nothing to absorb) — previously the flag was set
        // unconditionally, so absorbing while sync was disabled meant those IDs were never
        // queued, and a later full sync would silently overwrite local FT_kudosGiven with
        // the server's copy, permanently losing them.
        absorbNoRekudosHistory() {
            const ABSORB_FLAG = "FT_noReKudos";
            if (localStorage.getItem(ABSORB_FLAG)) return;

            let queuedForSync = true;

            try {
                const noRekudos = JSON.parse(localStorage.getItem("ao3_no_rekudos_config") || "{}");
                const workIds = Object.keys(noRekudos).filter(id => noRekudos[id]);
                workIds.forEach(id => {
                    this.storageManager.addIdToCategory(this.storageKey, id);
                    if (this.remoteSyncManager) {
                        this.remoteSyncManager.addPendingStatusChange("add", this.storageKey, id);
                    } else {
                        queuedForSync = false;
                    }
                });
                DEBUG && console.info(`[FicTracker] Absorbed ${workIds.length} kudos IDs from No Re-Kudos`);
            } catch (e) {
                DEBUG && console.warn("[FicTracker] Failed to absorb No Re-Kudos history:", e);
            } finally {
                if (queuedForSync) {
                    localStorage.setItem(ABSORB_FLAG, "1");
                }
            }
        }

        // Record that kudos was given and hide the button
        recordKudos(workId, button) {
            // Add to local storage
            this.storageManager.addIdToCategory(this.storageKey, workId);
            DEBUG && console.info("[FicTracker] Kudos recorded locally for work:", workId);
            DEBUG && console.info("[FicTracker] Current kudos storage:", this.storageManager.getItem(this.storageKey));

            // Queue sync operation if remote sync is enabled
            if (this.remoteSyncManager) {
                this.remoteSyncManager.addPendingStatusChange("add", this.storageKey, workId);
                DEBUG && console.info("[FicTracker] Kudos sync operation queued for work:", workId);
            } else {
                DEBUG && console.info("[FicTracker] Remote sync not enabled, kudos stored locally only");
            }

            // Hide the button
            button.style.display = "none";
        }

        // Initialize kudos tracking on the current page
        init() {
            this.absorbNoRekudosHistory();

            const kudosButton = this.getKudosButton();
            const workId = this.getWorkIdFromForm();

            // Early return if kudos button doesn't exist
            if (!kudosButton) {
                DEBUG && console.info("[FicTracker] No kudos button found on this page");
                return;
            }

            // Early return if work ID can't be determined
            if (!workId) {
                DEBUG && console.warn("[FicTracker] Could not determine work ID for kudos tracking");
                return;
            }

            // Check if kudos already given
            if (this.hasGivenKudos(workId)) {
                // Hide button immediately
                kudosButton.style.display = "none";
                DEBUG && console.info("[FicTracker] Kudos already given, button hidden for work:", workId);
            } else {
                // Attach click listener to record kudos when given
                kudosButton.addEventListener("click", () => {
                    // Small delay to ensure AO3's kudos form processes first
                    setTimeout(() => {
                        this.recordKudos(workId, kudosButton);
                    }, 100);
                });
                DEBUG && console.info("[FicTracker] Kudos tracking initialized for work:", workId);
            }
        }
    }
    // ==== END: KUDOS HIDING & SYNC ====

    // Class for handling features on works list page
    class WorksListHandler {
        constructor() {
            this.storageManager = new StorageManager();
            this.requestManager = new RequestManager("https://archiveofourown.org/");
            this.ao3LinkManager = new Ao3LinkManager(this.requestManager); // [FORK: ao3-links]

            // Start remote manager if enabled in settings
            if (settings.syncEnabled) {
                this.remoteSyncManager = new RemoteStorageSyncManager();
                this.remoteSyncManager.init();
            }

            // Initialize user notes manager
            this.userNotesManager = new CustomUserNotesManager(this.storageManager, this.remoteSyncManager);

            this.loadStoredIds();

            // Update the work list upon initialization
            this.updateWorkList();

            // Listen for clicks on quick tag buttons
            this.setupQuickTagListener();

            // [FORK: series] inject Change Status buttons on series pages
            this.addSeriesStatusButtons();

            // Display on page sorting controls if enabled
            if (settings.displayOnPageSorting) {
                this.setupOnPageSorting();
            }
        }

        // Retrieve stored IDs for different statuses
        loadStoredIds() {
            this.worksStoredIds = settings.statuses.reduce((acc, status) => {
                if (status.enabled) {
                    acc[status.storageKey] = this.storageManager.getIdsFromCategory(status.storageKey);
                }
                return acc;
            }, {});
        }

        // Execute features for each work on the page
        updateWorkList() {
            const works = document.querySelectorAll("li.work.blurb, li.bookmark.blurb");
            works.forEach(work => {
                // Skip deleted works that show the "deleted" message
                if (work.querySelector(".message")?.textContent.includes("has been deleted")) {
                    DEBUG && console.log("[FicTracker] Skipping deleted work:", work.id);
                    return;
                }

                const workId = this.getWorkId(work);
                // Skip if we couldn't get a valid work ID
                if (!workId) {
                    DEBUG && console.log("[FicTracker] Skipping work - could not get work ID");
                    return;
                }

                // [FORK: series] series bookmark blurbs store statuses under "series_ID"
                const seriesMatch = work.className.match(/\bseries-(\d+)\b/);
                const entityId = seriesMatch ? `series_${seriesMatch[1]}` : workId;

                // Only status highlighting for now, TBA
                this.highlightWorkStatus(work, entityId, true);

                // Reload stored IDs to reflect any changes in storage (from fic card)
                this.loadStoredIds();

                this.addQuickTagDropdown(work);

                // Display note management btn if enabled
                if (settings.displayUserNotes) {
                    this.addNoteButton(work);
                }
            });

            // Prefill all notes, listen for edits
            this.prefillNotes();
        }

        // Get the work ID from DOM
        getWorkId(work) {
            const link = work.querySelector("h4.heading a");
            if (!link) return null;
            const workId = link.href.split("/").pop();
            return workId;
        }

        // Change the visuals of each work's status
        highlightWorkStatus(work, workId, cardToStorageSync = false) {
            let shouldBeCollapsable = false;
            const appliedStatuses = new Set();

            // First check localStorage statuses
            Object.entries(this.worksStoredIds).forEach(([status, storedIds]) => {
                const statusClass = `glowing-border-${status}`;
                const hasStatus = storedIds.includes(workId);

                if (hasStatus) {
                    // Add appropriate class for collapsable works
                    work.classList.add(statusClass);
                    appliedStatuses.add(status);

                    const statusSettings = getStatusSettingsByStorageKey(status);
                    if (statusSettings?.collapse === true) {
                        shouldBeCollapsable = true;
                    }
                } else {
                    work.classList.remove(statusClass);
                }
            });

            // If no status was found in localStorage, check for bookmark tags in the card
            if (appliedStatuses.size === 0 && cardToStorageSync === true) {
                const userModule = work.querySelector("div.own.user.module.group");
                DEBUG && console.debug(`[FicTracker] Checking bookmark card for work ${workId}`);
                if (userModule) {
                    const tagsList = userModule.querySelector("ul.meta.tags.commas");
                    if (tagsList) {
                        const tagElements = tagsList.querySelectorAll("a.tag");
                        tagElements.forEach(tagElement => {
                            const tagText = tagElement.textContent.trim();
                            // Find matching status in settings
                            const matchingStatus = settings.statuses.find(status => status.tag === tagText);
                            if (matchingStatus) {
                                const statusClass = `glowing-border-${matchingStatus.storageKey}`;
                                work.classList.add(statusClass);
                                appliedStatuses.add(matchingStatus.storageKey);
                                DEBUG && console.log(`[FicTracker] Found status tag: ${tagText}`);

                                // Add the work ID to storage if it's not there yet
                                this.storageManager.addIdToCategory(matchingStatus.storageKey, workId);
                                DEBUG &&
                                    console.log(
                                        `[FicTracker] Synced work ${workId} to storage for status: ${matchingStatus.storageKey}`,
                                    );

                                if (matchingStatus.collapse === true) {
                                    shouldBeCollapsable = true;
                                }
                            }
                        });
                    }
                }
            }

            const ownBookmarksPage = isOwnBookmarksPage();
            const collapseAllowed = !ownBookmarksPage || settings.collapseAndHideOnBookmarks;

            // If at least one of the statuses of the work is set to be collapsable - let it be so
            // But check if we're on own bookmarks page and collapse is disabled there
            if (shouldBeCollapsable && collapseAllowed) {
                work.classList.add("FT_collapsable");
            } else {
                work.classList.remove("FT_collapsable");
            }
        }

        // [FORK: dropdown-style] reads skin's real <dd> spacing so the Change Status toggle matches it
        getStatsItemSpacing(statsList) {
            const items = statsList.querySelectorAll("dd");
            if (items.length < 2) return "0";

            const computed = getComputedStyle(items[items.length - 1]);
            const marginLeft = parseFloat(computed.marginLeft) || 0;
            const paddingLeft = parseFloat(computed.paddingLeft) || 0;
            const spacing = Math.max(marginLeft, paddingLeft);

            return spacing > 0 ? `${spacing}px` : "0";
        }

        // [FORK: dropdown-style] reads skin's real <dd> text color so the toggle matches it
        getStatsItemColor(statsList) {
            const item = statsList.querySelector("dd");
            if (!item) return null;

            return getComputedStyle(item).color || null;
        }

        // Add quick tag toggler dropdown to the work
        addQuickTagDropdown(work) {
            const workId = this.getWorkId(work);

            // [FORK: series] series bookmark blurbs store statuses under "series_ID"
            const seriesMatch = work.className.match(/\bseries-(\d+)\b/);
            const entityId = seriesMatch ? `series_${seriesMatch[1]}` : workId;

            // Generate the dropdown options dynamically based on the status categories
            const dropdownItems = Object.entries(this.worksStoredIds).map(([status, storedIds], index) => {
                let statusSettings = getStatusSettingsByStorageKey(status);
                // Don't render disabled statuses
                if (!statusSettings.enabled) return;

                const statusLabel = statusSettings[storedIds.includes(entityId) ? "negativeLabel" : "positiveLabel"];
                return `<li><a href="#" class="work_quicktag_btn" data-work-id="${workId}" data-status-tag="${statusSettings.tag}" data-status-name="${status}">${statusLabel}</a></li>`;
            });

            // No status is enabled, dont render Change Status menu
            if (dropdownItems.length === 0) return;

            // [FORK: dropdown-style] skin-aware spacing/color + custom changeStatusLabel
            const statsList = work.querySelector("dl.stats");
            const itemSpacing = this.getStatsItemSpacing(statsList);
            const itemColor = this.getStatsItemColor(statsList);
            const toggleColorStyle = itemColor ? `color: ${itemColor} !important;` : "";

            statsList.insertAdjacentHTML(
                "beforeend",
                `
                <header id="header" class="region" style="display: inline-flex !important; top: -1px; align-items: center !important; flex-wrap: nowrap !important; width: auto !important; max-width: none !important; position: relative !important; margin: 0 0 0 ${itemSpacing} !important; padding: 0 !important; background: transparent !important; border: 0 !important; box-shadow: none !important; color: inherit !important; font-size: 1em !important; cursor: pointer; opacity: 1; word-spacing: normal !important;">
                <ul class="navigation actions" style="margin: 0 !important; padding: 0 !important; display: flex !important; align-items: center !important; list-style: none !important;">
                    <li class="dropdown" aria-haspopup="true" style="position: relative !important; margin: 0 !important; padding: 0 !important;">
                        <a href="#" class="dropdown-toggle ft-quicktag-toggle" data-toggle="dropdown" data-target="#" style="${toggleColorStyle}">${settings.changeStatusLabel || "✿ Change Status ▼"}</a>
                        <ul class="menu dropdown-menu ft-quicktag-menu" style="width: auto !important; position: absolute !important; z-index: 9999 !important;">
                            ${dropdownItems.join("")}
                        </ul>
                    </li>
                </ul>
                </header>
            `,
            );
        }

        // Listen for clicks on quicktag dropdown items
        setupQuickTagListener() {
            const worksContainer = document.querySelector("div#main.region");
            // Event delegation for optimization
            worksContainer.addEventListener("click", async event => {
                if (event.target.matches("a.work_quicktag_btn")) {
                    // [FIX: dropdown-click] missing preventDefault() let clicks scroll page to top
                    event.preventDefault();
                    const targetStatusTag = event.target.dataset.statusTag;
                    const workId = event.target.dataset.workId;
                    const storageKey = event.target.dataset.statusName;
                    const statusSettings = getStatusSettingsByStorageKey(storageKey);

                    event.target.innerHTML = settings.loadingLabel;

                    // [FORK: series] detect if button is inside a series bookmark blurb
                    const blurb = event.target.closest("li.bookmark.blurb");
                    const seriesMatch = blurb?.className.match(/\bseries-(\d+)\b/);

                    // [FORK: series] (else branch below is the original work-bookmark path)
                    if (seriesMatch) {
                        // Series bookmark on bookmark listing page — use series endpoint
                        const seriesId = seriesMatch[1];
                        const entityId = `series_${seriesId}`;
                        const authenticityToken = this.requestManager.getAuthenticityToken();
                        let tagExists = false;
                        let statusApplied = false;
                        let queuedOpId = null;

                        try {
                            const bookmarkData = await this.getRemoteSeriesBookmarkData(seriesId);
                            const storedIds = this.storageManager.getIdsFromCategory(storageKey);
                            tagExists =
                                storedIds.includes(entityId) ||
                                bookmarkData.bookmarkTags.some(t => t.toLowerCase() === targetStatusTag.toLowerCase());

                            // Fill the contents of bookmark note if enabled and note is not already there, only on adding tags
                            if (
                                settings.prefillBookmarkNote &&
                                !bookmarkData.notes.includes("ft_bookmark_note") &&
                                !tagExists
                            ) {
                                const ficDetails = this.userNotesManager.getFicDetailsForBookmarkNote(entityId, false);
                                bookmarkData.notes += fillBookmarkNoteTemplate(
                                    settings.bookmarkNoteTemplate,
                                    ficDetails,
                                    bookmarkData.notes.length,
                                );
                            }

                            if (tagExists) {
                                const tagIndex = bookmarkData.bookmarkTags.findIndex(
                                    t => t.toLowerCase() === targetStatusTag.toLowerCase(),
                                );
                                if (tagIndex !== -1) bookmarkData.bookmarkTags.splice(tagIndex, 1);
                                this.storageManager.removeIdFromCategory(storageKey, entityId);
                                if (this.remoteSyncManager)
                                    queuedOpId = this.remoteSyncManager.addPendingStatusChange(
                                        "remove",
                                        storageKey,
                                        entityId,
                                    );
                            } else {
                                bookmarkData.bookmarkTags.push(targetStatusTag);
                                this.storageManager.addIdToCategory(storageKey, entityId);
                                if (this.remoteSyncManager)
                                    queuedOpId = this.remoteSyncManager.addPendingStatusChange(
                                        "add",
                                        storageKey,
                                        entityId,
                                    );
                            }
                            statusApplied = true;

                            // Strip auto-injected "Series" tag and any stale "Series" collection before empty check
                            const seriesTagIdx = bookmarkData.bookmarkTags.findIndex(t => t.toLowerCase() === "series");
                            if (seriesTagIdx !== -1) bookmarkData.bookmarkTags.splice(seriesTagIdx, 1);
                            const seriesColIdx = bookmarkData.collections.findIndex(c => c.toLowerCase() === "series");
                            if (seriesColIdx !== -1) bookmarkData.collections.splice(seriesColIdx, 1);

                            if (bookmarkData.hasExistingBookmark) {
                                const noteIsOnlyPrefill = /^\s*<div>\s*<abbr title="ft_bookmark_note">/.test(
                                    bookmarkData.notes,
                                );
                                const hasNoData =
                                    (bookmarkData.notes === "" || noteIsOnlyPrefill) &&
                                    bookmarkData.bookmarkTags.length === 0 &&
                                    bookmarkData.collections.length === 0;
                                if (settings.deleteEmptyBookmarks && hasNoData) {
                                    await this.requestManager.deleteBookmark(
                                        bookmarkData.bookmarkId,
                                        authenticityToken,
                                    );
                                    bookmarkData.hasExistingBookmark = false;
                                    bookmarkData.bookmarkId = null;
                                } else {
                                    // Ensure "Series" tag is always present on kept series bookmarks
                                    if (!bookmarkData.bookmarkTags.some(t => t.toLowerCase() === "series")) {
                                        bookmarkData.bookmarkTags.push("Series");
                                    }
                                    bookmarkData.isPrivate = settings.newBookmarksPrivate;
                                    bookmarkData.isRec = settings.newBookmarksRec;
                                    await this.requestManager.updateBookmark(
                                        bookmarkData.bookmarkId,
                                        authenticityToken,
                                        bookmarkData,
                                    );
                                }
                            } else {
                                bookmarkData.isPrivate = settings.newBookmarksPrivate;
                                bookmarkData.isRec = settings.newBookmarksRec;
                                // Ensure "Series" tag is always present on new series bookmarks
                                if (!bookmarkData.bookmarkTags.some(t => t.toLowerCase() === "series")) {
                                    bookmarkData.bookmarkTags.push("Series");
                                }
                                const newBookmarkId = await this.requestManager.createSeriesBookmark(
                                    seriesId,
                                    authenticityToken,
                                    bookmarkData,
                                );
                                bookmarkData.hasExistingBookmark = true;
                                bookmarkData.bookmarkId = newBookmarkId;
                                DEBUG && console.log(`[FicTracker] Created series bookmark ID: ${newBookmarkId}`);
                            }

                            this.loadStoredIds();
                            this.highlightWorkStatus(blurb, entityId);
                            const finalLabel = tagExists ? statusSettings.positiveLabel : statusSettings.negativeLabel;
                            event.target.innerHTML = finalLabel;

                            // [FORK: ao3-links] mirror the change on AO3's linked native buttons
                            const linkFailures = await this.ao3LinkManager.syncWithStatus(
                                bookmarkData.sourceDoc,
                                storageKey,
                                !tagExists,
                                seriesId,
                                "Series",
                            );
                            flashAo3LinkWarning([event.target], finalLabel, !tagExists, linkFailures);
                        } catch (error) {
                            console.error(
                                `[FicTracker] Error during series bookmark operation on bookmarks page:`,
                                error,
                            );
                            // [UPSTREAM 1.6.7.7] undo the optimistic status change
                            if (statusApplied) {
                                rollbackStatusChange(
                                    this.storageManager,
                                    this.remoteSyncManager,
                                    storageKey,
                                    entityId,
                                    tagExists,
                                    queuedOpId,
                                );
                                this.loadStoredIds();
                                this.highlightWorkStatus(blurb, entityId);
                            }
                            event.target.innerHTML = tagExists
                                ? statusSettings.negativeLabel
                                : statusSettings.positiveLabel;
                        }
                    } else {
                        // Standard work bookmark
                        const bookmarkData = await this.getRemoteBookmarkData(event.target);
                        const authenticityToken = this.requestManager.getAuthenticityToken();
                        // Use case-insensitive comparison to check if tag exists
                        const tagExists = bookmarkData.bookmarkTags.some(
                            t => t.toLowerCase() === targetStatusTag.toLowerCase(),
                        );

                        // Fill the contents of bookmark note if enabled and note is not already there, only on adding tags
                        if (
                            settings.prefillBookmarkNote &&
                            !bookmarkData.notes.includes("ft_bookmark_note") &&
                            !tagExists
                        ) {
                            const ficDetails = this.userNotesManager.getFicDetailsForBookmarkNote(workId, false);
                            bookmarkData.notes += fillBookmarkNoteTemplate(
                                settings.bookmarkNoteTemplate,
                                ficDetails,
                                bookmarkData.notes.length,
                            );
                        }

                        try {
                            // Send tag toggle request and modify cached bookmark data
                            this.bookmarkData = await this.bookmarkTagManager.processTagToggle(
                                targetStatusTag,
                                tagExists,
                                bookmarkData,
                                authenticityToken,
                                storageKey,
                                this.storageManager,
                                this.requestManager,
                                this.remoteSyncManager,
                            );

                            // Handle both search page and bookmarks page cases for work retrieval
                            const work =
                                document.querySelector(`li#work_${workId}`) ||
                                document.querySelector(`li.work-${workId}`);
                            // Update data from localStorage to properly highlight work
                            this.loadStoredIds();
                            this.highlightWorkStatus(work, workId);
                            const finalLabel = tagExists ? statusSettings.positiveLabel : statusSettings.negativeLabel;
                            event.target.innerHTML = finalLabel;

                            // [FORK: ao3-links] mirror the change on AO3's linked native buttons
                            const linkFailures = await this.ao3LinkManager.syncWithStatus(
                                bookmarkData.sourceDoc,
                                storageKey,
                                !tagExists,
                                workId,
                                "Work",
                            );
                            flashAo3LinkWarning([event.target], finalLabel, !tagExists, linkFailures);
                        } catch (error) {
                            console.error(`[FicTracker] Error during bookmark operation:`, error);
                            // processTagToggle already rolled back storage - refresh highlight and label
                            const work =
                                document.querySelector(`li#work_${workId}`) ||
                                document.querySelector(`li.work-${workId}`);
                            this.loadStoredIds();
                            if (work) this.highlightWorkStatus(work, workId);
                            event.target.innerHTML = tagExists
                                ? statusSettings.negativeLabel
                                : statusSettings.positiveLabel;
                        }
                    }
                } else if (event.target.matches("a.series_quicktag_btn")) {
                    // [FORK: series] Change Status handling on series-show pages
                    event.preventDefault();
                    const seriesId = event.target.dataset.seriesId;
                    const entityId = event.target.dataset.entityId;
                    const targetStatusTag = event.target.dataset.statusTag;
                    const storageKey = event.target.dataset.statusName;
                    const statusSettings = getStatusSettingsByStorageKey(storageKey);

                    event.target.innerHTML = settings.loadingLabel;

                    const bookmarkData = this.getSeriesBookmarkDataFromPage(seriesId);
                    const authenticityToken = this.requestManager.getAuthenticityToken();

                    // Check stored status and bookmark tags
                    const storedIds = this.storageManager.getIdsFromCategory(storageKey);
                    const tagExists =
                        storedIds.includes(entityId) ||
                        bookmarkData.bookmarkTags.some(t => t.toLowerCase() === targetStatusTag.toLowerCase());

                    // Fill the contents of bookmark note if enabled and note is not already there, only on adding tags
                    if (
                        settings.prefillBookmarkNote &&
                        !bookmarkData.notes.includes("ft_bookmark_note") &&
                        !tagExists
                    ) {
                        const ficDetails = this.userNotesManager.getFicDetailsForBookmarkNote(entityId, false);
                        bookmarkData.notes += fillBookmarkNoteTemplate(
                            settings.bookmarkNoteTemplate,
                            ficDetails,
                            bookmarkData.notes.length,
                        );
                    }

                    let statusApplied = false;
                    let queuedOpId = null;

                    try {
                        if (tagExists) {
                            DEBUG && console.log(`[FicTracker] Removing series tag: ${targetStatusTag}`);
                            const tagIndex = bookmarkData.bookmarkTags.findIndex(
                                t => t.toLowerCase() === targetStatusTag.toLowerCase(),
                            );
                            if (tagIndex !== -1) bookmarkData.bookmarkTags.splice(tagIndex, 1);
                            this.storageManager.removeIdFromCategory(storageKey, entityId);
                            if (this.remoteSyncManager) {
                                queuedOpId = this.remoteSyncManager.addPendingStatusChange(
                                    "remove",
                                    storageKey,
                                    entityId,
                                );
                            }
                        } else {
                            DEBUG && console.log(`[FicTracker] Adding series tag: ${targetStatusTag}`);
                            bookmarkData.bookmarkTags.push(targetStatusTag);
                            this.storageManager.addIdToCategory(storageKey, entityId);
                            if (this.remoteSyncManager) {
                                queuedOpId = this.remoteSyncManager.addPendingStatusChange("add", storageKey, entityId);
                            }
                        }
                        statusApplied = true;

                        // Strip auto-injected "Series" tag and any stale "Series" collection before empty check
                        const seriesTagIdx = bookmarkData.bookmarkTags.findIndex(t => t.toLowerCase() === "series");
                        if (seriesTagIdx !== -1) bookmarkData.bookmarkTags.splice(seriesTagIdx, 1);
                        const seriesColIdx = bookmarkData.collections.findIndex(c => c.toLowerCase() === "series");
                        if (seriesColIdx !== -1) bookmarkData.collections.splice(seriesColIdx, 1);

                        if (bookmarkData.hasExistingBookmark) {
                            const noteIsOnlyPrefill = /^\s*<div>\s*<abbr title="ft_bookmark_note">/.test(
                                bookmarkData.notes,
                            );
                            const hasNoData =
                                (bookmarkData.notes === "" || noteIsOnlyPrefill) &&
                                bookmarkData.bookmarkTags.length === 0 &&
                                bookmarkData.collections.length === 0;
                            if (settings.deleteEmptyBookmarks && hasNoData) {
                                DEBUG &&
                                    console.log(
                                        `[FicTracker] Deleting empty series bookmark ID: ${bookmarkData.bookmarkId}`,
                                    );
                                await this.requestManager.deleteBookmark(bookmarkData.bookmarkId, authenticityToken);
                                // Reset form action so next click creates a fresh bookmark
                                const form = document.querySelector("div#bookmark_form_placement form");
                                if (form) form.setAttribute("action", `/series/${seriesId}/bookmarks`);
                                bookmarkData.hasExistingBookmark = false;
                                bookmarkData.bookmarkId = null;
                            } else {
                                // Ensure "Series" tag is always present on kept series bookmarks
                                if (!bookmarkData.bookmarkTags.some(t => t.toLowerCase() === "series")) {
                                    bookmarkData.bookmarkTags.push("Series");
                                }
                                bookmarkData.isPrivate = settings.newBookmarksPrivate;
                                bookmarkData.isRec = settings.newBookmarksRec;
                                await this.requestManager.updateBookmark(
                                    bookmarkData.bookmarkId,
                                    authenticityToken,
                                    bookmarkData,
                                );
                            }
                        } else {
                            bookmarkData.isPrivate = settings.newBookmarksPrivate;
                            bookmarkData.isRec = settings.newBookmarksRec;
                            // Ensure "Series" tag is always present on new series bookmarks
                            if (!bookmarkData.bookmarkTags.some(t => t.toLowerCase() === "series")) {
                                bookmarkData.bookmarkTags.push("Series");
                            }
                            const newBookmarkId = await this.requestManager.createSeriesBookmark(
                                seriesId,
                                authenticityToken,
                                bookmarkData,
                            );
                            // Update form action so subsequent clicks treat this as an existing bookmark
                            const form = document.querySelector("div#bookmark_form_placement form");
                            if (form) form.setAttribute("action", `/bookmarks/${newBookmarkId}`);
                            bookmarkData.hasExistingBookmark = true;
                            bookmarkData.bookmarkId = newBookmarkId;
                            DEBUG && console.log(`[FicTracker] Created series bookmark ID: ${newBookmarkId}`);
                        }

                        // Sync updated tag list back to the DOM form so subsequent clicks
                        // read the correct current tags instead of stale initial values
                        const tagStringInput = document.getElementById("bookmark_tag_string");
                        if (tagStringInput) tagStringInput.value = bookmarkData.bookmarkTags.join(", ");

                        const finalLabel = tagExists ? statusSettings.positiveLabel : statusSettings.negativeLabel;
                        event.target.innerHTML = finalLabel;

                        // [FORK: ao3-links] mirror the change on AO3's linked native buttons
                        const linkFailures = await this.ao3LinkManager.syncWithStatus(
                            document,
                            storageKey,
                            !tagExists,
                            seriesId,
                            "Series",
                        );
                        flashAo3LinkWarning([event.target], finalLabel, !tagExists, linkFailures);
                    } catch (error) {
                        console.error(`[FicTracker] Error during series bookmark operation:`, error);
                        // [UPSTREAM 1.6.7.7] undo the optimistic status change
                        if (statusApplied) {
                            rollbackStatusChange(
                                this.storageManager,
                                this.remoteSyncManager,
                                storageKey,
                                entityId,
                                tagExists,
                                queuedOpId,
                            );
                        }
                        event.target.innerHTML = tagExists
                            ? statusSettings.negativeLabel
                            : statusSettings.positiveLabel;
                    }
                }
            });
        }

        // [FORK: series] inject Change Status dropdown into the series page nav
        addSeriesStatusButtons() {
            const seriesMain = document.querySelector("div#main.series-show.region");
            if (!seriesMain) return;

            const seriesId = window.location.pathname.match(/\/series\/(\d+)/)?.[1];
            if (!seriesId) return;

            const entityId = `series_${seriesId}`;

            const nav = seriesMain.querySelector('ul.navigation.actions[role="navigation"]');
            if (!nav) return;

            // Sync any status tags already on the bookmark into localStorage so initial labels are correct
            const bookmarkData = this.getSeriesBookmarkDataFromPage(seriesId);
            if (bookmarkData.hasExistingBookmark) {
                // Bookmark exists — add any status tags found on it to localStorage
                bookmarkData.bookmarkTags.forEach(tag => {
                    const matchingStatus = settings.statuses.find(s => s.tag.toLowerCase() === tag.toLowerCase());
                    if (matchingStatus) {
                        this.storageManager.addIdToCategory(matchingStatus.storageKey, entityId);
                        DEBUG &&
                            console.log(
                                `[FicTracker] Synced series ${seriesId} to storage for status: ${matchingStatus.storageKey}`,
                            );
                    }
                });
            } else {
                // No bookmark — clear any stale status entries so labels are correct
                settings.statuses.forEach(s => {
                    this.storageManager.removeIdFromCategory(s.storageKey, entityId);
                });
                DEBUG &&
                    console.log(`[FicTracker] No series bookmark found, cleared stale storage for series_${seriesId}`);
            }

            settings.statuses
                .filter(s => s.enabled)
                .forEach(s => {
                    const storedIds = this.storageManager.getIdsFromCategory(s.storageKey);
                    const label = storedIds.includes(entityId) ? s.negativeLabel : s.positiveLabel;
                    nav.insertAdjacentHTML(
                        "beforeend",
                        `<li class="mark-as-read" id="series_${s.selector}"><a href="#" class="series_quicktag_btn" data-series-id="${seriesId}" data-entity-id="${entityId}" data-status-tag="${s.tag}" data-status-name="${s.storageKey}">${label}</a></li>`,
                    );
                });
        }

        // [FORK: series] get series bookmark data from the current page document
        getSeriesBookmarkDataFromPage(seriesId) {
            const tagManager = new BookmarkTagManager(document);
            return tagManager.getSeriesBookmarkData(seriesId);
        }

        // Add note functionality to the work
        addNoteButton(work) {
            const workId = this.getWorkId(work);
            // div.header.module | ul.tags.commas | blockquote.userstuff.summary
            const container = work.querySelector("dl.stats");

            // Add the note block
            //beforeend | afterend
            container.insertAdjacentHTML(
                "beforebegin",
                this.userNotesManager.generateNoteHtml(workId, false, false, work),
            );
        }

        // Setup note handlers for the works list
        prefillNotes() {
            if (!settings.displayUserNotes) return;

            // div#main.filtered.region, div#main.works-search.region, div#main.series-show.region
            const container = document.querySelector("div#main.region");
            this.userNotesManager.setupNoteHandlers(container);
        }

        // Retrieves bookmark data (if exists) for a given work, by sending HTTP GET req
        async getRemoteBookmarkData(workElem) {
            DEBUG &&
                console.log(
                    `[FicTracker] Quicktag status change, requesting bookmark data workId=${workElem.dataset.workId}`,
                );

            try {
                const data = await this.requestManager.sendRequest(
                    `/works/${workElem.dataset.workId}`,
                    null,
                    null,
                    "GET",
                );
                DEBUG && console.log("[FicTracker] Bookmark data request successful:");
                DEBUG && console.table(data);

                // Read the response body as text
                const html = await data.text();
                this.bookmarkTagManager = new BookmarkTagManager(html);
                const bookmarkData = this.bookmarkTagManager.getBookmarkData();
                // [FORK: ao3-links] keep the fetched page for its Subscribe/Mark for Later forms
                Object.defineProperty(bookmarkData, "sourceDoc", {
                    value: this.bookmarkTagManager.doc,
                });

                DEBUG && console.log("[FicTracker] HTML parsed successfully:");
                DEBUG && console.table(bookmarkData);

                return bookmarkData;
            } catch (error) {
                DEBUG && console.error("[FicTracker] Error retrieving bookmark data:", error);
            }
        }

        // [FORK: series] fetch series bookmark data from the server
        async getRemoteSeriesBookmarkData(seriesId) {
            DEBUG &&
                console.log(
                    `[FicTracker] Quicktag status change, requesting series bookmark data seriesId=${seriesId}`,
                );

            try {
                const data = await this.requestManager.sendRequest(`/series/${seriesId}`, null, null, "GET");
                const html = await data.text();
                const tagManager = new BookmarkTagManager(html);
                const bookmarkData = tagManager.getSeriesBookmarkData(seriesId);
                // [FORK: ao3-links] keep the fetched page for its Subscribe/Mark for Later forms
                Object.defineProperty(bookmarkData, "sourceDoc", {
                    value: tagManager.doc,
                });

                DEBUG && console.log("[FicTracker] Series bookmark data parsed:");
                DEBUG && console.table(bookmarkData);

                return bookmarkData;
            } catch (error) {
                DEBUG && console.error("[FicTracker] Error retrieving series bookmark data:", error);
                throw error;
            }
        }

        // Setup on-page sorting functionality on own bookmarks page
        setupOnPageSorting() {
            if (isOwnBookmarksPage() && document.querySelector("form#bookmark-filters")) {
                this.injectSortUI();
                this.setupSortListener();
            }
        }

        // Inject sorting UI into the filters form
        injectSortUI() {
            const filtersForm = document.querySelector("form#bookmark-filters fieldset dl");
            if (filtersForm) {
                const sortUI = `
                    <dt class="sort">
                        <label style="cursor: help;" for="ft_onpage_sort" title="AO3's regular sort only works on works search, not bookmarks. This on-page sort lets you reorder the items currently loaded on this page. Note: it only sorts the works visible on this page, not across multiple pages.">Sort by (on-page)</label>
                    </dt>
                    <dd class="sort" style="margin-bottom: 30px;">
                        <select id="ft_onpage_sort">
                            <option value="">-</option>
                            <option value="authors_to_sort_on">Creator</option>
                            <option value="title_to_sort_on">Title</option>
                            <option value="revised_at">Date Updated</option>
                            <option value="word_count">Word Count</option>
                            <option value="hits">Hits</option>
                            <option value="kudos_count">Kudos</option>
                            <option value="comments_count">Comments</option>
                            <option value="bookmarks_count">Bookmarks</option>
                        </select>
                    </dd>
                `;
                filtersForm.insertAdjacentHTML("afterbegin", sortUI);
            }
        }

        // Setup listener for sort selection changes
        setupSortListener() {
            const sortSelect = document.getElementById("ft_onpage_sort");
            if (sortSelect) {
                sortSelect.addEventListener("change", event => {
                    const sortBy = event.target.value;
                    if (sortBy) {
                        this.sortBookmarks(sortBy);
                    }
                });
            }
        }

        // Sort bookmarks on the page based on selected criteria
        sortBookmarks(sortBy) {
            const container = document.querySelector("ol.bookmark.index.group");
            if (!container) return;

            const bookmarks = Array.from(container.querySelectorAll("li.bookmark.blurb"));

            const getSortableValue = (bookmark, criteria) => {
                let value;
                switch (criteria) {
                    case "authors_to_sort_on":
                        value = bookmark.querySelector('a[rel="author"]')?.textContent.trim().toLowerCase();
                        return value || "";
                    case "title_to_sort_on":
                        value = bookmark.querySelector("h4.heading a")?.textContent.trim().toLowerCase();
                        return value || "";
                    case "revised_at":
                        value = bookmark.querySelector("p.datetime").textContent.trim();
                        return new Date(bookmark.querySelector("p.datetime").textContent.trim()).getTime() || 0;
                    case "word_count":
                        value = bookmark.querySelector("dd.words")?.textContent.replace(/,/g, "");
                        return parseInt(value) || 0;
                    case "hits":
                        value = bookmark.querySelector("dd.hits")?.textContent.replace(/,/g, "");
                        return parseInt(value) || 0;
                    case "kudos_count":
                        value = bookmark.querySelector("dd.kudos a")?.textContent.replace(/,/g, "");
                        return parseInt(value) || 0;
                    case "comments_count":
                        value = bookmark.querySelector("dd.comments a")?.textContent.replace(/,/g, "");
                        return parseInt(value) || 0;
                    case "bookmarks_count":
                        value = bookmark.querySelector("dd.bookmarks a")?.textContent.replace(/,/g, "");
                        return parseInt(value) || 0;
                    default:
                        return 0;
                }
            };

            bookmarks.sort((a, b) => {
                const valA = getSortableValue(a, sortBy);
                const valB = getSortableValue(b, sortBy);

                if (typeof valA === "string") {
                    return valA.localeCompare(valB);
                } else {
                    // For numeric values, sort descending (more is better)
                    return valB - valA;
                }
            });

            // Re-append sorted bookmarks
            bookmarks.forEach(bookmark => container.appendChild(bookmark));
        }
    }

    // ==== [FORK] SETTINGS COLLAPSE ====
    // Open/closed state of the settings sections. Kept in this browser only - not synced or exported
    const SETTINGS_SECTIONS = ["tags", "tag", "buttons", "bookmarks", "notes", "sync", "backup", "advanced"];
    const OPEN_SECTIONS_KEY = "FT_settingsOpenSections";

    function loadOpenSections() {
        const open = Object.fromEntries(SETTINGS_SECTIONS.map(key => [key, key === "tags" || key === "tag"]));
        try {
            return { ...open, ...JSON.parse(localStorage.getItem(OPEN_SECTIONS_KEY) || "{}") };
        } catch (e) {
            return open;
        }
    }

    function saveOpenSections(open) {
        try {
            localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(open));
        } catch (e) {}
    }
    // ==== END: SETTINGS COLLAPSE ====

    // Class for handling the UI & logic for the script settings panel
    class SettingsPageHandler {
        constructor(settings) {
            this.settings = settings;
            this.init();

            if (this.settings.syncEnabled) {
                this.initRemoteSyncManager();
            }
        }

        init() {
            // Inject PetiteVue & insert the UI after
            this.injectVueScript(() => {
                this.loadSettingsPanel();
            });
        }

        initRemoteSyncManager() {
            if (!this.remoteSyncManager) {
                this.remoteSyncManager = new RemoteStorageSyncManager();
                this.remoteSyncManager.init();
            }
        }

        // Adding lightweight Vue.js fork (6kb) via CDN
        // Using it saves a ton of repeated LOC to attach event handlers & data binding
        // PetiteVue Homepage: https://github.com/vuejs/petite-vue
        injectVueScript(callback) {
            const vueScript = document.createElement("script");
            vueScript.src = "https://unpkg.com/petite-vue";
            document.head.appendChild(vueScript);
            vueScript.onload = callback;
        }

        // Load HTML template for the settings panel from GitHub repo
        // Insert into the AO3 preferences page & attach Vue app
        loadSettingsPanel() {
            // [FORK: settings-layout] plain wrapper, so each section is a top-level fieldset like AO3's own pages
            const container = document.createElement("div");

            // HTML template for the settings panel
            const settingsPanelHtml = `
                <style>
                    /* [FORK: settings-collapse] section headings double as toggles but keep the heading look */
                    #main .ft-section-toggle {
                        background: none !important;
                        border: 0 !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        font: inherit !important;
                        color: inherit !important;
                        text-align: left;
                        cursor: pointer;
                    }
                </style>
                <div v-scope @vue:mounted="onMounted">
                <!-- FicTracker Settings Panel HTML -->
                <!-- [FORK: settings-layout] grouped into AO3-style fieldsets (legend + h4 heading, ul for checkboxes, dl for fields, p.footnote for notes) -->
                <h2 class="heading">FicTracker Settings</h2>
                <p class="actions"><button type="button" @click="setAllSections(true)">Expand All</button> <button type="button" @click="setAllSections(false)">Collapse All</button></p>

                <!-- Tags -->
                <fieldset>
                    <legend>Tags</legend>
                    <h4 class="heading"><button type="button" class="ft-section-toggle" :aria-expanded="String(isOpen('tags'))" aria-controls="ft-section-tags" @click="toggleSection('tags')">Tags</button></h4>
                    <div id="ft-section-tags" v-show="isOpen('tags')">
                        <dl>
                            <dt><label for="status_select">Tag to configure</label></dt>
                            <dd>
                                <div style="display:flex; align-items:center; gap:8px; flex-wrap: wrap;">
                                    <select id="status_select" v-model="selectedStatus">
                                        <option v-for="(s, idx) in ficTrackerSettings.statuses" :key="s.storageKey || idx" :value="idx">{{ s.tag }}</option>
                                    </select>
                                    <input type="submit" value="＋ Add Tag" @click="addStatus">
                                    <input type="submit" :disabled="!canDeleteSelected" value="🗑️ Delete Tag" @click="deleteStatus">
                                </div>
                            </dd>
                        </dl>
                        <details>
                            <summary>Change tag order</summary>
                            <div style="border: 1px solid inherit; padding: 10px; border-radius: 5px; margin-top: 10px;">
                                <p class="notes">Use the arrows to change the order of the tag buttons on work pages and in the "Change Status" menu.</p>
                                <ul style="list-style: none; padding: 0;">
                                    <li v-for="(s, idx) in ficTrackerSettings.statuses" :key="s.storageKey || idx"
                                        :style="{padding: '5px', borderRadius: '3px', background: selectedStatus === idx ? 'rgba(0, 0, 0, 0.3)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}">
                                        <span @click="selectedStatus = idx" :style="{cursor: 'pointer'}" :title="'Click to edit ' + s.tag">{{ idx + 1 }}. {{ s.tag }}</span>
                                        <div style="display: flex; gap: 5px;">
                                            <button @click.stop="moveStatus(idx, -1)" :disabled="idx === 0" title="Move Up" style="cursor: pointer;">⬆️</button>
                                            <button @click.stop="moveStatus(idx, 1)" :disabled="idx === ficTrackerSettings.statuses.length - 1" title="Move Down" style="cursor: pointer;">⬇️</button>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </details>
                    </div>
                </fieldset>

                <!-- Settings for the selected tag -->
                <fieldset>
                    <legend>Tag Settings</legend>
                    <h4 class="heading"><button type="button" class="ft-section-toggle" :aria-expanded="String(isOpen('tag'))" aria-controls="ft-section-tag" @click="toggleSection('tag')">Tag: {{ currentSettings.tag }}</button></h4>
                    <div id="ft-section-tag" v-show="isOpen('tag')">

                        <ul>
                            <li>
                                <input type="checkbox" id="toggle_enabled" v-model="currentSettings.enabled">
                                <label for="toggle_enabled">Enabled</label>
                            </li>
                            <li>
                                <input type="checkbox" id="toggle_collapsable" v-model="currentSettings.collapse">
                                <label for="toggle_collapsable">
                                    Collapse works with this tag
                                </label> <a href="#" class="help symbol question" aria-label="Help: Collapse works with this tag" @click.prevent="showHelp('toggle_collapsable')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                            <li>
                                <input type="checkbox" id="toggle_hide" v-model="currentSettings.hide">
                                <label for="toggle_hide">
                                    Hide works with this tag
                                </label>
                            </li>
                        </ul>

                        <h5 class="heading">Labels</h5>
                        <dl>
                            <dt><label for="tag_name">Tag name</label></dt>
                            <dd>
                                <input type="text" id="tag_name" v-model="currentSettings.tag">
                                <small>Storage key: <code>{{ currentSettings.storageKey }}</code></small>
                            </dd>
                            <dt><label for="positive_label">Add button text</label></dt>
                            <dd><input type="text" id="positive_label" v-model="currentSettings.positiveLabel"></dd>
                            <dt><label for="negative_label">Remove button text</label></dt>
                            <dd><input type="text" id="negative_label" v-model="currentSettings.negativeLabel"></dd>
                        </dl>

                        <h5 class="heading">User Menu</h5>
                        <ul>
                            <li>
                                <input type="checkbox" id="toggle_displayInDropdown" v-model="currentSettings.displayInDropdown">
                                <label for="toggle_displayInDropdown">
                                    Show this tag in my AO3 user menu
                                </label>
                            </li>
                        </ul>
                        <dl>
                            <dt><label for="dropdown_label">Link text</label></dt>
                            <dd><input type="text" id="dropdown_label" v-model="currentSettings.dropdownLabel"></dd>
                            <!-- [FORK: dropdown-sort] -->
                            <dt><label for="dropdown_sort">Sort by</label></dt>
                            <dd>
                                <select id="dropdown_sort" :disabled="!currentSettings.displayInDropdown" @change="currentSettings.dropdownSort = $event.target.value">
                                    <option value="created_at" :selected="(currentSettings.dropdownSort || 'created_at') === 'created_at'">Date Bookmarked</option>
                                    <option value="bookmarkable_date" :selected="currentSettings.dropdownSort === 'bookmarkable_date'">Date Updated</option>
                                    <option value="word_count" :selected="currentSettings.dropdownSort === 'word_count'">Word Count</option>
                                </select>
                            </dd>
                        </dl>

                        <details id="highlighting_settings">
                            <summary>Highlighting</summary>
                            <dl>
                                <dt><label for="highlight_color">Highlight color</label></dt>
                                <dd><input type="color" id="highlight_color" v-model="currentSettings.highlightColor"></dd>
                                <dt><label for="border_size">Border size</label></dt>
                                <dd><input type="range" id="border_size" min="0" max="20" v-model="currentSettings.borderSize"></dd>
                                <dt><label for="border_opacity">Border opacity</label></dt>
                                <dd><input type="range" id="border_opacity" min="0" max="255" step="1" v-model="currentSettings.borderOpacity"></dd>
                                <dt><label for="highlight_opacity">Opacity</label></dt>
                                <dd><input type="range" id="highlight_opacity" min="0" max="1" step="0.1" v-model="currentSettings.opacity"></dd>
                                <dt><label for="highlight_priority">Highlight priority</label> <a href="#" class="help symbol question" aria-label="Help: Highlight priority" @click.prevent="showHelp('highlight_priority')"><span class="symbol question"><span>?</span></span></a></dt>
                                <dd>
                                    <input type="number" id="highlight_priority" name="quantity" value="1" v-model="currentSettings.highlightPriority">
                                </dd>
                                <dt>Preview</dt>
                                <dd>
                                    <div :style="previewStyle" id="highlighting_preview">
                                        This is a preview box
                                    </div>
                                </dd>
                            </dl>
                        </details>
                    </div>
                </fieldset>

                <!-- Buttons & menus: FicTracker's own, then AO3's native ones -->
                <fieldset>
                    <legend>Buttons &amp; Menus</legend>
                    <h4 class="heading"><button type="button" class="ft-section-toggle" :aria-expanded="String(isOpen('buttons'))" aria-controls="ft-section-buttons" @click="toggleSection('buttons')">Buttons &amp; Menus</button></h4>
                    <div id="ft-section-buttons" v-show="isOpen('buttons')">

                        <h5 class="heading">FicTracker Buttons</h5>
                        <dl>
                            <!-- [FORK: dropdown-label] -->
                            <dt><label for="change_status_label">"Change Status" menu text</label></dt>
                            <dd>
                                <input type="text" id="change_status_label" v-model="ficTrackerSettings.changeStatusLabel" placeholder="✿ Change Status ▼">
                            </dd>
                            <!-- [UPSTREAM 1.6.7.9] -->
                            <dt><label for="loading_label">Loading text</label></dt>
                            <dd><input type="text" id="loading_label" v-model="ficTrackerSettings.loadingLabel" placeholder="⏳Loading..."></dd>
                        </dl>
                        <ul>
                            <li>
                                <input type="checkbox" id="toggle_displayBottomActionButtons" v-model="ficTrackerSettings.displayBottomActionButtons">
                                <label for="toggle_displayBottomActionButtons">Also show tag buttons at the bottom of work pages</label>
                            </li>
                        </ul>

                        <!-- [FORK: ao3-links] AO3's native buttons -->
                        <h5 class="heading">AO3 Buttons</h5>
                        <dl>
                            <dt><label for="subscription_tag">Link AO3 subscriptions to tag</label> <a href="#" class="help symbol question" aria-label="Help: Link AO3 subscriptions to tag" @click.prevent="showHelp('subscription_tag')"><span class="symbol question"><span>?</span></span></a></dt>
                            <dd>
                                <select id="subscription_tag" @change="setLinkedTag('linkAo3Subscription', $event.target.value)">
                                    <option value="" :selected="!linkedTagKey('linkAo3Subscription')">None</option>
                                    <option v-for="s in ficTrackerSettings.statuses.filter((s) => s.enabled)" :key="s.storageKey" :value="s.storageKey" :selected="s.storageKey === linkedTagKey('linkAo3Subscription')">{{ s.tag }}</option>
                                </select>
                            </dd>
                            <dt><label for="mark_for_later_tag">Link AO3 Mark for Later to tag</label> <a href="#" class="help symbol question" aria-label="Help: Link AO3 Mark for Later to tag" @click.prevent="showHelp('mark_for_later_tag')"><span class="symbol question"><span>?</span></span></a></dt>
                            <dd>
                                <select id="mark_for_later_tag" @change="setLinkedTag('linkAo3MarkForLater', $event.target.value)">
                                    <option value="" :selected="!linkedTagKey('linkAo3MarkForLater')">None</option>
                                    <option v-for="s in ficTrackerSettings.statuses.filter((s) => s.enabled)" :key="s.storageKey" :value="s.storageKey" :selected="s.storageKey === linkedTagKey('linkAo3MarkForLater')">{{ s.tag }}</option>
                                </select>
                            </dd>
                        </dl>
                        <ul>
                            <li>
                                <input type="checkbox" id="hide_default_subscribe" v-model="ficTrackerSettings.hideDefaultSubscribeBtn">
                                <label for="hide_default_subscribe">Hide AO3's Subscribe button</label>
                            </li>
                            <li>
                                <input type="checkbox" id="hide_default_toread" v-model="ficTrackerSettings.hideDefaultToreadBtn">
                                <label for="hide_default_toread">Hide AO3's Mark for Later button</label>
                            </li>
                        </ul>
                    </div>
                </fieldset>

                <!-- Bookmarks -->
                <fieldset>
                    <legend>Bookmarks</legend>
                    <h4 class="heading"><button type="button" class="ft-section-toggle" :aria-expanded="String(isOpen('bookmarks'))" aria-controls="ft-section-bookmarks" @click="toggleSection('bookmarks')">Bookmarks</button></h4>
                    <div id="ft-section-bookmarks" v-show="isOpen('bookmarks')">

                        <ul>
                            <li>
                                <input type="checkbox" id="toggle_private" v-model="ficTrackerSettings.newBookmarksPrivate">
                                <label for="toggle_private">Mark new bookmarks as private</label>
                            </li>
                            <li>
                                <input type="checkbox" id="toggle_rec" v-model="ficTrackerSettings.newBookmarksRec">
                                <label for="toggle_rec">Mark new bookmarks as recs</label>
                            </li>
                            <li>
                                <input type="checkbox" id="toggle_bookmarkNoteFormatting" v-model="ficTrackerSettings.prefillBookmarkNote">
                                <label for="toggle_bookmarkNoteFormatting">Prefill bookmark notes with work details</label> <a href="#" class="help symbol question" aria-label="Help: Prefill bookmark notes with work details" @click.prevent="showHelp('toggle_bookmarkNoteFormatting')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                        </ul>
                        <details id="notes_settings">
                            <summary>Bookmark note template</summary>
                            <p class="notes"><a target="_blank" href="https://archiveofourown.org/faq/formatting-content-on-ao3-with-html">AO3 HTML formatting guide</a></p>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <textarea id="notes_content" aria-label="Bookmark note template" v-model="ficTrackerSettings.bookmarkNoteTemplate"
                                    style="height: 120px; resize: vertical;">
                                </textarea>
                                <div v-html="bookmarkNoteFormattingPreview" class="note-textarea" style="display: block; box-sizing: border-box; padding: 8px; min-height: 120px; border: 1px solid rgba(128,128,128,0.2); border-radius: 4px;"></div>
                            </div>
                            <small>Placeholders: {AUTHOR} {TITLE} {FANDOM} {PAIRING_TAGS} {CHARACTER_TAGS} {ADDITIONAL_TAGS} {SUMMARY} {SERIES} {SERIES_SUMMARY} {WORK_ID}</small>
                        </details>
                        <ul>
                            <li>
                                <input type="checkbox" id="toggle_deleteEmptyBookmarks" v-model="ficTrackerSettings.deleteEmptyBookmarks">
                                <label for="toggle_deleteEmptyBookmarks">
                                    Delete bookmarks left empty after removing a tag
                                </label> <a href="#" class="help symbol question" aria-label="Help: Delete bookmarks left empty after removing a tag" @click.prevent="showHelp('toggle_deleteEmptyBookmarks')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                        </ul>

                        <h5 class="heading">Bookmarks Page</h5>
                        <ul>
                            <li>
                                <input type="checkbox" id="toggle_collapseAndHideOnBookmarks" v-model="ficTrackerSettings.collapseAndHideOnBookmarks">
                                <label for="toggle_collapseAndHideOnBookmarks">
                                    Collapse and hide works here too
                                </label> <a href="#" class="help symbol question" aria-label="Help: Collapse and hide works here too" @click.prevent="showHelp('toggle_collapseAndHideOnBookmarks')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                            <li>
                                <input type="checkbox" id="toggle_displayOnPageSorting" v-model="ficTrackerSettings.displayOnPageSorting">
                                <label for="toggle_displayOnPageSorting">
                                    Show on-page sort controls
                                </label> <a href="#" class="help symbol question" aria-label="Help: Show on-page sort controls" @click.prevent="showHelp('toggle_displayOnPageSorting')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                        </ul>
                    </div>
                </fieldset>

                <!-- My notes -->
                <fieldset>
                    <legend>My Notes</legend>
                    <h4 class="heading"><button type="button" class="ft-section-toggle" :aria-expanded="String(isOpen('notes'))" aria-controls="ft-section-notes" @click="toggleSection('notes')">My Notes</button></h4>
                    <div id="ft-section-notes" v-show="isOpen('notes')">
                        <ul>
                            <li>
                                <input type="checkbox" id="toggle_displayUserNotes" v-model="ficTrackerSettings.displayUserNotes">
                                <label for="toggle_displayUserNotes">
                                    Show "Add Note" button and my notes on work cards
                                </label>
                            </li>
                            <li style="margin-left: 20px;">
                                <input type="checkbox" id="toggle_hideEmptyNoteButtonOnListings" v-model="ficTrackerSettings.hideEmptyNoteButtonOnListings">
                                <label for="toggle_hideEmptyNoteButtonOnListings">Hide the "Add Note" button on listings</label> <a href="#" class="help symbol question" aria-label="Help: Hide the &quot;Add Note&quot; button on listings" @click.prevent="showHelp('toggle_hideEmptyNoteButtonOnListings')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                            <li>
                                <input type="checkbox" id="toggle_expandUserNoteDetails" v-model="ficTrackerSettings.expandUserNoteDetails">
                                <label for="toggle_expandUserNoteDetails">
                                    Auto-expand my notes
                                </label>
                            </li>
                            <li>
                                <input type="checkbox" id="toggle_displayMyNotesBtn" v-model="ficTrackerSettings.displayMyNotesButton">
                                <label for="toggle_displayMyNotesBtn">
                                    Show "My Notes" in the navigation bar
                                </label> <a href="#" class="help symbol question" aria-label="Help: Show &quot;My Notes&quot; in the navigation bar" @click.prevent="showHelp('toggle_displayMyNotesBtn')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                            <!-- [FORK: chapter-tracking] -->
                            <li>
                                <input type="checkbox" id="toggle_enableMarkAsReadButton" v-model="ficTrackerSettings.enableMarkAsReadButton">
                                <label for="toggle_enableMarkAsReadButton">Show "Mark Chapter" button</label> <a href="#" class="help symbol question" aria-label="Help: Show &quot;Mark Chapter&quot; button" @click.prevent="showHelp('toggle_enableMarkAsReadButton')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                        </ul>
                    </div>
                </fieldset>

                <!-- Google Sheets sync -->
                <fieldset>
                    <legend>Google Sheets Sync</legend>
                    <h4 class="heading">
                        <button type="button" class="ft-section-toggle" :aria-expanded="String(isOpen('sync'))" aria-controls="ft-section-sync" @click="toggleSection('sync')">Google Sheets Sync</button>
                        <a href="#" class="help symbol question" aria-label="What is Google Sheets Sync?" @click.prevent="displayModal('What is Google Sheets Storage Sync', modalGoogleSyncInfo)"><span class="symbol question"><span>?</span></span></a>
                        <a href="https://greasyfork.org/en/scripts/513435-ao3-fictracker" target="_blank" style="font-size: 0.8em; margin-left: 10px;">[Setup Guide]</a>
                    </h4>
                    <div id="ft-section-sync" v-show="isOpen('sync')">
                        <ul>
                            <li>
                                <label>
                                    <input type="checkbox" v-model="ficTrackerSettings.syncEnabled">
                                    Enable automatic sync
                                </label>
                            </li>
                        </ul>
                        <div v-show="ficTrackerSettings.syncEnabled">
                            <dl>
                                <dt><label for="sheet_url">Google Script URL</label> <a href="#" class="help symbol question" aria-label="Help: Google Script URL" @click.prevent="showHelp('sheet_url')"><span class="symbol question"><span>?</span></span></a></dt>
                                <dd>
                                    <input type="text" id="sheet_url" v-model="ficTrackerSettings.sheetUrl" :disabled="ficTrackerSettings.syncDBInitialized" placeholder="https://script.google.com/macros/s/AKfyc.../exec">
                                </dd>
                                <dt><label for="sync_interval">Sync interval</label></dt>
                                <dd>
                                    <input type="range" id="sync_interval"
                                        v-model="ficTrackerSettings.syncInterval"
                                        min="60" max="3600" step="60"
                                        style="width: 200px; margin-right: 10px;">
                                    <strong>{{ ficTrackerSettings.syncInterval }} seconds</strong>
                                </dd>
                            </dl>
                            <ul>
                                <li>
                                    <label>
                                        <input type="checkbox" v-model="ficTrackerSettings.syncWidgetEnabled">
                                        Show sync status widget
                                    </label> <a href="#" class="help symbol question" aria-label="Help: Show sync status widget" @click.prevent="showHelp('sync_widget')"><span class="symbol question"><span>?</span></span></a>
                                </li>
                            </ul>
                            <dl v-if="ficTrackerSettings.syncWidgetEnabled">
                                <dt><label for="sync_widget_opacity">Widget opacity</label></dt>
                                <dd>
                                    <input type="range" id="sync_widget_opacity"
                                        v-model="ficTrackerSettings.syncWidgetOpacity"
                                        min="0.1" max="1" step="0.1"
                                        style="width: 200px; margin-right: 10px;">
                                    <strong>{{ ficTrackerSettings.syncWidgetOpacity }}</strong>
                                </dd>
                            </dl>

                            <p v-if="lastSyncTime && ficTrackerSettings.syncDBInitialized">
                                <strong>Last sync:</strong> {{ lastSyncTimeFormatted }}
                                <br>
                                <strong>Next sync in:</strong> {{ timeUntilSync }}s
                            </p>

                            <!-- Status display with loading states -->
                            <div v-if="loadingStates.testConnection" style="color: #0066cc;">
                                🔄 Testing connection...
                            </div>
                            <div v-else-if="loadingStates.sync" style="color: #0066cc;">
                                🔄 Syncing data...
                            </div>
                            <div v-else-if="loadingStates.initialize" style="color: #0066cc;">
                                🔄 Initializing Google Sheet...
                            </div>
                            <div v-else-if="Object.keys(sheetConnectionStatus).length > 0" :style="{color: sheetConnectionStatus.success ? 'green' : 'red'}">
                                {{ sheetConnectionStatus.success ? '✅' : '❌' }} {{ sheetConnectionStatus.message }}
                            </div>
                            <div v-else-if="Object.keys(syncFeedback).length > 0" :style="{color: syncFeedback.success ? 'green' : 'red'}">
                                {{ syncFeedback.success ? '✅' : '❌' }} {{ syncFeedback.message }}
                            </div>

                            <p class="actions">
                                <input type="submit"
                                    @click="testSheetConnection"
                                    :value="loadingStates.testConnection ? 'Testing...' : 'Test Connection'"
                                    :disabled="loadingStates.testConnection || loadingStates.sync || loadingStates.initialize">

                                <input v-if="ficTrackerSettings.syncDBInitialized"
                                    type="submit"
                                    @click="syncNow"
                                    :value="loadingStates.sync ? 'Syncing...' : 'Sync Now'"
                                    :disabled="loadingStates.testConnection || loadingStates.sync || loadingStates.initialize">

                                <input type="submit"
                                    v-if="ficTrackerSettings.syncDBInitialized"
                                    @click="resetSyncSettings"
                                    value="Reset Sync Settings"
                                    :disabled="loadingStates.testConnection || loadingStates.sync || loadingStates.initialize">

                                <input v-if="readyToInitDB && !ficTrackerSettings.syncDBInitialized"
                                    type="submit"
                                    @click="initializeSheetStorage"
                                    :value="loadingStates.initialize ? 'Initializing...' : 'Initialize Google Sheet Storage'"
                                    :disabled="loadingStates.testConnection || loadingStates.sync || loadingStates.initialize">
                            </p>
                        </div>
                    </div>
                </fieldset>

                <!-- Backup -->
                <fieldset>
                    <legend>Backup</legend>
                    <h4 class="heading"><button type="button" class="ft-section-toggle" :aria-expanded="String(isOpen('backup'))" aria-controls="ft-section-backup" @click="toggleSection('backup')">Backup</button></h4>
                    <div id="ft-section-backup" v-show="isOpen('backup')">
                        <p class="notes">Last export: {{ ficTrackerSettings.lastExportTimestamp || "Never" }}</p>
                        <ul>
                            <li>
                                <input type="checkbox" id="export_status_config" v-model="ficTrackerSettings.exportStatusesConfig">
                                <label for="export_status_config">
                                    Include tag settings in exports
                                </label> <a href="#" class="help symbol question" aria-label="Help: Include tag settings in exports" @click.prevent="showHelp('export_status_config')"><span class="symbol question"><span>?</span></span></a>
                            </li>
                        </ul>
                        <p class="actions">
                            <!-- Hidden file input -->
                            <input type="file" id="import_file" accept=".json" style="display: none;" @change="importData">
                            <input type="submit" id="import_data" value="Import from file..."
                                title="Load your FicTracker data from a backup file"
                                @click="document.getElementById('import_file').click(); return false;">
                            <input type="submit" id="export_data" value="Export to file..."
                                title="Save your FicTracker data to a backup file" @click='exportData'>
                        </p>
                    </div>
                </fieldset>

                <!-- Advanced -->
                <fieldset>
                    <legend>Advanced</legend>
                    <h4 class="heading"><button type="button" class="ft-section-toggle" :aria-expanded="String(isOpen('advanced'))" aria-controls="ft-section-advanced" @click="toggleSection('advanced')">Advanced</button></h4>
                    <div id="ft-section-advanced" v-show="isOpen('advanced')">
                        <ul>
                            <li>
                                <input type="checkbox" id="toggle_debug" v-model="ficTrackerSettings.debug">
                                <label for="toggle_debug">Debug mode</label>
                            </li>
                        </ul>
                        <p class="actions">
                            <input type="submit" id="reset_settings" value="Reset Settings to Default"
                            title="Reset all FicTracker settings to their original default values"
                            @click="resetSettings">
                        </p>
                    </div>
                </fieldset>

                <!-- Save Settings -->
                <fieldset>
                    <legend>Actions</legend>
                    <p class="submit actions">
                        <input type="submit" id="save_settings" value="Update" @click="saveSettings();alert('Settings successfully saved :)')">
                    </p>
                </fieldset>
                </div>
            `;
            // Fetching the HTML for settings panel, outsourced for less clutter
            container.innerHTML = settingsPanelHtml;

            document.querySelector("#main").appendChild(container);

            // Initialize the Vue app instance
            PetiteVue.createApp({
                selectedStatus: 0,
                ficTrackerSettings: this.settings,
                lastSyncTime: null,
                timeUntilSync: null,
                sheetConnectionStatus: {},
                syncFeedback: {},
                initStatus: null,
                readyToInitDB: false,
                // [FORK: settings-collapse]
                openSections: loadOpenSections(),
                syncFailureShown: false,
                modalGoogleSyncInfo:
                    "<h2>What is Google Sheets Storage Sync?</h2><p>This feature allows you to sync all your FicTracker data across multiple devices by using Google Sheets as the <b>source of truth</b> data storage. When you first initialize the database on a device, the storage fills with your current data.</p><p><b>Recommendation:</b> If you only use FicTracker on one device, basic syncing via AO3 storage is sufficient. However, if you use multiple devices and want near real-time syncing (~60 seconds), connecting to Google Sheets is worth it. The setup takes only 2-3 minutes.</p><h3>How to connect two devices:</h3><ol><li><b>Master device:</b> Initialize the database by clicking <i>Initialize DB</i> to create your Google Sheets storage.</li><li><b>Second device:</b> Use the same Google Sheets link and click <i>Initialize DB</i>. It will detect the storage is already initialized and sync your data.</li></ol><p>After setup, syncing happens automatically and quickly, keeping your data up-to-date on all devices.</p><h3>What is synced automatically? (Without Google Sheets connection)</h3><ul><li>Bookmarked fics with appropriate tags</li><li>Bookmark notes - these are stored directly on AO3 servers</li></ul><p>Due to technical limitations, <b>fic highlighting</b> and <b>custom user notes</b> cannot be saved on AO3 and require external storage. Google Sheets provides a free, simple, and reliable way to store and sync this data across devices.</p><h3>What requires Google Sheets DB connection?</h3><ul><li>Highlighting sync</li><li>User notes sync</li></ul>",

                // [FORK: settings-layout] help text for AO3-style "?" links, shown in AO3's own modal
                helpTexts: {
                    highlight_priority: {
                        title: "Highlight priority",
                        text: "When a work has several tags, the tag with the highest priority controls its highlight.",
                    },
                    subscription_tag: {
                        title: "Link AO3 subscriptions to tag",
                        text: "Marking a work or series with this tag also subscribes you to it on AO3, and removing the tag unsubscribes you. Works already marked with this tag aren't subscribed until you mark them again.",
                    },
                    mark_for_later_tag: {
                        title: "Link AO3 Mark for Later to tag",
                        text: "Marking a work with this tag also adds it to your Marked for Later list on AO3, and removing the tag marks it as read. Works only, and AO3 reading history must be turned on. Works already marked with this tag aren't added until you mark them again.",
                    },
                    toggle_bookmarkNoteFormatting: {
                        title: "Prefill bookmark notes with work details",
                        text: "When you add a tag, fills the AO3 bookmark note with details like title, author, fandom and summary. Edit the layout under 'Bookmark note template'.",
                    },
                    toggle_hideEmptyNoteButtonOnListings: {
                        title: 'Hide the "Add Note" button on listings',
                        text: "Hides the button on search results, tag pages and bookmark lists. It still shows on work pages, and notes you've already written always display.",
                    },
                    toggle_enableMarkAsReadButton: {
                        title: 'Show "Mark Chapter" button',
                        text: "On chapter pages, saves 'Last Read: Ch. X' to the top of your note.",
                    },
                    sheet_url: {
                        title: "Google Script URL",
                        text: "Locked once connected. Use 'Reset Sync Settings' to change it.",
                    },
                    toggle_collapsable: {
                        title: "Collapse works with this tag",
                        text: "Works with this tag are collapsed on listings. Hover over one to expand it.",
                    },
                    toggle_deleteEmptyBookmarks: {
                        title: "Delete bookmarks left empty after removing a tag",
                        text: "When removing a tag leaves a bookmark with no notes, tags or collections, the bookmark is deleted.",
                    },
                    toggle_collapseAndHideOnBookmarks: {
                        title: "Collapse and hide works here too",
                        text: "Apply your tags' collapse and hide settings on your own bookmarks page too. When off, all your bookmarks stay visible and expanded there.",
                    },
                    toggle_displayOnPageSorting: {
                        title: "Show on-page sort controls",
                        text: "Sorts only the works loaded on the current page, not across pages.",
                    },
                    toggle_displayMyNotesBtn: {
                        title: 'Show "My Notes" in the navigation bar',
                        text: "Adds a 'My Notes' button to the navigation bar to browse and search all your notes.",
                    },
                    export_status_config: {
                        title: "Include tag settings in exports",
                        text: "Adds your tag settings (colors, labels, links) to the export file. Useful for setting up another device. Turn off to export only your lists, notes and kudos.",
                    },
                    sync_widget: {
                        title: "Show sync status widget",
                        text: "Shows a floating sync status indicator with a countdown and a manual sync button.",
                    },
                },

                // [FORK: settings-collapse]
                isOpen(key) {
                    return Boolean(this.openSections[key]);
                },

                toggleSection(key) {
                    this.openSections[key] = !this.openSections[key];
                    saveOpenSections(this.openSections);
                },

                setAllSections(open) {
                    SETTINGS_SECTIONS.forEach(key => {
                        this.openSections[key] = open;
                    });
                    saveOpenSections(this.openSections);
                },

                showHelp(key) {
                    const help = this.helpTexts[key];
                    if (help) displayModal(help.title, "<p>" + escapeHTML(help.text) + "</p>");
                },

                // Loading states for different sync feature ops
                loadingStates: {
                    testConnection: false,
                    sync: false,
                    initialize: false,
                },

                // Computed
                get currentSettings() {
                    return this.ficTrackerSettings.statuses[this.selectedStatus];
                },

                // [FORK: ao3-links] each native AO3 action links to at most one tag.
                // Disabled tags are skipped at runtime too (getLinkedStatusKey)
                linkedTagKey(flag) {
                    return this.ficTrackerSettings.statuses.find(s => s[flag] && s.enabled)?.storageKey || "";
                },

                setLinkedTag(flag, storageKey) {
                    this.ficTrackerSettings.statuses.forEach(s => {
                        s[flag] = s.storageKey === storageKey;
                    });
                },

                get canDeleteSelected() {
                    // Prevent deleting built-ins
                    const builtInKeys = ["FT_finished", "FT_favorites", "FT_subscribed", "FT_toread", "FT_disliked"];
                    return !builtInKeys.includes(this.ficTrackerSettings.statuses[this.selectedStatus].storageKey);
                },

                get previewStyle() {
                    const s = this.currentSettings;
                    const borderSize = s.borderSize ?? 0;
                    const hasBorder = borderSize > 0;
                    const bOpacity = Math.round(s?.borderOpacity ?? 255).toString(16);

                    return {
                        height: "50px",
                        border: hasBorder ? `${s.borderSize}px solid ${s.highlightColor + bOpacity}` : "none",
                        boxShadow: hasBorder
                            ? `0 0 10px ${s.highlightColor + bOpacity}, 0 0 20px ${s.highlightColor + bOpacity}`
                            : "none",
                        opacity: s.opacity,
                    };
                },

                get bookmarkNoteFormattingPreview() {
                    const PLACEHOLDERS = {
                        "{AUTHOR}": '<a href="#">SampleAuthor</a>',
                        "{TITLE}": '<a href="#">Work Title</a>',
                        "{FANDOM}": '<a href="#">Fandom You\'re Obsessed With</a>',
                        "{PAIRING_TAGS}": '<a href="#">Character A/Character B</a>',
                        "{CHARACTER_TAGS}": '<li><a href="#">Character A</a></li><li><a href="#">Character B</a></li>',
                        "{ADDITIONAL_TAGS}": '<li><a href="#">Slow Burn</a></li><li><a href="#">Romance</a></li>',
                        "{SUMMARY}": "They hate each other. Except they don't. This is everyone's problem now.",
                        "{SERIES}": 'Part # of the <a href="#">series that should have been one-shot</a>',
                        "{WORK_ID}": "1234567",
                        "{SERIES_SUMMARY}": "This is series summary",
                    };

                    const text = this.ficTrackerSettings.bookmarkNoteTemplate;
                    if (!text) return '<em style="opacity:0.5">Start typing to see preview…</em>';

                    let out = text;
                    for (const [placeholder, value] of Object.entries(PLACEHOLDERS)) {
                        out = out.replaceAll(placeholder, value);
                    }
                    return out;
                },

                get lastSyncTimeFormatted() {
                    if (!this.lastSyncTime) return "Never";

                    const ts = parseInt(this.lastSyncTime);
                    const date = isNaN(ts) ? null : new Date(ts);

                    return date ? date.toLocaleString() : "Never";
                },

                // Core Methods
                exportData: this.exportSettings.bind(this),
                importData: this.importSettings.bind(this),
                initRemoteSyncManager: this.initRemoteSyncManager.bind(this),

                // Conditionally add sync method only if remote sync manager is initialized
                performSync: async () => {
                    if (this.remoteSyncManager) {
                        const ok = await this.remoteSyncManager.performSync();
                        if (!ok) {
                            throw new Error(this.remoteSyncManager.lastSyncError || "Unknown error");
                        }
                        return ok;
                    } else {
                        console.warn("Sync is not available - sync manager not initialized");
                        throw new Error("Sync is not available");
                    }
                },

                // Pass func through global scope
                displayModal: displayModal,

                // Status CRUD
                moveStatus(index, direction) {
                    const statuses = this.ficTrackerSettings.statuses;
                    const selectedObject = statuses[this.selectedStatus];
                    const newIndex = index + direction;

                    if (newIndex < 0 || newIndex >= statuses.length) return;

                    const [movedStatus] = statuses.splice(index, 1);
                    statuses.splice(newIndex, 0, movedStatus);

                    // Wait until Vue updates the DOM and reactivity system after the reorder,
                    // then recalculate the selected index to keep the correct status selected.
                    this.$nextTick(() => {
                        this.selectedStatus = statuses.indexOf(selectedObject);
                    });
                },

                addStatus() {
                    const baseKey = "FT_custom_" + Date.now();
                    const newStatus = {
                        tag: "New Tag",
                        dropdownLabel: "My New Tag Fanfics",
                        positiveLabel: "➕ Add Tag",
                        negativeLabel: "🧹 Remove Tag",
                        selector: baseKey + "_btn",
                        storageKey: baseKey,
                        enabled: true,
                        collapse: false,
                        displayInDropdown: true,
                        highlightColor: "#888888",
                        borderSize: 2,
                        opacity: 1,
                        borderOpacity: 255,
                        hide: false,
                        highlightPriority: 1,
                        dropdownSort: "created_at", // [FORK: dropdown-sort]
                    };
                    this.ficTrackerSettings.statuses.push(newStatus);
                    this.selectedStatus = this.ficTrackerSettings.statuses.length - 1;
                },

                deleteStatus() {
                    if (!this.canDeleteSelected) return;
                    const status = this.ficTrackerSettings.statuses[this.selectedStatus];
                    const confirmMsg = `Delete tag "${status.tag}" and its highlighting settings?\nThis will not remove any AO3 bookmarks or tags.`;
                    if (!confirm(confirmMsg)) return;

                    // Remove local storage lists for this custom tag if we used any
                    // We only stored lists under storageKey. Clean it.
                    try {
                        localStorage.removeItem(status.storageKey);
                    } catch (e) {}

                    // Remove from list and clamp selected index
                    this.ficTrackerSettings.statuses.splice(this.selectedStatus, 1);
                    this.selectedStatus = Math.max(
                        0,
                        Math.min(this.selectedStatus, this.ficTrackerSettings.statuses.length - 1),
                    );

                    this.saveSettings();
                },

                saveSettings() {
                    localStorage.setItem("FT_settings", JSON.stringify(this.ficTrackerSettings));
                    localStorage.setItem("FT_statusesConfig", JSON.stringify(this.ficTrackerSettings.statuses || []));
                    DEBUG && console.log("[FicTracker] Settings saved.");
                },

                resetSettings() {
                    const confirmed = confirm(
                        "Are you sure you want to reset all settings to default? This will delete all saved settings.",
                    );
                    if (confirmed) {
                        localStorage.removeItem("FT_settings");
                        alert("Settings have been reset to default.");
                    }
                },

                // Reset all seting related to cloud data sync
                resetSyncSettings() {
                    const confirmed = window.confirm(
                        "This will disable the current database connection.\n\n" +
                            "You can still connect again later using a different link.\n\n" +
                            "Do you want to proceed?",
                    );

                    if (!confirmed) return;

                    this.ficTrackerSettings.sheetUrl = "";
                    this.ficTrackerSettings.syncDBInitialized = false;
                    this.ficTrackerSettings.syncEnabled = false;
                    localStorage.removeItem("FT_lastSync");
                    localStorage.removeItem("FT_lastSyncFailed");
                    // [FIX: sheet-init] also clear these so reconnecting doesn't reuse stale state
                    localStorage.removeItem("FT_pendingChanges");
                    localStorage.removeItem("FT_lastSyncedStatusesConfig");
                    this.saveSettings();

                    // Clear any existing status messages
                    this.sheetConnectionStatus = {};
                    this.syncFeedback = {};
                },

                // New: Google Sheet Sync logic
                async syncNow() {
                    DEBUG && console.log("[FicTracker] Manual sync initiated...");

                    // Indicate that a sync operation is in progress (for UI/loading indicators)
                    this.loadingStates.sync = true;
                    // Clear previous sync feedback and connection status indicators
                    this.syncFeedback = {};
                    this.sheetConnectionStatus = {};

                    try {
                        // [FIX: sheet-init] save in-panel edits before syncing, instead of syncing stale data
                        this.saveSettings();

                        // Attempt to perform the sync and update the last successful sync timestamp
                        await this.performSync();
                        this.updateLastSyncTime();

                        // Set success feedback message to inform the user
                        this.syncFeedback = {
                            success: true,
                            message: "Sync completed successfully!",
                        };

                        // Auto-clear success message after 5 seconds
                        setTimeout(() => {
                            if (this.syncFeedback && this.syncFeedback.success) {
                                this.syncFeedback = {};
                            }
                        }, 5000);

                        // Handle and log sync errors, provide user-facing error message
                    } catch (error) {
                        DEBUG && console.error("[FicTracker] Sync failed:", error);
                        this.syncFeedback = {
                            success: false,
                            message: `Sync failed: ${error.message}`,
                        };

                        // Ensure loading state is reset whether sync succeeds or fails
                    } finally {
                        this.loadingStates.sync = false;
                    }
                },

                updateLastSyncTime() {
                    // Retrieve the last sync timestamp from local storage and update internal state
                    const ts = localStorage.getItem("FT_lastSync");
                    this.lastSyncTime = ts;
                },

                // Tests connectivity to the provided Google Sheets URL by sending a ping request.
                // Updates the UI with the result and saves settings if successful.
                testSheetConnection() {
                    const url = this.ficTrackerSettings.sheetUrl;
                    DEBUG && console.log("[FicTracker] Testing connection to Google Sheets URL:", url);

                    // Validate if the Google Sheets URL is provided
                    if (!url) {
                        // Indicate that a test connection is in progress and reset status messages
                        this.sheetConnectionStatus = {
                            success: false,
                            message: "URL is empty",
                        };
                        return;
                    }

                    this.loadingStates.testConnection = true;
                    this.sheetConnectionStatus = {};
                    this.syncFeedback = {};

                    // Send a ping request to the Google Sheets endpoint to verify connection
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: `${url}?action=ping`,
                        onload: response => {
                            this.loadingStates.testConnection = false;

                            try {
                                // Parse the response and update connection status based on server reply
                                const data = JSON.parse(response.responseText);
                                if (data.status === "success") {
                                    DEBUG && console.log("[FicTracker] Sheet connection successful:", data);

                                    // If connection is successful, save settings and display a confirmation message
                                    this.sheetConnectionStatus = {
                                        success: true,
                                        message: data.data || "Connection successful!",
                                    };

                                    this.readyToInitDB = true;
                                    this.saveSettings();

                                    // Auto-clear success message after 5 seconds
                                    setTimeout(() => {
                                        if (this.sheetConnectionStatus && this.sheetConnectionStatus.success) {
                                            this.sheetConnectionStatus = {};
                                        }
                                    }, 5000);
                                } else {
                                    DEBUG && console.warn("[FicTracker] Sheet connection failed:", data);

                                    // Handle and display error message if the server returned a failure status
                                    this.sheetConnectionStatus = {
                                        success: false,
                                        message: data.message || "Unknown error",
                                    };
                                }

                                // Catch JSON parsing errors and report invalid server response
                            } catch (e) {
                                DEBUG &&
                                    console.error(
                                        "[FicTracker] Failed to parse server response during test connection:",
                                        response.responseText,
                                    );

                                this.sheetConnectionStatus = {
                                    success: false,
                                    message: "Invalid response from server",
                                };
                            }
                        },
                        // Handle connection-level errors like CORS or unreachable URL
                        onerror: err => {
                            DEBUG && console.error("[FicTracker] Network error during sheet connection test:", err);

                            this.loadingStates.testConnection = false;
                            this.sheetConnectionStatus = {
                                success: false,
                                message: "Network error - check your connection",
                            };
                        },
                    });
                },

                // Initializes Google Sheets storage by uploading current local FicTracker data.
                // Marks DB as initialized and updates sync timestamp on success.
                // [FIX: sheet-init] non-destructive init — probes for existing remote data first,
                // guards against overwriting it from an empty browser, and syncs config keys too
                initializeSheetStorage() {
                    const url = this.ficTrackerSettings.sheetUrl;
                    // Validate that the Google Sheets URL is set
                    if (!url) {
                        this.sheetConnectionStatus = {
                            success: false,
                            message: "URL is empty",
                        };
                        return;
                    }

                    // Set loading state and clear any previous status or feedback
                    this.loadingStates.initialize = true;
                    this.sheetConnectionStatus = {};
                    this.syncFeedback = {};

                    const STATUS_CONFIG_KEY = "FT_statusesConfig";
                    const syncedKeys = this.ficTrackerSettings.statuses.map(s => s.storageKey);
                    syncedKeys.push(STATUS_CONFIG_KEY);
                    syncedKeys.push(this.ficTrackerSettings.kudosStorageKey);

                    const hasMeaningfulLocalData = () => {
                        let hasStatusData = false;
                        for (const key of syncedKeys) {
                            if ((localStorage.getItem(key) || "").trim().length > 0) {
                                hasStatusData = true;
                                break;
                            }
                        }

                        let hasNotes = false;
                        try {
                            const notesObj = JSON.parse(localStorage.getItem("FT_userNotes") || "{}");
                            hasNotes = Object.keys(notesObj).length > 0;
                        } catch (e) {
                            hasNotes = false;
                        }

                        return hasStatusData || hasNotes;
                    };

                    const updateLocalFromServer = responseData => {
                        const statusData = responseData?.status_data || {};

                        let configApplied = false;
                        if (Object.prototype.hasOwnProperty.call(statusData, STATUS_CONFIG_KEY)) {
                            try {
                                const parsedStatuses = JSON.parse(statusData[STATUS_CONFIG_KEY] || "[]");
                                const validStatuses = Array.isArray(parsedStatuses)
                                    ? parsedStatuses.filter(
                                          s => s && typeof s.storageKey === "string" && typeof s.tag === "string",
                                      )
                                    : [];

                                if (validStatuses.length > 0) {
                                    const existingByStorageKey = new Map(
                                        (this.ficTrackerSettings.statuses || []).map(status => [
                                            status.storageKey,
                                            status,
                                        ]),
                                    );
                                    const syncedStatuses = validStatuses.map(status => {
                                        const existing = existingByStorageKey.get(status.storageKey) || {};
                                        return { ...existing, ...status };
                                    });

                                    this.ficTrackerSettings.statuses = syncedStatuses;
                                    settings.statuses = syncedStatuses;
                                    localStorage.setItem("FT_settings", JSON.stringify(this.ficTrackerSettings));
                                    localStorage.setItem(STATUS_CONFIG_KEY, JSON.stringify(syncedStatuses));
                                    DEBUG &&
                                        console.log(
                                            "[FicTracker] Initialize pull applied remote status config. Replaced statuses count:",
                                            syncedStatuses.length,
                                        );
                                    configApplied = true;
                                }
                            } catch (e) {
                                DEBUG &&
                                    console.warn(
                                        "[FicTracker] Failed to apply status config from remote initialize pull:",
                                        e,
                                    );
                            }
                        }

                        if (!configApplied) {
                            const inferredStatuses = inferStatusesFromStatusData(
                                statusData,
                                this.ficTrackerSettings.statuses,
                            );
                            if (inferredStatuses.length > 0) {
                                const mergedStatuses = mergeStatusesByStorageKey(
                                    this.ficTrackerSettings.statuses,
                                    inferredStatuses,
                                );
                                this.ficTrackerSettings.statuses = mergedStatuses;
                                settings.statuses = mergedStatuses;
                                localStorage.setItem("FT_settings", JSON.stringify(this.ficTrackerSettings));
                                localStorage.setItem(STATUS_CONFIG_KEY, JSON.stringify(mergedStatuses));
                                DEBUG &&
                                    console.log(
                                        "[FicTracker] Inferred status config from server keys during init:",
                                        inferredStatuses.map(s => s.storageKey),
                                    );
                            }
                        }

                        const effectiveSyncedKeys = this.ficTrackerSettings.statuses.map(s => s.storageKey);
                        effectiveSyncedKeys.push(STATUS_CONFIG_KEY);
                        effectiveSyncedKeys.push(this.ficTrackerSettings.kudosStorageKey);

                        for (const key of effectiveSyncedKeys) {
                            if (Object.prototype.hasOwnProperty.call(statusData, key)) {
                                localStorage.setItem(key, statusData[key] || "");
                            }
                        }

                        if (responseData && Object.prototype.hasOwnProperty.call(responseData, "notes")) {
                            localStorage.setItem("FT_userNotes", JSON.stringify(responseData.notes || {}));
                        }
                    };

                    const completeInitialization = message => {
                        this.sheetConnectionStatus = {
                            success: true,
                            message: message || "Google Sheet initialized successfully!",
                        };
                        this.ficTrackerSettings.syncDBInitialized = true;

                        if (this.ficTrackerSettings.syncEnabled && !this.remoteSyncManager) {
                            this.initRemoteSyncManager();
                        }

                        localStorage.setItem("FT_lastSync", Date.now().toString());
                        this.saveSettings();
                        this.updateLastSyncTime();

                        setTimeout(() => {
                            if (this.sheetConnectionStatus && this.sheetConnectionStatus.success) {
                                this.sheetConnectionStatus = {};
                            }
                        }, 7000);
                    };

                    // remoteVerifiedEmpty: the probe confirmed the sheet holds no data, so
                    // initializing from an empty browser can't overwrite anything
                    const sendInitializeRequest = (remoteVerifiedEmpty = false) => {
                        // Safety guard: don't initialize from an empty browser if we couldn't verify remote DB state.
                        if (!remoteVerifiedEmpty && !hasMeaningfulLocalData()) {
                            this.loadingStates.initialize = false;
                            this.sheetConnectionStatus = {
                                success: false,
                                message:
                                    "Initialization canceled to prevent overwrite. This browser has no local data yet; use Sync Now to pull existing data first.",
                            };
                            return;
                        }

                        // Gather current local storage data to be uploaded to Google Sheets
                        const UI_CONFIG_KEY = "FT_uiConfig";
                        const initData = {
                            FT_userNotes: JSON.stringify(JSON.parse(localStorage.getItem("FT_userNotes") || "{}")),
                            [STATUS_CONFIG_KEY]:
                                localStorage.getItem(STATUS_CONFIG_KEY) ||
                                JSON.stringify(this.ficTrackerSettings.statuses || []),
                            [UI_CONFIG_KEY]:
                                localStorage.getItem(UI_CONFIG_KEY) ||
                                JSON.stringify({
                                    changeStatusLabel: this.ficTrackerSettings.changeStatusLabel || "✿ Change Status ▼",
                                }),
                            [this.ficTrackerSettings.kudosStorageKey]:
                                localStorage.getItem(this.ficTrackerSettings.kudosStorageKey) || "",
                        };
                        try {
                            const allStatuses = this.ficTrackerSettings.statuses;
                            for (const s of allStatuses) {
                                initData[s.storageKey] = localStorage.getItem(s.storageKey) || "";
                            }
                        } catch (e) {
                            DEBUG && console.warn("[FicTracker] Failed to build initData for dynamic statuses:", e);
                        }

                        DEBUG && console.log("[FicTracker] Initializing Google Sheets with data:", initData);

                        // Send initialization request to Google Sheets endpoint
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: url,
                            headers: {
                                "Content-Type": "application/json",
                            },
                            data: JSON.stringify({
                                action: "initialize",
                                initData,
                            }),
                            onload: response => {
                                this.loadingStates.initialize = false;

                                try {
                                    // Parse and handle successful initialization response
                                    const data = JSON.parse(response.responseText);
                                    DEBUG && console.log("[FicTracker] DB Initialization response data:", data);

                                    if (data.status === "success") {
                                        completeInitialization(
                                            data.data?.message || "Google Sheet initialized successfully!",
                                        );
                                    } else {
                                        // Handle error response from server
                                        this.sheetConnectionStatus = {
                                            success: false,
                                            message: data.message || "Initialization failed",
                                        };
                                    }
                                    // Catch JSON parsing errors and log them
                                } catch (e) {
                                    DEBUG &&
                                        console.error(
                                            "[FicTracker] Invalid JSON response during initialization:",
                                            response.responseText,
                                        );

                                    this.sheetConnectionStatus = {
                                        success: false,
                                        message: "Invalid response from server",
                                    };
                                }
                            },
                            // Handle connection errors like timeouts or offline state
                            onerror: err => {
                                DEBUG && console.error("[FicTracker] Network error during initialization:", err);

                                this.loadingStates.initialize = false;
                                this.sheetConnectionStatus = {
                                    success: false,
                                    message: "Network error - check your connection",
                                };
                            },
                        });
                    };

                    // First try pulling existing remote data. If present, connect without re-initializing.
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: url,
                        headers: {
                            "Content-Type": "application/json",
                        },
                        data: JSON.stringify({
                            action: "sync",
                            queue: {
                                operations: [],
                                notes: [],
                            },
                        }),
                        onload: response => {
                            try {
                                const data = JSON.parse(response.responseText);
                                DEBUG && console.log("[FicTracker] Pre-initialize sync probe response:", data);

                                const probeSucceeded = data?.success === true || data?.status === "success";
                                // [FIX: sheet-init] a blank sheet still answers with empty status_data/notes,
                                // which used to count as "existing data": the real initialize never ran
                                // (sheet stayed "not connected"), local data was never uploaded, and local
                                // notes were replaced with the sheet's empty set
                                const hasRemoteData =
                                    Object.values(data?.status_data || {}).some(
                                        value => String(value ?? "").trim() !== "",
                                    ) || Object.keys(data?.notes || {}).length > 0;

                                if (probeSucceeded && hasRemoteData) {
                                    updateLocalFromServer(data);
                                    this.loadingStates.initialize = false;
                                    completeInitialization(
                                        "Connected to existing Google Sheet and pulled remote data.",
                                    );
                                } else {
                                    sendInitializeRequest(probeSucceeded);
                                }
                            } catch (e) {
                                DEBUG &&
                                    console.warn(
                                        "[FicTracker] Pre-initialize sync probe was not usable, falling back to initialize:",
                                        e,
                                    );
                                sendInitializeRequest();
                            }
                        },
                        onerror: err => {
                            DEBUG &&
                                console.warn(
                                    "[FicTracker] Pre-initialize sync probe failed, falling back to initialize:",
                                    err,
                                );
                            sendInitializeRequest();
                        },
                    });
                },

                // Lifecycle hook that sets up real-time countdown for next sync based on last sync timestamp.
                onMounted() {
                    // Function to calculate and update time remaining until next sync
                    const trackSyncTime = () => {
                        this.updateLastSyncTime();

                        const elapsed = Date.now() - parseInt(this.lastSyncTime);
                        const remaining = this.ficTrackerSettings.syncInterval - elapsed / 1000;
                        this.timeUntilSync = Math.max(0, Math.round(remaining));

                        // [FORK: settings-collapse] open the sync section once if the last sync failed, so the error isn't hidden
                        if (
                            !this.syncFailureShown &&
                            this.ficTrackerSettings.syncEnabled &&
                            this.ficTrackerSettings.syncDBInitialized &&
                            localStorage.getItem("FT_lastSyncFailed")
                        ) {
                            this.openSections.sync = true;
                            this.syncFailureShown = true;
                        }
                    };

                    // Initial update on component mount
                    trackSyncTime();
                    // Update the countdown every second
                    setInterval(() => {
                        trackSyncTime();
                    }, 1000);
                },
            }).mount();
        }

        // Exports user data (all statuses, notes, and statuses config) into a JSON file
        exportSettings() {
            // Formatted timestamp for export
            const exportTimestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
            const exportData = {
                FT_userNotes: localStorage.getItem("FT_userNotes"),
            };
            try {
                const allStatuses = this.settings.statuses;
                for (const s of allStatuses) {
                    exportData[s.storageKey] = localStorage.getItem(s.storageKey);
                }
            } catch (e) {
                DEBUG && console.warn("[FicTracker] Failed to collect dynamic status keys for export:", e);
            }

            // [FORK: kudos] kudos history isn't a status, so it needs its own entry
            const kudosKey = this.settings.kudosStorageKey || "FT_kudosGiven";
            exportData[kudosKey] = localStorage.getItem(kudosKey);

            // Only include status configuration if the setting is enabled
            if (this.settings.exportStatusesConfig) {
                exportData.FT_statusesConfig = JSON.stringify(this.settings.statuses);
            }

            // Create a Blob object from the export data, converting it to JSON format
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: "application/json",
            });

            // Generate a URL for the Blob object to enable downloading
            const url = URL.createObjectURL(blob);

            // Create a temp link to download the generated file data
            const a = document.createElement("a");
            a.href = url;
            a.download = `fictracker_export_${exportTimestamp}.json`;
            document.body.appendChild(a);

            // Trigger a click on the link to initiate the download
            a.click();

            // Cleanup after the download
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Update the last export timestamp
            this.settings.lastExportTimestamp = exportTimestamp;
            localStorage.setItem("FT_settings", JSON.stringify(this.settings));
            DEBUG && console.log("[FicTracker] Data exported at:", exportTimestamp);
        }

        // Imports user data (favorites, finished, toread) from a JSON file
        // Existing storage data is not removed, only new items from file are appended
        importSettings(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Warn user when Google Sheets sync is enabled to prevent imported data being overwritten
            if (this.settings && this.settings.syncEnabled) {
                const proceed = confirm(
                    "Google Sheets sync is currently ENABLED.\n\nIf you import now, the next sync may overwrite your imported data with what is currently stored in the Sheet.\n\nRecommended options:\n  1) Disable Google Sheets sync, import your file. Re-enabling with the same Sheet will overwrite your import.\n  2) OR: Temporarily Disable sync, import, then re-enable sync using a NEW Google Sheet URL to avoid pulling stale data.\n\nDo you still want to proceed with the import right now?",
                );

                if (!proceed) {
                    event.target.value = "";
                    return;
                }
            }

            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    this.mergeImportedData(importedData);
                    // Reset the file input to allow reimporting the same file
                    event.target.value = "";
                } catch (err) {
                    DEBUG && console.error("[FicTracker] Error importing data:", err);
                    alert("Error importing data. Please check if the file is valid.");
                }
            };
            reader.onerror = () => {
                DEBUG && console.error("[FicTracker] Error reading file:", reader.error);
                alert("Error reading file. Please try again.");
                event.target.value = "";
            };
            reader.readAsText(file);
        }

        mergeImportedData(importedData) {
            // First, if statuses config provided, load it so we know all dynamic keys
            if (importedData.FT_statusesConfig) {
                try {
                    const importedStatuses = JSON.parse(importedData.FT_statusesConfig);
                    this.settings.statuses = importedStatuses;
                    localStorage.setItem("FT_settings", JSON.stringify(this.settings));
                    localStorage.setItem("FT_statusesConfig", JSON.stringify(importedStatuses));
                } catch (err) {
                    DEBUG && console.error("[FicTracker] Error importing status configuration:", err);
                }
            }

            // Track new entries per known keys + notes at the end
            let newEntriesMap = {};

            // Merge all status list keys found in the file that are in our configured statuses
            const knownKeys = new Set((this.settings.statuses || []).map(s => s.storageKey));
            // [FORK: kudos] merge kudos history the same way as status lists
            const kudosKey = this.settings.kudosStorageKey || "FT_kudosGiven";
            knownKeys.add(kudosKey);
            Object.keys(importedData).forEach(key => {
                if (!knownKeys.has(key)) return;
                const currentData = localStorage.getItem(key) ? localStorage.getItem(key).split(",") : [];
                const newData = (importedData[key] || "").split(",").filter(Boolean);
                const initialLen = currentData.length;
                const mergedData = [...new Set([...currentData, ...newData])];
                newEntriesMap[key] = mergedData.length - initialLen;
                localStorage.setItem(key, mergedData.join(","));
            });

            // Handle user notes (JSON data)
            if (importedData.FT_userNotes) {
                try {
                    const currentNotes = JSON.parse(localStorage.getItem("FT_userNotes") || "{}");
                    const importedNotes = JSON.parse(importedData.FT_userNotes);

                    // Merge notes, keeping newer versions if there are conflicts
                    const mergedNotes = { ...currentNotes, ...importedNotes };
                    localStorage.setItem("FT_userNotes", JSON.stringify(mergedNotes));

                    const newNotesCount = Object.keys(importedNotes).length - Object.keys(currentNotes).length;
                    newEntriesMap["FT_userNotes"] = Math.max(0, newNotesCount);
                } catch (err) {
                    DEBUG && console.error("[FicTracker] Error merging user notes:", err);
                    newEntriesMap["FT_userNotes"] = 0;
                }
            }

            // Build a dynamic summary
            let summaryLines = [];
            (this.settings.statuses || []).forEach(s => {
                const count = newEntriesMap[s.storageKey] || 0;
                summaryLines.push(`${s.tag}: ${count}`);
            });
            const notesAdded = newEntriesMap["FT_userNotes"] || 0;
            summaryLines.push(`Notes: ${notesAdded}`);
            summaryLines.push(`Kudos: ${newEntriesMap[kudosKey] || 0}`);

            alert(`Data imported successfully!\n` + summaryLines.join("\n"));
            DEBUG && console.log("[FicTracker] Data imported successfully. Stats:", newEntriesMap);
        }
    }

    // Class for managing URL patterns and executing corresponding handlers based on the current path
    class URLHandler {
        constructor() {
            this.handlers = [];
        }

        // Add a new handler with associated patterns to the handlers array
        addHandler(patterns, handler) {
            this.handlers.push({
                patterns,
                handler,
            });
        }

        // Iterate through registered handlers to find a match for the current path
        matchAndHandle(currentPath) {
            for (const { patterns, handler } of this.handlers) {
                if (patterns.some(pattern => pattern.test(currentPath))) {
                    // Execute the corresponding handler if a match is found
                    handler();

                    DEBUG && console.log("[FicTracker] Matched pattern for path:", currentPath);
                    return true;
                }
            }
            DEBUG && console.log("[FicTracker] Unrecognized page", currentPath);
            return false;
        }
    }

    // Main controller that integrates all components of the AO3 FicTracker
    class FicTracker {
        constructor() {
            // Merge stored settings to match updated structure, assign default  settings on fresh installation
            this.mergeSettings();

            // Load settings and initialize other features
            this.settings = this.loadSettings();

            // Filter out disabled statuses
            // this.settings.statuses = this.settings.statuses.filter(status => status.enabled !== false);

            this.initStyles();
            // [FIX: dropdown-retry] original gave up if user menu wasn't in DOM yet; this retries
            this.setupReliableDropdownInjection();
            this.setupURLHandlers();
            // [FORK: kudos] keeps kudos state in sync across open tabs
            this.setupCrossTabKudosSync();
            // [FORK: update-notice]
            this.showUpdateNotice();

            // Only initialize storages on global scope if My Notes manager enabled
            if (settings.displayMyNotesButton) {
                this.storageManager = new StorageManager();
                if (settings.syncEnabled) {
                    this.remoteSyncManager = new RemoteStorageSyncManager();
                }
                this.userNotesManager = new CustomUserNotesManager(this.storageManager, this.remoteSyncManager);
                this.setupMyNotesButton();
            }
        }

        // [FORK: update-notice] AO3-style flash notice after an update; stays on every page until dismissed
        showUpdateNotice() {
            const version = GM_info.script.version;
            if (localStorage.getItem(UPDATE_NOTICE_SEEN_KEY) === version) return;

            const main = document.querySelector("#main");
            if (!main) return;

            const notice = document.createElement("div");
            notice.className = "flash notice";
            notice.innerHTML = `
                <button type="button" class="ft-update-notice-dismiss" aria-label="Dismiss" title="Dismiss"
                    style="float: right !important; background: none !important; border: 0 !important; box-shadow: none !important; padding: 0 0 0 1em !important; margin: 0 !important; font: inherit !important; color: inherit !important; line-height: inherit !important; cursor: pointer;">✕</button>
                ${UPDATE_NOTICE_MESSAGE}
            `;

            // Dismissing - or opening the changelog - marks this version as seen
            const dismiss = () => {
                localStorage.setItem(UPDATE_NOTICE_SEEN_KEY, version);
                notice.remove();
            };
            notice.querySelector(".ft-update-notice-dismiss").addEventListener("click", dismiss);
            notice.querySelectorAll("a").forEach(link => link.addEventListener("click", dismiss));

            main.prepend(notice);
        }

        setupReliableDropdownInjection() {
            let attempts = 0;
            const maxAttempts = 20;
            let retryTimer = null;
            let finished = false;

            const stop = () => {
                if (finished) return;
                finished = true;

                if (retryTimer) {
                    clearInterval(retryTimer);
                    retryTimer = null;
                }

                observer.disconnect();
                window.removeEventListener("pageshow", tryInject);
                document.removeEventListener("visibilitychange", handleVisibilityChange);
            };

            const tryInject = () => {
                if (finished) return;

                attempts++;
                const injected = this.addDropdownOptions();

                if (injected || attempts >= maxAttempts) {
                    stop();
                }
            };

            const handleVisibilityChange = () => {
                if (document.visibilityState === "visible") {
                    tryInject();
                }
            };

            const observer = new MutationObserver(() => {
                if (!finished && attempts < maxAttempts) {
                    tryInject();
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
            });

            retryTimer = setInterval(tryInject, 500);
            window.addEventListener("pageshow", tryInject);
            document.addEventListener("visibilitychange", handleVisibilityChange);

            tryInject();
        }

        // Method to merge settings / store the default ones
        mergeSettings() {
            // Check if settings already exist in localStorage
            let storedSettings = JSON.parse(localStorage.getItem("FT_settings"));

            if (!storedSettings) {
                // [FORK: ao3-links] fresh installs link Subscribed to AO3 subscriptions. Set here, not in
                // the defaults above: the version-bump merge below fills statuses by array position,
                // so a default flag would land on existing users' tags too
                const subscribedStatus = settings.statuses.find(s => s.storageKey === "FT_subscribed");
                if (subscribedStatus) subscribedStatus.linkAo3Subscription = true;

                // No settings found, save default settings
                localStorage.setItem("FT_settings", JSON.stringify(settings));
                console.log("[FicTracker] Default settings have been stored.");

                // [FORK: update-notice] new users have nothing to catch up on
                localStorage.setItem(UPDATE_NOTICE_SEEN_KEY, GM_info.script.version);
            } else {
                // Check if the version matches the current version from Tampermonkey metadata
                const currentVersion = GM_info.script.version;
                if (!storedSettings.version || storedSettings.version !== currentVersion) {
                    // [FORK: statuses] adds new default statuses (e.g. Subscribed) on version bump
                    if (storedSettings.statuses && settings.statuses) {
                        const existingStorageKeys = new Set(storedSettings.statuses.map(s => s.storageKey));
                        settings.statuses.forEach(defaultStatus => {
                            if (!existingStorageKeys.has(defaultStatus.storageKey)) {
                                // New status found in defaults, add it to stored settings
                                storedSettings.statuses.push(defaultStatus);
                                console.log(`[FicTracker] Added new status: ${defaultStatus.tag}`);
                            }
                        });
                    }

                    // If versions don't match, merge and update the version
                    storedSettings = _.defaultsDeep(storedSettings, settings);

                    // Update the version marker
                    storedSettings.version = currentVersion;

                    // Save the updated settings back to localStorage
                    localStorage.setItem("FT_settings", JSON.stringify(storedSettings));
                    console.log("[FicTracker] Settings have been merged and updated to the latest version.");
                } else {
                    console.log("[FicTracker] Settings are up to date, no merge needed.");
                }
            }
        }

        // Load settings from the storage or fallback to default ones
        loadSettings() {
            // Measure performance of loading settings from localStorage
            const startTime = performance.now();
            let savedSettings = localStorage.getItem("FT_settings");

            if (savedSettings) {
                try {
                    settings = JSON.parse(savedSettings);
                    localStorage.setItem("FT_statusesConfig", JSON.stringify(settings.statuses || []));
                    DEBUG = settings.debug;
                    DEBUG && console.log(`[FicTracker] Settings loaded successfully:`, savedSettings);
                } catch (error) {
                    DEBUG && console.error(`[FicTracker] Error parsing settings: ${error}`);
                }
            } else {
                DEBUG && console.warn(`[FicTracker] No saved settings found, using default settings.`);
            }

            const endTime = performance.now();
            DEBUG && console.log(`[FicTracker] Settings loaded in ${endTime - startTime} ms`);
            return settings;
        }

        // Initialize custom styles based on loaded settings
        initStyles() {
            // Dynamic styles generation for each status, this will allow adding custom statuses in the future updates
            const statusStyles = StyleManager.generateStatusStyles();
            const quickTagToggleStyles = StyleManager.generateQuickTagToggleStyles();

            StyleManager.addCustomStyles(`
                ${statusStyles}
                ${quickTagToggleStyles}

                li.FT_collapsable .landmark,
                li.FT_collapsable .tags,
                li.FT_collapsable .series,
                li.FT_collapsable h5.fandoms.heading,
                li.FT_collapsable .userstuff {
                    display: none;
                }

                /* Uncollapse on hover */
                li.FT_collapsable:hover .landmark,
                li.FT_collapsable:hover .tags,
                li.FT_collapsable:hover ul.series,
                li.FT_collapsable:hover h5.fandoms.heading,
                li.FT_collapsable:hover .userstuff {
                    display: block;
                }

                /* [FIX: dropdown-style] was clipping the Change Status dropdown menu */
                .bookmarks-index .bookmark.index {
                    overflow: visible !important;
                }

        `);
        }

        // Add new dropdown options for each status to the user menu
        addDropdownOptions() {
            const userMenu = document.querySelector("ul.menu.dropdown-menu");
            if (!userMenu) {
                DEBUG && console.warn("[FicTracker] User menu not found yet.");
                return false;
            }

            const profileLink =
                userMenu.previousElementSibling?.getAttribute("href") ||
                document.querySelector('#header a[href^="/users/"]')?.getAttribute("href") ||
                "";
            const username = profileLink.split("/").filter(Boolean).pop() || "";

            if (username) {
                // Remove previously added FicTracker dropdown links to prevent duplicates
                const existingLinks = userMenu.querySelectorAll("a[data-ft-dropdown]");
                existingLinks.forEach(link => link.parentElement.remove());

                // Track which tags have been added to avoid duplicates
                const addedTags = new Set();
                this.settings.statuses.forEach(status => {
                    if (status.displayInDropdown && !addedTags.has(status.tag)) {
                        // URLSearchParams encodes tags containing &, #, + etc. correctly
                        const params = new URLSearchParams({
                            "bookmark_search[other_bookmark_tag_names]": status.tag,
                            user_id: username,
                        });
                        // [FORK: dropdown-sort] AO3 defaults to Date Bookmarked (created_at)
                        if (status.dropdownSort && status.dropdownSort !== "created_at") {
                            params.set("bookmark_search[sort_column]", status.dropdownSort);
                        }
                        userMenu.insertAdjacentHTML(
                            "beforeend",
                            `<li><a href="https://archiveofourown.org/bookmarks?${params}" data-ft-dropdown="1">${status.dropdownLabel}</a></li>`,
                        );
                        addedTags.add(status.tag);
                    }
                });
                DEBUG && console.log("[FicTracker] Successfully added dropdown options!");
                return true;
            } else {
                DEBUG && console.warn("[FicTracker] Cannot parse the username yet.");
                return false;
            }
        }

        setupMyNotesButton() {
            const topBar = document.querySelector("ul.primary.navigation.actions");
            if (!topBar) return;

            const notesUI = `
                <li class="dropdown" aria-haspopup="true">
                    <a href="#" class="dropdown-toggle" data-toggle="dropdown" id="ft_my_notes">My Notes</a>
                </li>
            `;
            topBar.insertAdjacentHTML("beforeend", notesUI);

            const container = document.querySelector("div.content.userstuff");
            this.userNotesManager.setupNoteHandlers(container, false, true);

            document.querySelector("#ft_my_notes").addEventListener("click", () => {
                const sortedNotes = this.userNotesManager.getNotesSorted();
                const htmlNotesList = this.userNotesManager.getNotesHTML(sortedNotes);
                const notesModalHTML = this.userNotesManager.getMyNotesModalHTML(htmlNotesList);

                displayModal(`Total Notes: ${htmlNotesList.length}`, notesModalHTML);

                document.querySelector("#ft_notes_search").addEventListener("input", e => {
                    this.filterAndRenderNotesModal(e.target.value);
                });
            });
        }

        // Naive filtering, mb implement fuzzy later
        filterAndRenderNotesModal(searchQuery) {
            const filteredNotes = this.userNotesManager.filterNotes(searchQuery);
            const htmlNotesList = this.userNotesManager.getNotesHTML(filteredNotes);
            const container = document.querySelector("#ft_notesList");
            container.innerHTML = htmlNotesList.join("");
            //this.userNotesManager.setupNoteHandlers(container, false, true);
        }

        // Setup cross-tab kudos synchronization
        setupCrossTabKudosSync() {
            // Listen for localStorage changes from other tabs/windows
            window.addEventListener("storage", e => {
                // Only react to kudos storage changes
                if (e.key === settings.kudosStorageKey) {
                    const kudosButton = document.getElementById("kudo_submit");
                    const workIdInput = document.getElementById("kudo_commentable_id");

                    // If we're on a work page with a kudos button
                    if (kudosButton && workIdInput) {
                        const workId = workIdInput.value;
                        const kudosGiven = e.newValue ? e.newValue.split(",").filter(id => id) : [];

                        // Hide button if kudos was given in another tab
                        if (kudosGiven.includes(workId)) {
                            kudosButton.style.display = "none";
                            DEBUG && console.info("[FicTracker] Kudos button hidden due to cross-tab update");
                        }
                    }
                }
            });
        }

        // Setup URL handlers for different pages
        setupURLHandlers() {
            const urlHandler = new URLHandler();

            // Handler for fanfic pages (chapters, entire work, one shot)
            urlHandler.addHandler(
                [
                    /\/works\/.*(?:chapters|view_full_work)/,
                    /works\/\d+(#\w+-?\w*)?(\?.*)?$/,
                    /\/chapters\/\d+\?show_comments/,
                ],
                () => {
                    const bookmarkManager = new BookmarkManager("https://archiveofourown.org/");
                },
            );

            // Handler for fanfics search/tag list pages & other pages that include a list of fics
            urlHandler.addHandler(
                [
                    /\/works\/search/,
                    /\/works\?.*/,
                    /\/bookmarks$/,
                    /\/bookmarks\/\d+$/,
                    /\/users\/bookmarks/,
                    /\/users\/.*\/works/,
                    /\/users\/[^/]+\/pseuds\/[^/]+/,
                    /\/bookmarks\?page=/,
                    /\/bookmarks\?bookmark_search/,
                    /\/bookmarks\?commit=Sort\+and\+Filter&bookmark_search/,
                    /\/series\/.+/,
                    /\/collections\/.+/,
                    /\/works\?commit=Sort/,
                    /\/works\?work_search/,
                    /\/tags\/.*\/works/,
                    /\/users\/[^/]+(\/dashboard)?(\?.*)?$/, // [FORK: url-routes] dashboard page
                    /\/users\/.*\/readings/,
                ],
                () => {
                    const worksListHandler = new WorksListHandler();
                },
            );

            // Handler for user preferences page
            urlHandler.addHandler([/\/users\/.+\/preferences/], () => {
                const settingsPage = new SettingsPageHandler(this.settings);
            });

            // Execute handler based on the current URL
            const currentPath = window.location.href;
            urlHandler.matchAndHandle(currentPath);
        }
    }

    // Instantiate the FicTracker class
    const ficTracker = new FicTracker();
})();
