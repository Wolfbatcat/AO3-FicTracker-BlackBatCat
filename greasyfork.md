# AO3 FicTracker - BlackBatCat's Version

![Coded with GitHub Copilot](https://vibecoded.fyi/badges/flat/agents/github-copilot.svg)

Track, tag and highlight fics on AO3, with personal notes and sync across devices. This is a fork of [infiniMotis's AO3 FicTracker](https://greasyfork.org/en/scripts/513435-ao3-fictracker) with my own changes and new features.

---

## ✨ What FicTracker Does

- **Mark fics with a status** (Reading, Subscribed, To Read, Dropped, Finished Reading), or create your own tags.
- **Change a status from anywhere** – buttons on the work page, or the **Change Status** menu on search results and listings.
- **Spot tracked fics at a glance** – they're highlighted, dimmed, collapsed or hidden, however you set them up.
- **Write personal notes** on any fic.
- **Jump to your lists** from links in your AO3 user menu.
- **Keep your data safe** – statuses are saved as AO3 bookmarks, and optional Google Sheets sync keeps highlighting and notes in step across devices.

---

## 📋 Getting Started

All settings are at the bottom of your Preferences page (`User -> My Preferences`).

To sync across devices, follow the **Google Sheets Setup Guide** on the [original FicTracker page](https://greasyfork.org/en/scripts/513435-ao3-fictracker).

> **🚨 Important:** Change statuses with FicTracker's buttons and menu only. Changes made through AO3's **Edit Bookmark** form aren't picked up, so highlighting and hiding won't match.

---

## 🔄 Changes from the Original

- **📖 Chapter tracking** – A **Mark Chapter** button on chapter pages saves `Last Read: Ch. X` to the top of your note for that fic.
- **🔔 Improved Subscribe and Mark for Later buttons** – Marking a work as **Subscribed** bookmarks it _and_ subscribes you to it; removing the tag unsubscribes you. Mark for Later can work the same way (needs AO3 reading history turned on). Choose the tags under **Buttons & Menus**.
- **⭐ Kudos button hiding** – Once you leave kudos, the kudos button disappears on every chapter of that work, on all your devices. Picks up your history from my [No Re-Kudos script](https://greasyfork.org/en/scripts/551623-ao3-no-re-kudos) automatically.
- **📚 Series support** – Change a series' status from the series page or your bookmarks. Series bookmarks get a `Series` tag so they're easy to find.
- **🏷️ Renamed statuses** – Favorite is now **Reading**, Disliked is now **Dropped** (hidden by default), a new **Subscribed** status is added, and Finished Reading moves to the end.
- **🔄 More reliable sync** – Custom tags and their colors sync across devices, **Sync Now** tells you when a sync fails, and backups now include your kudos history.
- **🎨 Matches your site skin** – The Change Status menu and note boxes blend into whatever skin you use, with a Rosé Pine–inspired default color scheme.
- **🗂️ Sorted bookmark shortcuts** – Choose whether each list opens sorted by date bookmarked, date updated or word count.
- **⚙️ Different defaults** – AO3's Subscribe and Mark for Later buttons are hidden, and the My Notes button and on-page sorting start off. All can be changed in Preferences.
- **🛠️ Tidier settings page** – Settings are grouped into collapsible sections. Click the section heading to collapse/expand.

---

## 📜 Full Changelog

This fork rebases onto upstream releases as they ship, plus its own fixes in between. See the [CHANGELOG](https://github.com/Wolfbatcat/AO3-FicTracker-BlackBatCat/blob/main/CHANGELOG.md) for the full version history.

---

## 🙌 Credits

My heartiest thanks to farin for the life-changing FicTracker script. [Send them a tip](https://ko-fi.com/infinimotis)!
