# AO3 FicTracker

A userscript that enhances your Archive of Our Own (AO3) reading experience by adding powerful tracking features. Track your favorite, finished, to-read, and disliked fanfics with sync across devices.

## ⚠️ BlackBatCat's Custom Version

This is a customized fork of [infiniMotis's AO3 FicTracker](https://github.com/infiniMotis/AO3-FicTracker) with my personalized modifications. See [Changes from Original](#changes-from-original) below for details.

> **Note:** This version does not auto-update from Greasy Fork. To use the official version with auto-updates, install from the [original repository](https://greasyfork.org/en/scripts/513435-ao3-fictracker).

## Changes from Original

This custom version includes the following modifications from the [original AO3 FicTracker](https://github.com/infiniMotis/AO3-FicTracker):

### 📚 Renamed Status Categories
Status categories have been renamed and reordered to better fit reading workflow:
- **"Favorite"** → **"Reading"** 
  - Label: "My Current Fanfics"
  - Color: Rose pink (`#eb6f92`)
- **New: "Subscribed"** status added
  - Label: "My Subscribed Fics"  
  - Color: Coral (`#ea9a97`)
- **"Disliked Work"** → **"Dropped"**
  - Hidden from view by default
  - No longer shown in dropdown menu
- **"Finished Reading"** 
  - Moved to end of list

### 🎨 Visual Theme
- Custom color scheme inspired by Rose Pine theme
- Border radius changed from `8px` to `0.75em` to match [site skin](https://archiveofourown.org/works/69993411)

### 📖 Chapter Tracking Feature
New feature to help track reading progress in multi-chapter works:
- **"Mark Current Chapter" button** appears on chapter pages
- Automatically prepends `Last Read: Ch. X` to your custom note for that fic
- Updates the chapter number each time you click it

### ⭐ Kudos Button Hiding (Cloud Sync)
New feature: When you give kudos to a work, AO3 FicTracker will automatically hide the kudos button on all chapters and work pages for that fic.
- This status is tracked and synced across all devices using the Google Sheets Cloud Storage integration.

### ⚙️ Changed Default Settings
Different defaults matching my own preferences:
- **My Notes Button**: Disabled by default (`displayMyNotesButton: false`)
- **On-Page Sorting**: Disabled by default (`displayOnPageSorting: false`)
- **Hide Default Subscribe Button**: New setting, enabled by default (`hideDefaultSubscribeBtn: true`)
- **Mark as Read Button**: New setting, enabled by default (`enableMarkAsReadButton: true`)

### 🐛 Bug Fixes
- Fixed case-sensitive tag comparison bug that prevented removing tags from dropdown menus when AO3 normalized tag casing
- Fixed issue where blurbs would not inherit original box shadow and border properties when Border Size set to 0




