// Subtle Outline: the script half of the theme (loaded by Marketplace via
// "include" in manifest.json). Spicetify themes are CSS only, so everything
// that needs code lives here: the top bar layout, the paintbrush button and
// its live settings panel.
//
// Layout (always on):
//  - Top bar buttons regrouped into three boxes: left = back, forward, Home;
//    middle = search (full width); right = theme settings, Browse,
//    Marketplace, What's New, Listening activity, profile. Spotify's own
//    buttons stay where React puts them in the page (moving them would upset
//    Spotify's React code); CSS anchor positioning draws them inside space
//    reserved in their new box.
//  - Room for the window buttons: on the left (Mac) or top right (Windows).
//
// Everything else is a setting, applied live by toggling classes and CSS
// variables on <html>, and saved in Spotify's local storage.
(function subtleOutline() {
  const STORAGE_KEY = "subtleOutline:settings";
  const LIKED_HEADER = "#3b3b41"; // grey for the Liked Songs page header

  // Spicetify's built-in colours, used for anything a scheme doesn't set
  const SPICE_DEFAULTS = {
    "text": "#ffffff", "subtext": "#b3b3b3", "main": "#121212", "main-elevated": "#242424",
    "highlight": "#1a1a1a", "highlight-elevated": "#2a2a2a", "sidebar": "#000000",
    "player": "#181818", "card": "#282828", "shadow": "#000000", "selected-row": "#ffffff",
    "button": "#1db954", "button-active": "#1ed760", "button-disabled": "#535353",
    "tab-active": "#333333", "notification": "#4687d6", "notification-error": "#e22134",
    "misc": "#7f7f7f",
  };
  // The colour schemes from color.ini (keep the two in sync), so they can be
  // switched from the settings panel as well as from Marketplace.
  const SCHEMES = {
    "Subtle": { "misc": "#2a2930", "main": "#0f0f11", "sidebar": "#18171b" },
    "Natural": {},
    "Droid": { "button-active": "#b46450", "button": "#b46450", "misc": "#b46450", "main": "#101012", "sidebar": "#1c1a1e" },
    "Midnight": { "main": "#0a0d13", "sidebar": "#0e1219", "misc": "#1e2633", "main-elevated": "#151b26", "highlight": "#141a24", "highlight-elevated": "#1c2431", "card": "#151b26", "tab-active": "#1e2633", "subtext": "#9aa4b5", "button": "#5b8def", "button-active": "#6f9cf5" },
    "Forest": { "main": "#0b100d", "sidebar": "#101612", "misc": "#1f2a23", "main-elevated": "#151d18", "highlight": "#141b16", "highlight-elevated": "#1c261f", "card": "#151d18", "tab-active": "#1f2a23", "subtext": "#a3b1a7", "button": "#7fb88a", "button-active": "#8fc79a" },
    "Ember": { "main": "#100b0c", "sidebar": "#171011", "misc": "#2e1c1e", "main-elevated": "#1d1415", "highlight": "#1b1314", "highlight-elevated": "#251a1b", "card": "#1d1415", "tab-active": "#2e1c1e", "subtext": "#b7a3a4", "button": "#e0625c", "button-active": "#e8736d" },
    "Amethyst": { "main": "#0d0b11", "sidebar": "#141119", "misc": "#2a2335", "main-elevated": "#1a1622", "highlight": "#18141f", "highlight-elevated": "#211b2b", "card": "#1a1622", "tab-active": "#2a2335", "subtext": "#ada5b9", "button": "#a58cf0", "button-active": "#b39cf5" },
    "Mono": { "main": "#0a0a0a", "sidebar": "#121212", "misc": "#262626", "main-elevated": "#1a1a1a", "highlight": "#161616", "highlight-elevated": "#1f1f1f", "card": "#1a1a1a", "tab-active": "#262626", "subtext": "#a6a6a6", "button": "#d9d9d9", "button-active": "#ededed" },
  };

  // Colour settings: each overrides one or more of the scheme's colours
  // (Spicetify routes Spotify's colours through --spice-* variables).
  // Unset = use the colour scheme.
  const COLOURS = [
    ["accentColor", ["button-active", "button"], "Accent", "Play buttons and highlighted items, like the playlist that's playing"],
    ["backgroundColor", ["sidebar"], "Background", "Behind and between the boxes"],
    ["boxColor", ["main"], "Box background", "Inside the boxes and panels"],
    ["outlineColor", ["misc"], "Outline", "Outline colour for every box and panel"],
  ];
  const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v || "");
  // is a colour scheme active from Marketplace or Spicetify's config?
  function hasOutsideScheme() {
    if (document.querySelector("style.marketplaceScheme")) return true;
    // manual install: Spicetify bakes the configured scheme into its own CSS.
    // (With Marketplace, a scheme name without its style means the scheme
    // wasn't found, e.g. one that was removed from color.ini.)
    return !document.querySelector("style.marketplaceUserCSS") && !!window.Spicetify?.Config?.color_scheme;
  }
  const toRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  // blend a colour towards white (amount > 0) or black (amount < 0)
  function shade(hex, amount) {
    const target = amount > 0 ? 255 : 0, a = Math.abs(amount);
    return "#" + toRgb(hex).map((c) => Math.round(c + (target - c) * a).toString(16).padStart(2, "0")).join("");
  }

  const TOGGLES = [
    ["boxes", "Boxed top bar", "Outline and background around the three top bar boxes"],
    ["dropdownBox", "Boxed search dropdown", "Search dropdown styled like the other boxes and lined up under the search bar"],
    ["dropdownCompact", "Compact search dropdown", "Keep the search dropdown narrow instead of the full search bar width"],
    ["plainSearch", "Plain search bar", "No grey fill or white glow on the search bar, even when hovering or typing"],
    ["hideShortcut", "Hide ⌘L hint", "Hide the keyboard shortcut hint inside the search bar"],
    ["flatButtons", "Flat top bar buttons", "No grey circles behind Home and the top-right buttons, even on hover; icons glow instead"],
    ["dimHome", "Dim Home icon", "Home icon grey like the other top bar icons, white on hover"],
    ["charcoalLiked", "Charcoal Liked Songs", "Grey Liked Songs artwork and page header instead of purple"],
  ];

  const DEFAULTS = {
    os: /Windows/.test(navigator.userAgent) ? "windows" : "mac",
    corners: "rounded",
    outlineWidth: 1,
    ...Object.fromEntries(TOGGLES.map(([key]) => [key, true])),
  };
  // hideShortcut is new, so it starts off
  DEFAULTS.hideShortcut = false;

  function load() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  let settings = load();

  function applySettings() {
    const root = document.documentElement;
    root.classList.toggle("sbo-mac", settings.os === "mac");
    root.classList.toggle("sbo-windows", settings.os === "windows");
    root.classList.toggle("sbo-sharp", settings.corners === "sharp");
    for (const [key] of TOGGLES) root.classList.toggle("sbo-" + key, !!settings[key]);
    root.style.setProperty("--sbo-outline-width", settings.outlineWidth + "px");
    // Colours: the scheme picked in the panel (if any), then single overrides.
    // Anything left unset falls back to the scheme picked in Marketplace, or
    // to Subtle when no scheme is active at all (Marketplace sometimes saves
    // an installed theme without one, which leaves Spotify's plain colours).
    const colours = {};
    const scheme = SCHEMES[settings.scheme] || (hasOutsideScheme() ? null : SCHEMES.Subtle);
    if (scheme) for (const name in SPICE_DEFAULTS) colours[name] = scheme[name] || SPICE_DEFAULTS[name];
    for (const [key, names] of COLOURS) {
      if (isHex(settings[key])) for (const name of names) colours[name] = settings[key].toLowerCase();
    }
    for (const name in SPICE_DEFAULTS) {
      if (colours[name]) {
        root.style.setProperty(`--spice-${name}`, colours[name]);
        // some of Spotify's colours use the r,g,b form, e.g. rgba(var(--spice-rgb-main), .5)
        root.style.setProperty(`--spice-rgb-${name}`, toRgb(colours[name]).join(","));
      } else {
        root.style.removeProperty(`--spice-${name}`);
        root.style.removeProperty(`--spice-rgb-${name}`);
      }
    }
    // Spotify hard-codes green hover/pressed shades for accent buttons (like
    // the big play button); derive them from the accent instead
    const accent = colours["button-active"];
    root.classList.toggle("sbo-accent", !!accent);
    if (accent) {
      root.style.setProperty("--sbo-accent-hover", shade(accent, 0.15));
      root.style.setProperty("--sbo-accent-press", shade(accent, -0.12));
    }
  }

  const style = document.createElement("style");
  style.id = "subtle-outline";
  style.textContent = `
    /* =================== Layout (always on) =================== */

    /* ---- Left box: back, forward, Home ---- */
    .main-globalNav-historyButtonsSpacer {
      display: none !important;
    }
    .main-globalNav-historyButtonsWrapper {
      anchor-name: --sbo-left;
      margin-inline-start: 0 !important;
      height: 48px;
      box-sizing: border-box;
      /* 68px on the right = 8px gap + 48px Home + 12px edge */
      padding-inline: 12px 68px !important;
    }
    /* Mac: start at the window edge with the red/yellow/green buttons inside
       the box; 92px keeps the arrows clear of them */
    html.sbo-mac .main-globalNav-historyButtonsWrapper {
      /* divided by the zoom factor: the window buttons don't zoom with the
         page, so the room for them must stay the same size on screen */
      padding-inline-start: calc(92px / var(--sbo-zoom, 1)) !important;
    }
    .main-globalNav-searchContainer > button {
      position: fixed !important;
      position-anchor: --sbo-left;
      left: calc(anchor(right) - 60px);
      top: anchor(top);
      margin: 0 !important;
      z-index: 2; /* above the left box's background */
    }

    /* ---- Middle box: search bar, filling the whole box ---- */
    .main-globalNav-searchSection {
      position: static !important;
      flex: 1 1 auto;
      margin-inline: 8px;
    }
    .main-globalNav-searchContainer {
      flex: 1 1 auto;
      justify-content: flex-start;
      max-width: none !important;
      height: 48px;
      box-sizing: border-box;
    }
    .main-globalNav-searchInputSection {
      flex: 1 1 auto !important;
      max-width: none !important;
    }

    /* In narrower windows Spotify collapses the search bar to an icon (adds
       .searchInputCollapsed to the top bar), hiding the placeholder text and
       the icon area that holds Browse, and hides What's New / Listening /
       profile while the search bar is expanded. Our layout has room, so undo
       all of that. */
    html .searchInputCollapsed .main-globalNav-searchInputSection > .main-globalNav-searchInputContainer {
      width: 100% !important;
    }
    html .searchInputCollapsed .main-globalNav-searchInputSection > .main-globalNav-searchInputContainer > :last-child {
      opacity: 1 !important;
      visibility: visible !important;
    }
    html .searchInputCollapsed .main-globalNav-searchInputSection > .main-globalNav-searchInputContainer input {
      color: var(--text-base, #fff) !important;
      padding-inline-end: 64px !important;
    }
    html .searchInputCollapsed .main-globalNav-searchInputSection > .main-globalNav-searchInputContainer input::placeholder {
      color: var(--text-subdued, #b3b3b3) !important;
    }
    html .searchInputCollapsed .main-actionButtons {
      display: flex !important;
      animation: none !important;
    }

    /* ---- Right box: settings, Browse, Marketplace, What's New, Listening,
       profile ---- */
    .main-globalNav-contentRight {
      anchor-name: --sbo-right;
      display: flex;
      align-items: center;
      height: 48px;
      box-sizing: border-box;
      /* 120px on the left = 8px edge + three 32px buttons with 8px between
         (the right box adds its own 8px gap before What's New) */
      padding-inline: 120px 8px;
    }
    /* Windows: leave room for the minimize/maximize/close buttons in the
       top right corner (Windows draws them 46px wide each) */
    html.sbo-windows .main-globalNav-contentRight {
      margin-inline-end: calc(138px / var(--sbo-zoom, 1));
    }
    html.sbo-windows .main-globalNav-contentRightSpacer {
      display: none !important;
    }
    /* Browse lives inside the search bar's icon area, whose transform would
       otherwise trap the fixed positioning below. */
    .main-globalNav-searchInputSection .e-10860-form-input-icon__icon--trailing {
      transform: none !important;
      top: 0 !important;
      bottom: 0 !important;
      display: flex !important;
      align-items: center;
    }
    .main-globalNav-browseButtonWrapper {
      position: fixed !important;
      position-anchor: --sbo-right;
      left: calc(anchor(left) + 48px);
      top: calc(anchor(top) + 8px);
      width: 32px;
      height: 32px;
      padding: 0 !important;
      border-inline-start: none !important;
      /* Spotify's invisible window-drag strip covers the top bar; buttons
         need no-drag to be clickable. Browse used to inherit this from the
         search bar it sat in. */
      -webkit-app-region: no-drag;
      app-region: no-drag;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .custom-navlinks-scrollable_container {
      position: fixed !important;
      position-anchor: --sbo-right;
      left: calc(anchor(left) + 88px);
      top: calc(anchor(top) + 8px);
      width: 32px;
      height: 32px;
      max-width: none !important;
    }
    .custom-navlinks-scrollable_container button {
      width: 32px !important;
      height: 32px !important;
      min-width: 0 !important;
      min-height: 0 !important;
    }
    /* Browse and Marketplace icons a little smaller (24px -> 20px) */
    .main-globalNav-browseButtonWrapper svg,
    .custom-navlinks-scrollable_container button svg {
      width: 20px !important;
      height: 20px !important;
    }

    /* ---- Settings button (ours, not Spotify's) ---- */
    .sbo-settings-btn {
      position: fixed;
      position-anchor: --sbo-right;
      left: calc(anchor(left) + 8px);
      top: calc(anchor(top) + 8px);
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--text-subdued, #b3b3b3);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 2;
      -webkit-app-region: no-drag;
      app-region: no-drag;
      transition: color .2s ease-in-out, background-color .2s ease-in-out;
    }
    .sbo-settings-btn:hover {
      color: var(--text-base, #fff);
      background-color: var(--background-elevated-highlight, #2a2a2a);
    }
    .sbo-settings-btn svg {
      width: 20px;
      height: 20px;
    }
    /* Hide it when Spotify's top bar isn't there (e.g. full-screen views) */
    html:not(:has(.main-globalNav-contentRight)) .sbo-settings-btn {
      display: none;
    }

    /* =================== Accent colour =================== */
    html.sbo-accent .encore-bright-accent-set,
    html.sbo-accent .encore-positive-set {
      --background-highlight: var(--sbo-accent-hover) !important;
      --background-press: var(--sbo-accent-press) !important;
      --background-elevated-base: var(--sbo-accent-hover) !important;
      --background-elevated-highlight: var(--sbo-accent-hover) !important;
      --background-elevated-press: var(--sbo-accent-press) !important;
    }

    /* =================== Box outline setting =================== */
    /* Thickness for the top boxes and dropdowns and the outlined panels in
       user.css; colour comes from --spice-misc */
    .Root__now-playing-bar {
      outline-width: var(--sbo-outline-width, 2px) !important;
    }
    .Root__main-view,
    .Root__right-sidebar,
    .main-yourLibraryX-entryPoints,
    .main-buddyFeed-container,
    .main-contextMenu-menu,
    .main-card-card,
    .main-card-cardContainer,
    .view-homeShortcutsGrid-shortcutLink {
      border-width: var(--sbo-outline-width, 2px) !important;
    }

    /* =================== Toggles =================== */

    /* Boxed top bar: box look copied from the theme's .Root__now-playing-bar */
    html.sbo-boxes .main-globalNav-historyButtonsWrapper,
    html.sbo-boxes .main-globalNav-searchContainer,
    html.sbo-boxes .main-globalNav-contentRight {
      outline: var(--sbo-outline-width, 2px) solid var(--spice-misc);
      border-radius: var(--sbo-radius, 11px);
      background-color: var(--spice-main);
    }

    /* Compact search dropdown: keep the dropdowns (the results one and the
       loading one shown while Spotify fetches) at the search bar's original
       490px instead of the whole box */
    html.sbo-dropdownCompact #search-dropdown,
    html.sbo-dropdownCompact #search-suggestions-loading-dropdown {
      width: 490px !important;
      max-width: 100% !important;
    }

    /* Boxed search dropdown: styled like the other boxes, lined up with the
       search box's left edge, 8px below it */
    html.sbo-dropdownBox #search-dropdown .main-actionBar-ActionBarContainer,
    html.sbo-dropdownBox #search-suggestions-loading-dropdown .main-actionBar-ActionBarContainer {
      background-color: var(--spice-main) !important;
      outline: var(--sbo-outline-width, 2px) solid var(--spice-misc);
      border-radius: var(--sbo-radius, 11px) !important;
      box-shadow: none !important;
      /* Spotify pins its margin, so shift it this way */
      translate: -8px 4px;
    }

    /* Plain search bar: no grey fill or white glow, even on hover or while
       typing, and no grey fade behind the ⌘L hint */
    html.sbo-plainSearch .main-globalNav-searchInputSection input,
    html.sbo-plainSearch .main-globalNav-searchInputSection input:hover,
    html.sbo-plainSearch .main-globalNav-searchInputSection input:focus {
      background-color: transparent !important;
      box-shadow: none !important;
    }
    html.sbo-plainSearch .main-globalNav-searchInputKBDWrapper {
      background-image: none !important;
    }

    /* Hide the ⌘L hint */
    html.sbo-hideShortcut .main-globalNav-searchInputKBDWrapper {
      display: none !important;
    }

    /* Flat top bar buttons: no grey circle behind Home and the top-right
       buttons, even on hover; instead the icon (or profile picture) glows */
    html.sbo-flatButtons :is(.main-globalNav-searchContainer > button, .sbo-settings-btn,
        .main-globalNav-browseButtonWrapper button, .custom-navlinks-scrollable_container button,
        .main-globalNav-contentRight button),
    html.sbo-flatButtons :is(.main-globalNav-searchContainer > button, .sbo-settings-btn,
        .main-globalNav-browseButtonWrapper button, .custom-navlinks-scrollable_container button,
        .main-globalNav-contentRight button):hover {
      background-color: transparent !important;
    }
    html.sbo-flatButtons :is(.main-globalNav-searchContainer > button, .sbo-settings-btn,
        .main-globalNav-browseButtonWrapper button, .custom-navlinks-scrollable_container button,
        .main-globalNav-contentRight button) :is(svg, img) {
      transition: filter .2s ease-in-out;
    }
    html.sbo-flatButtons :is(.main-globalNav-searchContainer > button, .sbo-settings-btn,
        .main-globalNav-browseButtonWrapper button, .custom-navlinks-scrollable_container button,
        .main-globalNav-contentRight button):hover svg {
      filter: drop-shadow(0 0 4px rgba(255, 255, 255, .6));
    }
    html.sbo-flatButtons [data-testid="user-widget-link"]:hover img {
      filter: drop-shadow(0 0 6px rgba(255, 255, 255, .45));
    }

    /* Dim Home icon: grey like the other top bar icons, white on hover */
    html.sbo-dimHome .main-globalNav-searchContainer > button {
      color: var(--text-subdued) !important;
    }
    html.sbo-dimHome .main-globalNav-searchContainer > button:hover {
      color: var(--text-base, #fff) !important;
    }

    /* Charcoal Liked Songs. Spotify's artwork is a downloaded picture, so
       swap in our own: a gradient from a lighter tint of the theme's outline
       grey to its side panel colour, with the same white heart. */
    html.sbo-charcoalLiked img[src*="misc.scdn.co/liked-songs/"] {
      content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%235c5a66'/%3E%3Cstop offset='1' stop-color='%231c1a1e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='640' fill='url(%23g)'/%3E%3Cg transform='translate(200 200) scale(15)' fill='%23fff'%3E%3Cpath d='M15.724 4.22A4.313 4.313 0 0 0 12.192.814a4.269 4.269 0 0 0-3.622 1.13.837.837 0 0 1-1.14 0 4.272 4.272 0 0 0-6.21 5.855l5.916 7.05a1.128 1.128 0 0 0 1.727 0l5.916-7.05a4.228 4.228 0 0 0 .945-3.577z'/%3E%3C/g%3E%3C/svg%3E");
    }
    /* The Liked Songs page header is painted with #5038a0 (taken from the
       old artwork) as an inline colour; use a neutral grey instead. */
    html.sbo-charcoalLiked [style*="background-color: rgb(80, 56, 160)"] {
      background-color: ${LIKED_HEADER} !important;
    }
    html.sbo-charcoalLiked [style*="--background-base: #5038a0"] {
      --background-base: ${LIKED_HEADER} !important;
      background-color: ${LIKED_HEADER} !important;
    }

    /* =================== Corners: sharp =================== */
    /* Every corner square: boxes, panels, cards, covers, menus, buttons,
       tags, play buttons, profile picture, sliders, scrollbars. !important
       here also beats corners Spotify sets inline on elements. */
    html.sbo-sharp {
      --sbo-radius: 0px;
    }
    html.sbo-sharp *,
    html.sbo-sharp *::before,
    html.sbo-sharp *::after {
      border-radius: 0 !important;
    }

    /* =================== Settings panel =================== */
    .sbo-panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
      color: var(--text-base, #fff);
      font-size: 14px;
    }
    .sbo-section h3 {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--text-subdued, #b3b3b3);
      margin: 0 0 8px;
    }
    .sbo-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
    }
    .sbo-row + .sbo-row {
      border-top: 1px solid rgba(255, 255, 255, .06);
    }
    .sbo-row small {
      display: block;
      color: var(--text-subdued, #b3b3b3);
      font-size: 12px;
      margin-top: 2px;
    }
    .sbo-segment {
      display: inline-flex;
      border: 1px solid var(--spice-misc);
      border-radius: 999px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .sbo-segment button {
      border: none;
      background: transparent;
      color: var(--text-subdued, #b3b3b3);
      padding: 6px 14px;
      font: inherit;
      cursor: pointer;
    }
    .sbo-segment button.sbo-on {
      background: var(--text-base, #fff);
      color: #000;
    }
    .sbo-switch {
      position: relative;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
      border: none;
      border-radius: 999px;
      background: #535353;
      cursor: pointer;
      transition: background-color .15s;
    }
    .sbo-switch::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      transition: transform .15s;
    }
    .sbo-switch[aria-checked="true"] {
      background: var(--spice-button, #1db954);
    }
    .sbo-switch[aria-checked="true"]::after {
      transform: translateX(18px);
    }
    .sbo-control {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .sbo-control input[type="color"] {
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid var(--spice-misc);
      border-radius: 8px;
      background: none;
      cursor: pointer;
    }
    .sbo-control select {
      background: var(--spice-main);
      color: var(--text-base, #fff);
      border: 1px solid var(--spice-misc);
      border-radius: 8px;
      padding: 6px 10px;
      font: inherit;
      cursor: pointer;
    }
    .sbo-control input[type="range"] {
      width: 140px;
      accent-color: var(--text-base, #fff);
    }
    .sbo-value {
      min-width: 32px;
      text-align: right;
      color: var(--text-subdued, #b3b3b3);
      font-variant-numeric: tabular-nums;
    }
    .sbo-reset {
      align-self: flex-start;
      border: 1px solid var(--spice-misc);
      border-radius: 999px;
      background: transparent;
      color: var(--text-base, #fff);
      padding: 8px 16px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .sbo-reset:hover {
      border-color: var(--text-base, #fff);
    }
  `;
  document.head.appendChild(style);
  applySettings();

  // Marketplace (re)injects its scheme when one is picked there; re-check so
  // the Subtle fallback steps aside for it
  new MutationObserver((mutations) => {
    if (mutations.some((m) => [...m.addedNodes, ...m.removedNodes].some((n) => n.classList?.contains("marketplaceScheme")))) {
      applySettings();
    }
  }).observe(document.body, { childList: true });

  // Spotify's zoom (Cmd +/-) scales the page but not the window buttons;
  // outerWidth / innerWidth is the current zoom factor.
  function updateZoom() {
    const factor = window.outerWidth && window.innerWidth ? window.outerWidth / window.innerWidth : 1;
    document.documentElement.style.setProperty("--sbo-zoom", String(factor || 1));
  }
  updateZoom();
  window.addEventListener("resize", updateZoom);

  // ---- Settings panel ----
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const c of children) node.append(c);
    return node;
  }
  function labelBlock(title, hint) {
    return el("div", {}, el("div", { textContent: title }), el("small", { textContent: hint }));
  }
  function update(key, value) {
    settings[key] = value;
    save();
    applySettings();
  }

  function buildPanel() {
    const panel = el("div", { className: "sbo-panel" });

    // Two-way switches (Mac/Windows, Rounded/Sharp)
    function segmented(key, options) {
      const segment = el("div", { className: "sbo-segment" });
      for (const [value, text] of options) {
        const b = el("button", { textContent: text });
        b.classList.toggle("sbo-on", settings[key] === value);
        b.addEventListener("click", () => {
          update(key, value);
          for (const other of segment.children) other.classList.toggle("sbo-on", other === b);
        });
        segment.append(b);
      }
      return segment;
    }
    panel.append(el("div", { className: "sbo-section" },
      el("h3", { textContent: "Layout" }),
      el("div", { className: "sbo-row" },
        labelBlock("Window buttons", "Leave room for the close/minimize buttons: left on Mac, top right on Windows"),
        segmented("os", [["mac", "Mac"], ["windows", "Windows"]])),
      el("div", { className: "sbo-row" },
        labelBlock("Corners", "Rounded, or sharp: every corner square, including buttons and tags"),
        segmented("corners", [["rounded", "Rounded"], ["sharp", "Sharp"]]))));

    // Colours
    const colours = el("div", { className: "sbo-section" }, el("h3", { textContent: "Colours" }));
    const schemeSelect = el("select");
    schemeSelect.setAttribute("aria-label", "Colour scheme");
    for (const name of ["", ...Object.keys(SCHEMES)]) {
      schemeSelect.append(el("option", { value: name, textContent: name || "Marketplace's choice" }));
    }
    schemeSelect.value = SCHEMES[settings.scheme] ? settings.scheme : "";
    schemeSelect.addEventListener("change", () => {
      // a new scheme replaces any single colour overrides, so it shows as designed
      settings.scheme = schemeSelect.value || undefined;
      for (const [key] of COLOURS) delete settings[key];
      save();
      applySettings();
      setTimeout(() => panel.replaceWith(buildPanel()), 0); // show the scheme's colours in the pickers
    });
    colours.append(el("div", { className: "sbo-row" },
      labelBlock("Colour scheme", "Switch schemes here or in Marketplace (Subtle if none is set); the colours below fine-tune it"),
      el("div", { className: "sbo-control" }, schemeSelect)));
    for (const [key, names, title, hint] of COLOURS) {
      const current = settings[key] ||
        getComputedStyle(document.documentElement).getPropertyValue(`--spice-${names[0]}`).trim();
      const picker = el("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(current) ? current : "#000000" });
      picker.setAttribute("aria-label", title);
      picker.addEventListener("input", () => update(key, picker.value));
      colours.append(el("div", { className: "sbo-row" },
        labelBlock(title, hint), el("div", { className: "sbo-control" }, picker)));
    }
    panel.append(colours);

    // Box outline thickness
    const width = el("input", { type: "range", min: 0, max: 4, step: 1, value: settings.outlineWidth });
    const widthValue = el("span", { className: "sbo-value", textContent: settings.outlineWidth + "px" });
    width.addEventListener("input", () => {
      update("outlineWidth", Number(width.value));
      widthValue.textContent = width.value + "px";
    });
    panel.append(el("div", { className: "sbo-section" },
      el("h3", { textContent: "Box outline" }),
      el("div", { className: "sbo-row" },
        labelBlock("Thickness", "0px hides the outlines"),
        el("div", { className: "sbo-control" }, width, widthValue))));

    // Toggles
    const toggles = el("div", { className: "sbo-section" }, el("h3", { textContent: "Features" }));
    for (const [key, title, hint] of TOGGLES) {
      const sw = el("button", { className: "sbo-switch" });
      sw.setAttribute("role", "switch");
      sw.setAttribute("aria-label", title);
      sw.setAttribute("aria-checked", String(!!settings[key]));
      sw.addEventListener("click", () => {
        update(key, !settings[key]);
        sw.setAttribute("aria-checked", String(settings[key]));
      });
      toggles.append(el("div", { className: "sbo-row" }, labelBlock(title, hint), sw));
    }
    panel.append(toggles);

    // Reset
    const reset = el("button", { className: "sbo-reset", textContent: "Reset to defaults" });
    reset.addEventListener("click", () => {
      settings = { ...DEFAULTS };
      save();
      applySettings();
      // Redraw so the controls show the defaults. Wait until this click has
      // finished: removing the clicked button mid-click makes Spotify's popup
      // think the click was outside it, and it closes.
      setTimeout(() => panel.replaceWith(buildPanel()), 0);
    });
    panel.append(reset);
    return panel;
  }

  function openPanel() {
    if (!window.Spicetify?.PopupModal) return;
    Spicetify.PopupModal.display({ title: "Theme settings", content: buildPanel(), isLarge: true });
  }

  // ---- Settings button ----
  const gear = el("button", { className: "sbo-settings-btn", title: "Theme settings" });
  gear.setAttribute("aria-label", "Theme settings");
  gear.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>`;
  gear.addEventListener("click", openPanel);
  document.body.append(gear);
})();
