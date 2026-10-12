// Reworked Spotify: the script half of the theme (loaded by Marketplace via
// "include" in manifest.json). Spicetify themes are CSS only, so everything
// that needs code lives here. Two parts:
//
//  1. The Subtle Outline base: top bar layout, the paintbrush button and its
//     live settings panel.
//  2. The rework: artist, playlist/album, profile and home page layouts, the
//     Wikipedia panel, themed menus, the black-and-white DJ, and the extra
//     settings in the paintbrush panel (Home, Artist page).
//
// ===================== Part 1: Subtle Outline base =====================
//
// Layout (always on):
//  - Top bar buttons regrouped into three boxes: left = back, forward, Home;
//    middle = search (full width); right = theme settings, Browse,
//    Marketplace, What's New, Listening activity, profile. Spotify's own
//    buttons stay where React puts them in the page (moving them would upset
//    Spotify's React code); CSS anchor positioning draws them inside space
//    reserved in their new box.
//  - Room for the macOS window buttons (red/yellow/green) in the left box.
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
    ["flatButtons", "Flat top bar buttons", "No grey circles behind Home and the top-right buttons, even on hover; icons glow instead"],
    ["dimHome", "Dim Home icon", "Home icon grey like the other top bar icons, white on hover"],
    ["charcoalLiked", "Charcoal Liked Songs", "Grey Liked Songs artwork and page header instead of purple"],
  ];

  const DEFAULTS = {
    corners: "rounded",
    outlineWidth: 1,
    ...Object.fromEntries(TOGGLES.map(([key]) => [key, true])),
  };

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
      /* starts at the window edge with the red/yellow/green buttons inside
         the box: 92px on the left keeps the arrows clear of them (divided by
         the zoom factor, since the window buttons don't zoom with the page);
         68px on the right = 8px gap + 48px Home + 12px edge */
      padding-inline: calc(92px / var(--sbo-zoom, 1)) 68px !important;
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

    /* The ⌘L hint is always hidden */
    .main-globalNav-searchInputKBDWrapper {
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
  // outerWidth / innerWidth is the current zoom factor. While a window is
  // being resized outerWidth lags behind, so the value is (re)read once the
  // resize has settled; otherwise back/forward slide under the window buttons.
  function updateZoom() {
    const f = window.outerWidth && window.innerWidth ? window.outerWidth / window.innerWidth : 1;
    const v = String(Math.round(Math.min(3, Math.max(0.5, f || 1)) * 100) / 100);
    if (document.documentElement.style.getPropertyValue("--sbo-zoom") !== v) document.documentElement.style.setProperty("--sbo-zoom", v);
  }
  updateZoom();
  let zoomTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(zoomTimer);
    zoomTimer = setTimeout(updateZoom, 150);
  });

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

    // Two-way switch (Rounded/Sharp)
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

// ===================== Part 2: the rework =====================
// redesigns the artist page to match the theme and adds a
// Wikipedia panel.
//
//  - Header, identical for every artist: picture, name with the verified
//    tick, listeners, "Read bio" (opens Spotify's bio window, restyled).
//  - One outlined box of equal icon buttons (Play, Shuffle, Follow,
//    Wikipedia, More), styled like the top bar.
//  - Popular always shows 10. Discography lists every release with filters
//    and a search that also finds songs inside albums.
//  - Other sections are hidden unless "Extra artist sections" is switched on
//    in the theme's paintbrush settings (stored in localStorage).
//  - The Wikipedia button opens the artist's article in a dark panel.
//  - Playlist, album and Liked Songs pages get the same flat header,
//    outlined toolbar, small chips and boxed track list / Recommended.
//  - Popup menus and tooltips use the theme's colours and outline.
//  - The DJ's narration (panel, player bar button, artwork) is shown in
//    black and white instead of Spotify's blue and green.
//  - Home: a tile block (big Liked Songs tile, shortcuts, DJ),
//    Recents, Quick picks, New release + Made For, a few rows, and the rest
//    folded under "More for you" (Quick picks and row count are settings).
//
//  - The article is found through Wikidata's Spotify artist ID (P1902), so
//    "Roar" the band never lands on "Roar" the Katy Perry song; when Wikidata
//    has no match it falls back to a Wikipedia search limited to music pages.
//  - Wikipedia's HTML is rebuilt through an allowlist (no scripts, styles or
//    event attributes survive), then styled with the theme's --spice colours.
//  - Right-click an artist > "Wikipedia" also opens the panel.
//  - Discography and song search use Spotify's own data (GraphQL); song
//    lists are only fetched once you start searching.
//
(function reworkedSpotify() {
  if (!(window.Spicetify && Spicetify.Platform && Spicetify.Platform.History && Spicetify.GraphQL && Spicetify.ContextMenu)) {
    setTimeout(reworkedSpotify, 300);
    return;
  }
  if (window.__wikiAbout) return;
  window.__wikiAbout = true;

  const WIKI = "https://en.wikipedia.org";
  const MUSIC_RE = /\b(musician|band|singer|rapper|songwriter|dj|producer|duo|trio|group|composer|music|musical|vocalist|record|artist|hip hop|rock|pop|emcee|mc|guitarist|drummer|pianist|bassist|project|ensemble|orchestra|choir)\b/i;
  const DROP_SECTIONS = /^(references|notes|citations|sources|external links|further reading|see also|footnotes|bibliography|notes and references|references and notes)$/i;
  const titleCache = new Map();

  // ---------- styles ----------
  const css = `
.Root__main-view.wa-panel-open{isolation:isolate}
.wa-panel{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;background:var(--spice-main,#0f0f11);border-radius:inherit;color:var(--spice-subtext,#b3b3b3);font-family:inherit;container-type:inline-size;opacity:0;transform:translateY(8px);transition:opacity .18s ease,transform .18s ease}
.wa-panel.wa-in{opacity:1;transform:none}
.wa-bar{position:absolute;top:12px;right:14px;display:flex;gap:6px;z-index:2}
.wa-btn{width:32px;height:32px;border-radius:999px;border:1px solid var(--spice-misc,#2a2930);background:var(--spice-main,#0f0f11);color:var(--spice-text,#fff);display:grid;place-items:center;cursor:pointer;padding:0;opacity:.85}
.wa-btn:hover{opacity:1;background:var(--spice-misc,#2a2930)}
.wa-btn svg{width:16px;height:16px;fill:currentColor}
.wa-btn[hidden]{display:none}
.wa-scroll{flex:1;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--spice-misc,#2a2930) transparent}
.wa-wrap{display:grid;grid-template-columns:240px minmax(0,1fr);gap:28px;max-width:1240px;margin:0 auto;padding:28px 32px 48px}
.wa-side{position:sticky;top:20px;align-self:start;display:flex;flex-direction:column;gap:12px;max-height:calc(100cqh - 40px)}
.wa-box{border:1px solid var(--spice-misc,#2a2930);border-radius:10px;padding:14px 10px 10px;overflow-y:auto;scrollbar-width:none}
.wa-boxhead{color:var(--spice-text,#fff);font-weight:700;font-size:16px;padding:0 6px 10px}
.wa-toc a{display:block;padding:5px 6px;border-radius:6px;font-size:15px;color:var(--spice-subtext,#b3b3b3);text-decoration:none;cursor:pointer;line-height:1.3;transition:color .2s}
.wa-toc a.wa-sub{font-size:13px;padding-left:18px}
.wa-toc a:hover{background:rgba(255,255,255,.06);color:var(--spice-text,#fff)}
.wa-toc a.wa-active{color:var(--spice-text,#fff);font-weight:700}
.wa-fact{padding:5px 6px;line-height:1.3}
.wa-fact b{display:block;font-weight:400;font-size:13px;color:var(--spice-subtext,#b3b3b3)}
.wa-fact span{display:block;font-size:14px;color:var(--spice-text,#fff)}
.wa-main{min-width:0;max-width:780px}
.wa-hero{display:flex;gap:24px;align-items:flex-end;margin-bottom:28px;padding-right:96px}
.wa-hero img{width:148px;height:148px;object-fit:cover;object-position:center 20%;border-radius:8px;flex:none;background:var(--spice-misc,#2a2930)}
.wa-kicker{font-size:13px;color:var(--spice-subtext,#b3b3b3);margin-bottom:4px}
.wa-title{font-family:SpicyLyrics,SpotifyMixUITitle,sans-serif;font-weight:700;font-size:44px;line-height:1.05;color:var(--spice-text,#fff);margin:0;letter-spacing:-.01em}
.wa-desc{margin-top:8px;font-size:16px;color:var(--spice-subtext,#b3b3b3)}
.wa-facts-inline{display:none;border:1px solid var(--spice-misc,#2a2930);border-radius:10px;padding:8px 6px;margin-bottom:24px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
.wa-body{font-size:16px;line-height:1.65;color:rgba(255,255,255,.74)}
.wa-body p{margin:0 0 16px}
.wa-body a{color:var(--spice-text,#fff);text-decoration:none;border-bottom:1px solid var(--spice-misc,#2a2930);cursor:pointer}
.wa-body a:hover{border-color:var(--spice-text,#fff)}
.wa-body h2,.wa-body h3,.wa-body h4{font-family:SpicyLyrics,SpotifyMixUITitle,sans-serif;color:var(--spice-subtext,#b3b3b3);font-weight:700;line-height:1.2;transition:color .3s;scroll-margin-top:20px}
.wa-body h2{font-size:30px;margin:40px 0 14px}
.wa-body h3{font-size:21px;margin:28px 0 10px}
.wa-body h4{font-size:17px;margin:22px 0 8px}
.wa-body h2.wa-active,.wa-body h3.wa-active{color:var(--spice-text,#fff)}
.wa-body ul,.wa-body ol{margin:0 0 16px;padding-left:22px}
.wa-body li{margin:3px 0}
.wa-body blockquote{margin:0 0 16px;padding:2px 0 2px 16px;border-left:2px solid var(--spice-misc,#2a2930);color:var(--spice-subtext,#b3b3b3)}
.wa-body figure{float:right;clear:right;width:min(260px,40%);margin:4px 0 16px 24px}
.wa-body figure img{width:100%;height:auto;border-radius:8px;display:block}
.wa-body figcaption{font-size:13px;line-height:1.4;color:var(--spice-subtext,#b3b3b3);margin-top:6px}
.wa-body img{max-width:100%;height:auto}
.wa-body .wa-table{overflow-x:auto;margin:0 0 20px;border:1px solid var(--spice-misc,#2a2930);border-radius:10px;clear:both}
.wa-body table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.4}
.wa-body th,.wa-body td{padding:8px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--spice-misc,#2a2930)}
.wa-body tr:last-child>th,.wa-body tr:last-child>td{border-bottom:0}
.wa-body th{color:var(--spice-text,#fff);font-weight:700}
.wa-body caption{text-align:left;padding:10px 12px 4px;color:var(--spice-text,#fff);font-weight:700}
.wa-body section{clear:both}
.wa-foot{clear:both;margin-top:40px;padding-top:16px;border-top:1px solid var(--spice-misc,#2a2930);font-size:13px;color:var(--spice-subtext,#b3b3b3)}
.wa-foot a{color:var(--spice-text,#fff);cursor:pointer;text-decoration:none}
.wa-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;height:100%;padding:40px;text-align:center}
.wa-state h3{font-family:SpicyLyrics,SpotifyMixUITitle,sans-serif;font-size:30px;font-weight:700;color:var(--spice-text,#fff);margin:0;max-width:560px}
.wa-state p{margin:0;font-size:15px;max-width:460px}
.wa-dots{display:flex;gap:10px}
.wa-dots i{width:12px;height:12px;border-radius:50%;background:var(--spice-subtext,#b3b3b3);opacity:.3;animation:wa-dot 1.2s ease-in-out infinite}
.wa-dots i:nth-child(2){animation-delay:.2s}.wa-dots i:nth-child(3){animation-delay:.4s}
@keyframes wa-dot{0%,100%{opacity:.25;transform:scale(.85)}40%{opacity:1;transform:scale(1.1);background:var(--spice-text,#fff)}}
.wa-state-btns{display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:center}
.wa-state-btns button{font:inherit;font-size:14px;font-weight:700;padding:8px 16px;border-radius:999px;border:1px solid var(--spice-misc,#2a2930);background:transparent;color:var(--spice-text,#fff);cursor:pointer}
.wa-state-btns button:hover{background:var(--spice-misc,#2a2930)}
@container (max-width: 900px){
  .wa-wrap{grid-template-columns:minmax(0,1fr);padding:24px 22px 40px}
  .wa-side{display:none}
  .wa-facts-inline{display:grid}
}
@container (max-width: 560px){
  .wa-hero{flex-direction:column;align-items:flex-start;padding-right:0;margin-top:30px}
  .wa-title{font-size:34px}
  .wa-body figure{float:none;width:100%;margin:0 0 16px}
}`;
  const styleEl = document.createElement("style");
  styleEl.id = "wiki-about-style";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- helpers ----------
  const icon = {
    close: '<svg viewBox="0 0 16 16"><path d="M2.47 2.47a.75.75 0 0 1 1.06 0L8 6.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L9.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06L8 9.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L6.94 8 2.47 3.53a.75.75 0 0 1 0-1.06z"/></svg>',
    back: '<svg viewBox="0 0 16 16"><path d="M11.03.47a.75.75 0 0 1 0 1.06L4.56 8l6.47 6.47a.75.75 0 1 1-1.06 1.06L2.44 8 9.97.47a.75.75 0 0 1 1.06 0z"/></svg>',
    external: '<svg viewBox="0 0 16 16"><path d="M1 2.75A.75.75 0 0 1 1.75 2H7v1.5H2.5v10h10V9H14v5.25a.75.75 0 0 1-.75.75H1.75a.75.75 0 0 1-.75-.75V2.75z"/><path d="M15 1v4.993a.75.75 0 1 1-1.5 0V3.56L8.78 8.28a.75.75 0 0 1-1.06-1.06l4.72-4.72h-2.433a.75.75 0 0 1 0-1.5H15z"/></svg>',
  };
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const text = (tag, cls, t) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    e.textContent = t;
    return e;
  };
  const getJSON = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  };
  const pageUrl = (title) => `${WIKI}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  const openExternal = (url) => {
    if (!/^https?:\/\//.test(url)) return;
    window.open(url, "_blank");
  };

  // ---------- finding the article ----------
  async function titleFromWikidata(artistId) {
    const s = await getJSON(`https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=haswbstatement:P1902=${encodeURIComponent(artistId)}&format=json&origin=*`);
    const q = s.query && s.query.search && s.query.search[0] && s.query.search[0].title;
    if (!q) return null;
    const e = await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${q}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`);
    const link = e.entities && e.entities[q] && e.entities[q].sitelinks && e.entities[q].sitelinks.enwiki;
    return link ? link.title : null;
  }

  async function titleFromSearch(name) {
    const tags = ["musician", "band", "rapper", "singer", "American band", "British band", "singer-songwriter", "DJ", "producer", "record producer", "group", "duo", "artist"];
    const candidates = [name, ...tags.map((t) => `${name} (${t})`)];
    const byTitle = await getJSON(`${WIKI}/w/api.php?action=query&titles=${encodeURIComponent(candidates.join("|"))}&redirects=1&prop=description|pageprops&format=json&origin=*`);
    const pages = Object.values((byTitle.query && byTitle.query.pages) || {}).filter((p) => !p.missing && !(p.pageprops && "disambiguation" in p.pageprops));
    const exactish = pages.filter((p) => MUSIC_RE.test(p.description || ""));
    // prefer a disambiguated "(musician)"-style title over the bare name only when the bare one isn't music
    const bare = exactish.find((p) => p.title.toLowerCase() === name.toLowerCase());
    if (bare) return bare.title;
    if (exactish.length) return exactish[0].title;

    const s = await getJSON(`${WIKI}/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name + " music")}&gsrlimit=10&prop=description|pageprops&format=json&origin=*`);
    const found = Object.values((s.query && s.query.pages) || {})
      .sort((a, b) => a.index - b.index)
      .filter((p) => !(p.pageprops && "disambiguation" in p.pageprops))
      .find((p) => p.title.toLowerCase().replace(/\s*\(.*\)$/, "") === name.toLowerCase() && MUSIC_RE.test(p.description || ""));
    return found ? found.title : null;
  }

  async function findTitle(artistId, name) {
    const key = artistId || name;
    if (titleCache.has(key)) return titleCache.get(key);
    let t = null;
    if (artistId) t = await titleFromWikidata(artistId).catch(() => null);
    if (!t && name) t = await titleFromSearch(name).catch(() => null);
    titleCache.set(key, t);
    return t;
  }

  async function artistName(artistId) {
    const G = Spicetify.GraphQL;
    const r = await G.Request(G.Definitions.queryArtistOverview, { uri: `spotify:artist:${artistId}`, locale: "", includePrerelease: false });
    return r && r.data && r.data.artistUnion && r.data.artistUnion.profile && r.data.artistUnion.profile.name;
  }

  // ---------- cleaning Wikipedia's HTML ----------
  const DROP_TAGS = new Set(["STYLE", "SCRIPT", "LINK", "META", "NOSCRIPT", "MATH", "SVG", "AUDIO", "VIDEO", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT", "TEMPLATE", "BASE", "SOURCE", "TRACK", "MAP", "AREA", "CANVAS", "TITLE", "HEAD"]);
  const KEEP_TAGS = new Set(["P", "A", "B", "STRONG", "I", "EM", "UL", "OL", "LI", "DL", "DT", "DD", "H2", "H3", "H4", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "CAPTION", "FIGURE", "FIGCAPTION", "IMG", "SPAN", "DIV", "SECTION", "BR", "SUB", "SUP", "ABBR", "SMALL", "CITE", "Q", "CODE", "PRE", "S", "U", "HR"]);
  const JUNK = [
    "sup.mw-ref", "sup.reference", ".mw-editsection", ".navbox", ".navbox-styles", ".vertical-navbox", ".hatnote", ".shortdescription",
    ".ambox", ".mbox-small", ".metadata", ".sistersitebox", "table.sidebar", ".reflist", ".refbegin", ".mw-references-wrap", ".noprint",
    ".mw-empty-elt", "[role=navigation]", ".portalbox", ".side-box", ".plainlinks.sistersitebox", ".mw-authority-control", ".authority-control",
    ".spoken-wikipedia", ".infobox", "link", "style", ".mw-ext-score", "[typeof~='mw:Extension/templatestyles']", ".geo-nondefault", ".mwe-math-element",
  ];

  function wikiImg(src) {
    if (!src) return null;
    const u = src.startsWith("//") ? "https:" + src : src;
    return /^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(u) ? u : null;
  }

  function cleanText(node) {
    const c = node.cloneNode(true);
    c.querySelectorAll("sup, style, link, .noprint, br").forEach((x) => {
      if (x.tagName === "BR") x.replaceWith(", ");
      else x.remove();
    });
    const lis = [...c.querySelectorAll("li")];
    const t = lis.length ? lis.map((li) => li.textContent.trim()).filter(Boolean).join(", ") : c.textContent;
    return t.replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,\s*,/g, ",").replace(/^[,\s]+|[,\s]+$/g, "").trim();
  }

  function extractFacts(doc) {
    const box = doc.querySelector("table.infobox");
    const facts = [];
    let image = null;
    if (!box) return { facts, image };
    const img = box.querySelector("img");
    if (img) image = wikiImg(img.getAttribute("src"));
    for (const tr of box.querySelectorAll("tr")) {
      const th = tr.querySelector(":scope > th.infobox-label, :scope > th");
      const td = tr.querySelector(":scope > td.infobox-data, :scope > td");
      if (!th || !td || th.colSpan > 1) continue;
      const label = cleanText(th);
      const value = cleanText(td);
      if (!label || !value || value.length > 220) continue;
      if (/^(website|signature|label|labels)$/i.test(label) && value.length > 120) continue;
      if (/^website$/i.test(label)) continue;
      facts.push([label, value]);
      if (facts.length >= 12) break;
    }
    return { facts, image };
  }

  // rebuild a node through the allowlist; returns a DocumentFragment
  function rebuild(src) {
    const frag = document.createDocumentFragment();
    for (const n of src.childNodes) {
      if (n.nodeType === 3) {
        frag.appendChild(document.createTextNode(n.textContent));
        continue;
      }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toUpperCase();
      if (DROP_TAGS.has(tag)) continue;
      if (!KEEP_TAGS.has(tag)) {
        frag.appendChild(rebuild(n));
        continue;
      }
      if (tag === "IMG") {
        const s = wikiImg(n.getAttribute("src"));
        if (!s) continue;
        const w = +n.getAttribute("width") || 0;
        if (w && w < 40) continue; // flag icons, tiny symbols
        const img = document.createElement("img");
        img.src = s;
        img.loading = "lazy";
        img.alt = n.getAttribute("alt") || "";
        if (w) img.width = w;
        if (+n.getAttribute("height")) img.height = +n.getAttribute("height");
        const set = (n.getAttribute("srcset") || "")
          .split(",")
          .map((part) => part.trim().split(/\s+/))
          .filter(([u, d]) => wikiImg(u) && /^\d+(\.\d+)?x$/.test(d || ""))
          .map(([u, d]) => `${wikiImg(u)} ${d}`)
          .join(", ");
        if (set) img.srcset = set;
        frag.appendChild(img);
        continue;
      }
      if (tag === "A") {
        const href = n.getAttribute("href") || "";
        const rel = n.getAttribute("rel") || "";
        const inner = rebuild(n);
        if (/mw:WikiLink/.test(rel) && href.startsWith("./")) {
          const t = decodeURIComponent(href.slice(2).split("#")[0]).replace(/_/g, " ");
          if (!t || /^(File|Special|Help|Wikipedia|Template|Category|Portal|Talk):/i.test(t)) {
            frag.appendChild(inner);
            continue;
          }
          const a = document.createElement("a");
          a.dataset.wiki = t;
          a.appendChild(inner);
          frag.appendChild(a);
        } else if (/mw:ExtLink/.test(rel) && /^https?:\/\//.test(href)) {
          const a = document.createElement("a");
          a.dataset.ext = href;
          a.appendChild(inner);
          frag.appendChild(a);
        } else {
          frag.appendChild(inner);
        }
        continue;
      }
      const out = document.createElement(tag.toLowerCase());
      if (tag === "TD" || tag === "TH") {
        for (const at of ["colspan", "rowspan"]) if (n.getAttribute(at) && /^\d+$/.test(n.getAttribute(at))) out.setAttribute(at, n.getAttribute(at));
      }
      out.appendChild(rebuild(n));
      if (tag === "TABLE") {
        const w = document.createElement("div");
        w.className = "wa-table";
        w.appendChild(out);
        frag.appendChild(w);
      } else {
        frag.appendChild(out);
      }
    }
    return frag;
  }

  async function loadArticle(title) {
    const enc = encodeURIComponent(title.replace(/ /g, "_"));
    const [html, summary] = await Promise.all([
      fetch(`${WIKI}/api/rest_v1/page/html/${enc}?redirect=true`).then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      }),
      getJSON(`${WIKI}/api/rest_v1/page/summary/${enc}?redirect=true`).catch(() => ({})),
    ]);
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll('[style*="display:none"], [style*="display: none"], .bday, .nickname-hidden').forEach((x) => x.remove());
    const { facts, image } = extractFacts(doc);

    for (const sec of doc.querySelectorAll("section")) {
      const h = sec.querySelector(":scope > h2, :scope > div.mw-heading > h2");
      if (h && DROP_SECTIONS.test(h.textContent.trim())) sec.remove();
    }
    for (const sel of JUNK) doc.querySelectorAll(sel).forEach((x) => x.remove());
    // figures: keep the image + caption only
    for (const fig of doc.querySelectorAll("figure")) {
      const img = fig.querySelector("img");
      const cap = fig.querySelector("figcaption");
      if (!img) {
        fig.remove();
        continue;
      }
      fig.replaceChildren(img, ...(cap && cap.textContent.trim() ? [cap] : []));
    }
    // tables that are layout-only or galleries tend to look broken; keep wikitables
    for (const t of doc.querySelectorAll("table")) {
      if (!t.classList.contains("wikitable") && !t.closest(".wikitable")) t.remove();
    }
    doc.querySelectorAll(".gallery, ul.gallery").forEach((x) => x.remove());

    const body = document.createElement("div");
    body.className = "wa-body";
    body.appendChild(rebuild(doc.body));
    // drop empty paragraphs/sections left behind
    body.querySelectorAll("p").forEach((p) => {
      if (!p.textContent.trim() && !p.querySelector("img")) p.remove();
    });

    return {
      title: (summary.titles && summary.titles.normalized) || doc.title || title,
      canonical: (summary.titles && summary.titles.canonical) || title,
      description: summary.description || "",
      image: (summary.thumbnail && wikiImg(summary.thumbnail.source)) || image,
      facts,
      body,
    };
  }

  // ---------- panel ----------
  let panel = null;
  let stack = [];
  let spy = null;
  let unlisten = null;
  let loadToken = 0;

  function closePanel() {
    if (!panel) return;
    const p = panel;
    panel = null;
    stack = [];
    if (spy) spy.disconnect();
    spy = null;
    if (unlisten) unlisten();
    unlisten = null;
    document.removeEventListener("keydown", onKey, true);
    p.classList.remove("wa-in");
    setTimeout(() => {
      p.remove();
      if (!panel) document.querySelector(".Root__main-view")?.classList.remove("wa-panel-open");
    }, 180);
  }

  function onKey(e) {
    if (e.key === "Escape" && panel) {
      e.stopPropagation();
      closePanel();
    }
  }

  function ensurePanel() {
    if (panel) return panel;
    const host = document.querySelector(".Root__main-view");
    if (!host) return null;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.classList.add("wa-panel-open");
    panel = el("div", "wa-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Wikipedia");
    const bar = el("div", "wa-bar");
    const back = el("button", "wa-btn wa-back", icon.back);
    back.title = "Back";
    back.hidden = true;
    const ext = el("button", "wa-btn wa-ext", icon.external);
    ext.title = "Open on Wikipedia";
    const close = el("button", "wa-btn", icon.close);
    close.title = "Close (Esc)";
    bar.append(back, ext, close);
    const scroll = el("div", "wa-scroll");
    panel.append(bar, scroll);
    host.appendChild(panel);
    requestAnimationFrame(() => panel && panel.classList.add("wa-in"));

    close.onclick = closePanel;
    back.onclick = () => {
      if (stack.length > 1) {
        stack.pop();
        show(stack.pop());
      }
    };
    ext.onclick = () => {
      const cur = stack[stack.length - 1];
      openExternal(cur && cur.title ? pageUrl(cur.title) : WIKI);
    };
    scroll.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      e.preventDefault();
      if (a.dataset.wiki) show({ title: a.dataset.wiki });
      else if (a.dataset.ext) openExternal(a.dataset.ext);
      else if (a.dataset.toc) {
        const t = panel.querySelector(`#${CSS.escape(a.dataset.toc)}`);
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    document.addEventListener("keydown", onKey, true);
    unlisten = Spicetify.Platform.History.listen(() => closePanel());
    return panel;
  }

  function setState(node) {
    const scroll = panel.querySelector(".wa-scroll");
    scroll.replaceChildren(node);
    scroll.scrollTop = 0;
  }

  function loadingState(label) {
    const s = el("div", "wa-state");
    s.append(el("div", "wa-dots", "<i></i><i></i><i></i>"), text("p", "", label));
    return s;
  }

  function emptyState(heading, sub, buttons) {
    const s = el("div", "wa-state");
    s.append(text("h3", "", heading));
    if (sub) s.append(text("p", "", sub));
    const row = el("div", "wa-state-btns");
    for (const [label, fn] of buttons) {
      const b = text("button", "", label);
      b.onclick = fn;
      row.append(b);
    }
    s.append(row);
    return s;
  }

  function factList(facts, cls) {
    const box = el("div", cls);
    for (const [k, v] of facts) {
      const f = el("div", "wa-fact");
      f.append(text("b", "", k), text("span", "", v));
      box.append(f);
    }
    return box;
  }

  // entry: { artistId?, name?, title? }
  async function show(entry) {
    if (!ensurePanel()) return;
    const token = ++loadToken;
    stack.push(entry);
    panel.querySelector(".wa-back").hidden = stack.length < 2;
    setState(loadingState(entry.title ? "Loading article" : `Looking up ${entry.name || "artist"} on Wikipedia`));

    try {
      if (!entry.title) {
        if (!entry.name && entry.artistId) entry.name = await artistName(entry.artistId).catch(() => null);
        entry.title = await findTitle(entry.artistId, entry.name);
      }
      if (token !== loadToken || !panel) return;
      if (!entry.title) {
        const actions = [["Search Wikipedia", () => openExternal(`${WIKI}/w/index.php?search=${encodeURIComponent(entry.name || "")}`)]];
        if (document.querySelector('[data-wa="about-card"]')) actions.push(["Show Spotify bio", showSpotifyBio]);
        setState(emptyState(`No Wikipedia article for ${entry.name || "this artist"}`, "Wikipedia doesn't seem to have a page about them yet.", actions));
        return;
      }
      const art = await loadArticle(entry.title);
      if (token !== loadToken || !panel) return;
      entry.title = art.canonical.replace(/_/g, " ");
      render(art);
    } catch (err) {
      if (token !== loadToken || !panel) return;
      console.error("[wikiAbout]", err);
      setState(emptyState("Couldn't load Wikipedia", "Check your connection and try again.", [["Try again", () => { stack.pop(); show(entry); }]]));
    }
  }

  function render(art) {
    const wrap = el("div", "wa-wrap");
    const side = el("aside", "wa-side");
    const main = el("article", "wa-main");

    // hero
    const hero = el("header", "wa-hero");
    if (art.image) {
      const img = document.createElement("img");
      img.src = art.image;
      img.alt = "";
      hero.append(img);
    }
    const ht = el("div");
    const shortTitle = art.title.replace(/\s*\([^)]*\)$/, "");
    ht.append(text("div", "wa-kicker", shortTitle !== art.title ? `Wikipedia • ${art.title}` : "Wikipedia"), text("h1", "wa-title", shortTitle));
    if (art.description) ht.append(text("div", "wa-desc", art.description));
    hero.append(ht);
    main.append(hero);
    if (art.facts.length) main.append(factList(art.facts, "wa-facts-inline"));

    // headings -> ids + TOC
    const heads = [...art.body.querySelectorAll("h2, h3")];
    heads.forEach((h, i) => (h.id = `wa-h-${i}`));
    if (heads.length) {
      const toc = el("nav", "wa-box wa-toc");
      toc.append(text("div", "wa-boxhead", "Contents"));
      const top = text("a", "wa-active", "Overview");
      top.dataset.toc = "wa-top";
      toc.append(top);
      for (const h of heads) {
        const a = text("a", h.tagName === "H3" ? "wa-sub" : "", h.textContent.trim());
        a.dataset.toc = h.id;
        toc.append(a);
      }
      side.append(toc);
    }
    if (art.facts.length) {
      const fb = factList(art.facts, "wa-box");
      fb.prepend(text("div", "wa-boxhead", "Details"));
      side.append(fb);
    }
    hero.id = "wa-top";

    main.append(art.body);
    const foot = el("div", "wa-foot");
    foot.append(document.createTextNode("Text from Wikipedia, available under CC BY-SA 4.0. "));
    const src = text("a", "", "Read the original article ↗");
    src.dataset.ext = pageUrl(art.canonical);
    foot.append(src);
    main.append(foot);

    wrap.append(side, main);
    setState(wrap);

    // scroll spy: the section you're reading lights up, like the current lyric line
    if (spy) spy.disconnect();
    const scroll = panel.querySelector(".wa-scroll");
    const tocLinks = [...wrap.querySelectorAll(".wa-toc a")];
    const marks = [hero, ...heads];
    const update = () => {
      const y = scroll.getBoundingClientRect().top + Math.min(260, scroll.clientHeight * 0.3);
      let cur = marks[0];
      for (const m of marks) if (m.getBoundingClientRect().top <= y) cur = m;
      heads.forEach((h) => h.classList.toggle("wa-active", h === cur));
      tocLinks.forEach((a) => a.classList.toggle("wa-active", a.dataset.toc === cur.id));
      const act = tocLinks.find((a) => a.dataset.toc === cur.id);
      const box = act && act.parentElement;
      if (box && (act.offsetTop < box.scrollTop || act.offsetTop > box.scrollTop + box.clientHeight - 40)) box.scrollTop = act.offsetTop - 60;
    };
    let raf = 0;
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), update()));
    };
    scroll.addEventListener("scroll", onScroll, { passive: true });
    spy = { disconnect: () => scroll.removeEventListener("scroll", onScroll) };
    update();
  }

  function showSpotifyBio() {
    const card = document.querySelector('[data-wa="about-card"]');
    closePanel();
    if (card) card.click();
  }

  function openWiki(artistId, name) {
    if (panel) stack = [];
    show({ artistId, name: name || null });
  }

  // ---------- artist page layout ----------
  // Spotify's class names are hashed and change between versions, so the page
  // is tagged with data-wa attributes (by test IDs, structure and section
  // headings) and the layout CSS targets those tags. Untagged parts keep
  // Spotify's default look, so a Spotify update degrades instead of breaking.
  //
  // Layout: header (picture, name, short bio + "Read full bio"); one outlined
  // box of equal icon buttons styled like the top bar; Popular (always 10);
  // a full, searchable Discography. Everything else (You Liked, Artist pick,
  // On Tour, Featuring, Discovered on, Fans also like, ...) is hidden unless
  // "Extra artist sections" is on in the theme's paintbrush settings.
  const SETTINGS_KEY = "wikiAbout:settings";
  const settings = (() => {
    try {
      return Object.assign({ extras: false, quickPicks: true, homeRows: "3" }, JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
    } catch {
      return { extras: false, quickPicks: true, homeRows: "3" };
    }
  })();
  const applySettings = () => document.documentElement.classList.toggle("wa-extras", !!settings.extras);
  applySettings();

  const pageCss = `
/* no sideways scrolling on artist pages */
[data-wa-artist],[data-wa="main"],[data-wa="content"]{overflow-x:clip !important;max-width:100% !important;min-width:0 !important}

/* header */
[data-wa-artist] [data-testid="entity-header"]{padding-bottom:0 !important;background:var(--spice-main,#0f0f11) !important;height:auto !important;min-height:0 !important;max-height:none !important}
[data-wa-artist] [data-testid="entity-header"] > :not(.main-entityHeader-contentWrapper){display:none !important}
[data-wa-artist] .main-entityHeader-contentWrapper{position:relative !important;height:auto !important;min-height:0 !important;padding-top:24px !important;padding-bottom:0 !important;margin:0 !important;max-width:100% !important}
[data-wa-artist] .main-entityHeader-contentWrapper > div:last-child{height:auto !important;align-items:center !important;gap:20px;min-width:0}
[data-wa-artist] .main-entityHeader-imageContainer,[data-wa-artist] .main-entityHeader-imageContainer img,.wa-pfp{width:120px !important;height:120px !important;min-width:120px !important;margin:0 !important;border-radius:50% !important;object-fit:cover}
.wa-pfp{background:var(--spice-misc,#2a2930);flex:none}
/* the header is the same for every artist: 120px picture; name (one line)
   with the verified tick beside it; listeners; "Read bio" */
[data-wa-artist] .main-entityHeader-contentWrapper > div:last-child{height:120px !important;min-height:120px !important;max-height:120px !important;flex-wrap:nowrap !important}
[data-wa-artist] .main-entityHeader-headerText{display:grid !important;grid-template-columns:auto minmax(0,1fr);grid-template-rows:48px 20px 20px;row-gap:4px;column-gap:8px;align-content:center !important;align-items:center;height:120px !important;max-height:120px !important;flex:1 1 auto !important;min-width:0;padding:0 !important;margin:0 !important;overflow:hidden}
[data-wa-artist] .main-entityHeader-headerText > *{margin:0 !important;padding:0 !important;min-width:0}
[data-wa-artist] .main-entityHeader-headerText > :not(.main-entityHeader-title):not(button):not(span):not(.wa-hdr-about){display:none !important}
[data-wa-artist] .main-entityHeader-title{grid-row:1;grid-column:1;height:48px !important;max-height:48px !important;max-width:100%;overflow:hidden;display:block !important}
[data-wa-artist] .main-entityHeader-title > span{display:block !important;font-size:40px !important;line-height:48px !important;height:48px !important;max-height:48px !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;letter-spacing:-.01em;padding:0 !important;-webkit-line-clamp:unset !important}
[data-wa-artist] .main-entityHeader-headerText > button:not(.wa-hdr-about){grid-row:1;grid-column:2;justify-self:start;align-self:center;width:24px !important;height:24px !important;overflow:hidden}
[data-wa-artist] .main-entityHeader-headerText > button:not(.wa-hdr-about) span span{display:none !important}
[data-wa-artist] .main-entityHeader-headerText > span:not(.main-entityHeader-title){grid-row:2;grid-column:1 / -1;font-size:13px;line-height:20px;height:20px;color:var(--spice-subtext,#b3b3b3);white-space:nowrap;overflow:hidden}
.wa-hdr-about{grid-row:3;grid-column:1 / -1;justify-self:start;height:20px;padding:0;border:0;background:transparent;font:inherit;font-size:13px;line-height:20px;font-weight:700;color:var(--spice-text,#fff);cursor:pointer}
.wa-hdr-about:hover{text-decoration:underline}
.wa-hdr-about:disabled{opacity:.5;cursor:default;text-decoration:none}

/* Spotify's About card stays rendered (its bio window lives inside it) but takes no space */
[data-wa-sec="about"]{position:absolute !important;width:1px !important;height:1px !important;overflow:hidden !important;clip-path:inset(50%) !important;padding:0 !important;margin:0 !important;border:0 !important;pointer-events:none}
[data-wa-sec="about"] dialog{pointer-events:auto}
/* the bio window, in the theme's colours */
[data-wa-artist] dialog[open]{background:var(--spice-main,#0f0f11) !important;color:var(--spice-subtext,#b3b3b3) !important;border:1px solid var(--spice-misc,#2a2930) !important;border-radius:10px !important;box-shadow:0 16px 48px rgba(0,0,0,.6) !important;overflow:hidden}
[data-wa-artist] dialog[open] *{background-color:transparent !important}
[data-wa-artist] dialog[open] img{border-radius:8px}
[data-wa-artist] dialog[open] button[aria-label]{background:var(--spice-main,#0f0f11) !important;border:1px solid var(--spice-misc,#2a2930) !important;color:var(--spice-text,#fff) !important}
[data-wa-artist] dialog[open] button[aria-label]:hover{background:var(--spice-misc,#2a2930) !important}
[data-wa-artist] dialog[open]::backdrop{background:rgba(0,0,0,.6)}

/* page background + sticky bar */
[data-wa="actionbg"]{display:none !important}
[data-wa="main"]{background:var(--spice-main,#0f0f11) !important;container-type:inline-size}
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile) .main-topBar-overlay{background:transparent !important}
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile) .main-topBar-background{background:var(--spice-main,#0f0f11) !important;border-bottom:1px solid var(--spice-misc,#2a2930)}
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile) .main-topBar-topbarContentWrapper .main-playButton-PlayButton button,
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile) .main-topBar-topbarContentWrapper .main-playButton-PlayButton button > span{width:32px !important;height:32px !important;min-width:32px !important;min-block-size:32px !important;inline-size:32px !important;block-size:32px !important;padding:0 !important}
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile) .main-topBar-topbarContentWrapper .main-playButton-PlayButton button > span{background:transparent !important;border:1px solid var(--spice-misc,#2a2930);border-radius:8px !important;display:grid !important;place-items:center !important;box-shadow:none !important;transform:none !important}
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile) .main-topBar-topbarContentWrapper .main-playButton-PlayButton button:hover > span{background:rgba(255,255,255,.07) !important}
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile) .main-topBar-topbarContentWrapper .main-playButton-PlayButton svg{width:16px !important;height:16px !important;fill:var(--spice-text,#fff) !important}

/* action buttons: one outlined box of equal icon buttons, like the top bar */
[data-wa-artist] [data-testid="action-bar"]{padding-top:12px !important;padding-bottom:12px !important;min-height:0 !important}
[data-wa-artist] [data-testid="action-bar-row"]{display:inline-flex !important;align-items:center !important;gap:2px !important;width:auto !important;height:auto !important;min-height:0 !important;padding:4px !important;border:1px solid var(--spice-misc,#2a2930);border-radius:11px;background:var(--spice-main,#0f0f11)}
[data-wa-artist] [data-testid="action-bar-row"] > *{margin:0 !important}
[data-wa-artist] [data-testid="action-bar-row-actions"]{display:contents !important}
[data-wa-artist] [data-testid="action-bar-row"] button,
[data-wa-artist] [data-testid="action-bar-row"] .main-playButton-PlayButton{width:32px !important;height:32px !important;min-width:32px !important;min-height:0 !important;inline-size:32px !important;block-size:32px !important;padding:0 !important;margin:0 !important;border:0 !important;border-radius:8px !important;background:transparent !important;display:grid !important;place-items:center !important;color:var(--spice-subtext,#b3b3b3) !important;transform:none !important;box-shadow:none !important}
[data-wa-artist] [data-testid="action-bar-row"] button > span{width:32px !important;height:32px !important;min-block-size:0 !important;block-size:32px !important;inline-size:32px !important;padding:0 !important;background:transparent !important;color:inherit !important;display:grid !important;place-items:center !important;transform:none !important;box-shadow:none !important}
[data-wa-artist] [data-testid="action-bar-row"] button:hover{background:rgba(255,255,255,.07) !important;color:var(--spice-text,#fff) !important}
[data-wa-artist] [data-testid="action-bar-row"] svg{width:16px !important;height:16px !important;fill:currentColor}
[data-wa-artist] [data-testid="action-bar-row"] .main-playButton-PlayButton button{color:var(--spice-text,#fff) !important}
[data-wa-artist] [data-testid="action-bar-row"] .main-playButton-PlayButton svg{fill:var(--spice-text,#fff) !important}
[data-wa-artist] [data-testid="action-bar-row"] button[aria-checked="true"],[data-wa-artist] [data-testid="action-bar-row"] button[aria-pressed="true"]{color:var(--spice-button-active,#1ed760) !important}
[data-wa-artist] [data-testid="action-bar-row"] button::after{display:none !important}
[data-wa-artist] [data-testid="action-bar-row"] [data-wa="follow-orig"],[data-wa-artist] [data-testid="action-bar-row"] [data-testid="watch-feed-entity-button"]{display:none !important}
[data-wa="follow-btn"][data-wa-on] svg.wa-off,[data-wa="follow-btn"]:not([data-wa-on]) svg.wa-on{display:none}
[data-wa="follow-btn"][data-wa-on]{color:var(--spice-button-active,#1ed760) !important}

/* content grid */
[data-wa="content"]{display:grid !important;grid-template-columns:minmax(0,1fr) minmax(0,320px);grid-template-rows:auto 1fr;grid-auto-flow:row dense;column-gap:12px;row-gap:12px;padding-top:0 !important;padding-bottom:28px !important}
[data-wa="content"] > *,[data-wa="group"] > *{grid-column:1 / -1;margin:0 !important;min-width:0;min-height:0 !important}
[data-wa="group"]{display:contents !important}
[data-wa-sec="popular"]{grid-column:1 !important;grid-row:span 2 !important;align-self:stretch !important}
[data-wa-sec="side"],[data-wa-sec="on-tour"]{grid-column:2 !important;grid-row:auto !important}
[data-wa="content"].wa-no-tour [data-wa-sec="side"]{grid-row:span 2 !important;align-self:stretch !important}
[data-wa="content"] [data-wa-sec="on-tour"]{align-self:stretch !important}
[data-wa="content"].wa-pop-wide [data-wa-sec="popular"]{grid-column:1 / -1 !important;grid-row:auto !important}
html:not(.wa-extras) [data-wa="content"] [data-wa-sec]:not([data-wa-sec="popular"]):not([data-wa-sec="about"]){display:none !important}
[data-wa="content"].wa-disco-ready [data-wa-sec="discography"]{display:none !important}
@container (max-width: 860px){
  [data-wa="content"]{grid-template-columns:minmax(0,1fr)}
  [data-wa-sec="popular"],[data-wa-sec="side"],[data-wa-sec="on-tour"]{grid-column:1 / -1 !important;grid-row:auto !important}
}

/* boxes */
[data-wa-box],.wa-disco{border:1px solid var(--spice-misc,#2a2930) !important;border-radius:10px !important;padding:10px 10px 8px !important;box-sizing:border-box;height:auto !important;align-self:start}
[data-wa="content"] h2,.wa-disco h2{font-size:16px !important;line-height:1.25 !important;font-weight:700 !important;margin:0 !important;color:var(--spice-text,#fff)}
[data-wa="content"] section > :first-child,[data-wa="content"] section > :first-child *{min-height:0 !important}
[data-wa="content"] section > :first-child{margin:0 0 6px !important;padding:0 2px !important}
[data-wa="content"] section > :first-child > *{margin:0 !important}
[data-wa="content"] section > :first-child a span{font-size:12px !important}

/* popular: always 10; two columns of 5 when it has the full width */
[data-wa-sec="popular"] .main-trackList-trackList{margin-top:6px !important;--row-height:40px !important}
[data-wa-sec="popular"] .main-trackList-trackListRow{height:40px !important}
[data-wa-sec="popular"] .main-trackList-rowImage{width:32px !important;height:32px !important}
[data-wa-sec="popular"] > button:last-child{display:none !important}
[data-wa="content"].wa-pop-wide [data-wa="pop-rows"]{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(5,40px);grid-auto-flow:column;column-gap:16px}
@container (max-width: 1500px){
  [data-wa="content"].wa-pop-wide [data-wa="pop-rows"]{display:block !important}
}

/* side column: You Liked + Artist pick as compact rows */
[data-wa-sec="side"]{display:flex !important;flex-direction:column !important;gap:10px !important;width:auto !important}
[data-wa-sec="side"] > *{width:auto !important;max-width:none !important;margin:0 !important}
[data-wa-sec="side"] h2{font-size:12px !important;font-weight:400 !important;color:var(--spice-subtext,#b3b3b3) !important;margin:0 0 6px !important}
[data-wa-sec="side"] [data-testid="saved-tracks-avatar"],[data-wa-sec="side"] [data-testid="saved-tracks-avatar"] figure,[data-wa-sec="side"] [data-testid="saved-tracks-avatar"] img{width:40px !important;height:40px !important;min-width:40px !important}
[data-wa-sec="side"] [data-testid="saved-tracks-avatar"] > div{transform:scale(.7);transform-origin:bottom right}
[data-wa-sec="side"] [data-testid="saved-tracks-avatar"]{position:relative}
[data-wa-sec="side"] [data-testid="saved-tracks-avatar"] + div,[data-wa-sec="side"] [data-testid="artist-pick-link"]{font-size:14px !important}
[data-wa-sec="side"] [data-wa-side="liked-row"]{grid-template-columns:40px minmax(0,1fr) !important;gap:10px !important;align-items:center !important;height:auto !important}
[data-wa-sec="side"] [data-testid="artist-pick-with-background-container"]{height:auto !important;min-height:0 !important;background:none !important;overflow:visible !important;border-radius:0 !important}
[data-wa-sec="side"] [data-wa-side="pick-hide"]{display:none !important}
[data-wa-sec="side"] [data-wa-side="pick-keep"]{position:static !important;height:auto !important;width:auto !important;padding:0 !important;display:block !important}
[data-wa-sec="side"] [data-wa-side="pick-section"]{display:flex !important;align-items:center !important;gap:10px !important;padding:0 !important;width:auto !important;height:auto !important;position:static !important}
[data-wa-sec="side"] [data-wa-side="pick-section"] > div:first-child{width:40px !important;min-width:40px !important;height:40px !important}
[data-wa-sec="side"] [data-wa-side="pick-section"] img{width:40px !important;height:40px !important}
[data-wa-sec="side"] [data-wa-side="pick-section"] > div:last-child > :last-child{font-size:13px !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-sec="side"] [data-wa-side="pick-row"]{display:flex !important;align-items:center !important;gap:10px !important;height:auto !important;width:auto !important}
[data-wa-sec="side"] [data-testid="artist-pick-image-container"],[data-wa-sec="side"] [data-testid="artist-pick-image-container"] img{width:40px !important;min-width:40px !important;height:40px !important;margin:0 !important;padding:0 !important}
[data-wa-sec="side"] [data-wa-side="pick-row"] > div:last-child > :last-child{font-size:13px !important;color:var(--spice-subtext,#b3b3b3) !important}

/* merch: compact rows */
[data-wa-sec="merch"] ul{display:grid !important;grid-template-columns:repeat(auto-fill,minmax(230px,1fr)) !important;gap:2px 8px !important;margin:6px 0 0 !important;padding:0 !important}
[data-wa-sec="merch"] li{list-style:none;min-width:0}
[data-wa-sec="merch"] li > div{display:flex !important;align-items:center !important;gap:10px !important;width:auto !important;height:auto !important;padding:4px !important;margin:0 !important;border-radius:6px}
[data-wa-sec="merch"] li > div:hover{background:rgba(255,255,255,.06)}
[data-wa-sec="merch"] li img{width:40px !important;height:40px !important;min-width:40px;border-radius:4px}
[data-wa-sec="merch"] li > div > div{min-width:0 !important;width:auto !important;flex:1 1 auto !important;display:block !important}
[data-wa-sec="merch"] li > div > div > *{display:block !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important}
[data-wa-sec="merch"] li > div > div span{font-size:14px !important}
[data-wa-sec="merch"] li > div > div p{font-size:12px !important}
[data-wa-sec="merch"] li svg{display:none !important}

/* on tour: compact rows */
[data-wa-sec="on-tour"] ul{display:flex !important;flex-direction:column !important;gap:2px !important;margin:0 !important;grid-template-columns:none !important}
[data-wa-sec="on-tour"] li{width:auto !important}
[data-wa-sec="on-tour"] li > a{display:flex !important;align-items:center !important;gap:10px !important;padding:4px !important;width:auto !important;height:auto !important}
[data-wa-sec="on-tour"] li > a:hover{background:rgba(255,255,255,.06) !important}
[data-wa-sec="on-tour"] li > a > time{width:40px !important;height:40px !important;min-width:40px !important;padding:0 !important;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;border-radius:6px !important;background:transparent !important;border:1px solid var(--spice-misc,#2a2930)}
[data-wa-sec="on-tour"] li > a > time p{font-size:10px !important;line-height:1.1 !important;width:auto !important}
[data-wa-sec="on-tour"] li > a > time p:last-child{font-size:15px !important;font-weight:700 !important}
[data-wa-sec="on-tour"] li > a > div{width:auto !important;min-width:0}
[data-wa-sec="on-tour"] li > a > div > h3{font-size:14px !important}
[data-wa-sec="on-tour"] li > a > div > p{display:none !important}
[data-wa-sec="on-tour"] li > a > div > span{font-size:12px !important}

/* Spotify shelves (shown with the extra sections setting): outlined box of library-style rows */
[data-wa="content"] > section.Shelf{padding:10px 10px 8px !important}
[data-wa-shelf] .main-gridContainer-gridContainer{display:grid !important;grid-template-columns:repeat(auto-fill,minmax(230px,1fr)) !important;grid-template-rows:none !important;grid-auto-rows:auto !important;gap:2px 8px !important;width:auto !important;margin:0 !important;padding:0 !important;overflow:visible !important}
[data-wa-shelf] .main-gridContainer-gridContainer > *{display:grid !important;grid-template-columns:40px minmax(0,1fr) !important;align-items:center !important;column-gap:10px !important;padding:4px !important;margin:0 !important;min-height:0 !important;height:auto !important;border:0 !important;border-radius:6px !important;background:transparent !important;box-shadow:none !important}
[data-wa-shelf] .main-gridContainer-gridContainer > *:hover{background:rgba(255,255,255,.06) !important}
[data-wa-shelf] .main-card-imageContainer{grid-column:1;grid-row:1;width:40px !important;height:40px !important;min-width:40px !important;margin:0 !important;padding:0 !important}
[data-wa-shelf] .main-card-imageContainer > :first-child{width:40px !important;height:40px !important;padding:0 !important;border-radius:4px !important;box-shadow:none !important}
[data-wa-shelf] .main-card-imageContainer > .main-cardImage-circular,[data-wa-shelf] .main-cardImage-circular img{border-radius:50% !important}
[data-wa-shelf] .main-card-imageContainer img{width:40px !important;height:40px !important;border-radius:4px}
[data-wa-shelf] .main-card-PlayButtonContainer{display:none !important}
[data-wa-shelf] .main-gridContainer-gridContainer > * > :not(.main-card-imageContainer):not([class*="on-click"]):not([class*="visually-hidden"]){grid-column:2;grid-row:1;min-width:0;width:auto !important;padding:0 !important;margin:0 !important;height:auto !important;min-height:0 !important}
[data-wa-shelf] .main-gridContainer-gridContainer > * > :not(.main-card-imageContainer) > *{padding:0 !important;gap:0 !important;width:auto !important;min-height:0 !important}
[data-wa-shelf] .main-gridContainer-gridContainer > * > :not(.main-card-imageContainer),[data-wa-shelf] .main-gridContainer-gridContainer > * > :not(.main-card-imageContainer) *{min-width:0 !important;max-width:100% !important}
[data-wa-shelf] .main-gridContainer-gridContainer > * > :not(.main-card-imageContainer),[data-wa-shelf] .main-gridContainer-gridContainer > * > :not(.main-card-imageContainer) > *{overflow:hidden !important}
[data-wa-shelf] .e-10860-line-clamp{-webkit-line-clamp:1 !important;line-clamp:1 !important}
[data-wa-shelf] .e-10860-card-title,[data-wa-shelf] .e-10860-card-title *{font-size:14px !important;line-height:1.3 !important}
[data-wa-shelf] .e-10860-card-title ~ *,[data-wa-shelf] a + div{display:block !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;font-size:12px !important;line-height:1.3 !important;margin:0 !important;min-height:0 !important}
[data-wa-shelf] .e-10860-card-title ~ * *,[data-wa-shelf] a + div *{display:inline !important;white-space:nowrap !important;font-size:12px !important;line-height:1.3 !important}

/* our discography: every release, filterable and searchable down to songs */
.wa-disco{grid-column:1 / -1;min-width:0}
.wa-disco-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;padding:0 2px}
.wa-disco-head h2{margin-right:4px !important}
.wa-disco-count{font-size:12px;color:var(--spice-subtext,#b3b3b3);margin-right:4px}
.wa-chip{font:inherit;font-size:12px;padding:3px 10px;border-radius:999px;border:1px solid var(--spice-misc,#2a2930);background:transparent;color:var(--spice-text,#fff);cursor:pointer;line-height:1.4}
.wa-chip:hover{background:rgba(255,255,255,.07)}
.wa-chip[aria-pressed="true"]{background:var(--spice-text,#fff);color:var(--spice-main,#0f0f11);border-color:var(--spice-text,#fff)}
.wa-search{display:flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:1px solid var(--spice-misc,#2a2930);border-radius:8px;color:var(--spice-subtext,#b3b3b3);min-width:0;flex:0 1 260px}
.wa-search:focus-within{border-color:var(--spice-subtext,#b3b3b3)}
.wa-search svg{width:14px;height:14px;fill:currentColor;flex:none}
.wa-search input{all:unset;flex:1;min-width:0;font-size:13px;color:var(--spice-text,#fff)}
.wa-search input::placeholder{color:var(--spice-subtext,#b3b3b3)}
.wa-disco-status{font-size:12px;color:var(--spice-subtext,#b3b3b3);padding:2px 4px 6px}
.wa-disco-sub{font-size:12px;color:var(--spice-subtext,#b3b3b3);padding:6px 4px 4px}
.wa-rows{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:2px 8px}
.wa-row{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;column-gap:10px;padding:4px;border-radius:6px;cursor:pointer;min-width:0}
.wa-row:hover{background:rgba(255,255,255,.06)}
.wa-row img{width:40px;height:40px;border-radius:4px;object-fit:cover;background:var(--spice-misc,#2a2930)}
.wa-row-t{min-width:0}
.wa-row-t b,.wa-row-t span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wa-row-t b{font-size:14px;font-weight:400;color:var(--spice-text,#fff);line-height:1.3}
.wa-row-t span{font-size:12px;color:var(--spice-subtext,#b3b3b3);line-height:1.3}
.wa-row-t mark{background:none;color:var(--spice-button-active,#1ed760)}
.wa-row-play{width:28px;height:28px;border-radius:8px;border:0;background:transparent;color:var(--spice-text,#fff);display:grid;place-items:center;opacity:0;cursor:pointer;padding:0}
.wa-row:hover .wa-row-play{opacity:1}
.wa-row-play:hover{background:rgba(255,255,255,.1)}
.wa-row-play svg{width:14px;height:14px;fill:currentColor}

/* setting rows added to the theme's paintbrush panel */
.wa-settings-note{font-size:12px;opacity:.7}
`;
  const pageStyle = document.createElement("style");
  pageStyle.id = "wiki-about-artist-page";
  pageStyle.textContent = pageCss;
  document.head.appendChild(pageStyle);

  const slug = (t) => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const tag = (node, name, value = "") => {
    if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
  };
  const untag = (node, name) => {
    if (node && node.hasAttribute(name)) node.removeAttribute(name);
  };
  const svg = (inner, cls) => `<svg viewBox="0 0 16 16" aria-hidden="true"${cls ? ` class="${cls}"` : ""}>${inner}</svg>`;
  const ICON_PERSON = '<path d="M6.5 1.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 4.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z"/><path d="M1.5 14.5c0-2.76 2.24-5 5-5 .86 0 1.67.22 2.38.6l-.73 1.31A3.5 3.5 0 0 0 3 14.5H1.5z"/>';
  const ICON_FOLLOW = svg(ICON_PERSON + '<path d="M13 9v2.25h2.25v1.5H13V15h-1.5v-2.25H9.25v-1.5h2.25V9H13z"/>', "wa-off");
  const ICON_FOLLOWING = svg(ICON_PERSON + '<path d="M15.53 10.03 11.5 14.06l-2.53-2.53 1.06-1.06 1.47 1.47 2.97-2.97 1.06 1.06z"/>', "wa-on");
  const ICON_WIKI = svg('<text x="8" y="12.4" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-size="13" font-weight="700" fill="currentColor">W</text>');
  const ICON_SEARCH = svg('<path d="M7 1.5a5.5 5.5 0 1 0 3.4 9.83l3.13 3.14 1.06-1.06-3.13-3.14A5.5 5.5 0 0 0 7 1.5zM3 7a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"/>');
  const ICON_PLAY = svg('<path d="M3 1.71a.7.7 0 0 1 1.05-.6l10.89 6.29a.7.7 0 0 1 0 1.21L4.05 14.9A.7.7 0 0 1 3 14.29V1.71z"/>');

  function iconButton(kind, label, html) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("data-wa", kind);
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML = html;
    return b;
  }

  // ---------- artist data (cached per artist for the session) ----------
  const avatarCache = new Map();
  async function artistAvatar(id) {
    if (!avatarCache.has(id)) {
      avatarCache.set(
        id,
        (async () => {
          const G = Spicetify.GraphQL;
          const r = await G.Request(G.Definitions.queryArtistOverview, { uri: `spotify:artist:${id}`, locale: "", includePrerelease: false });
          const src = (((r.data && r.data.artistUnion && r.data.artistUnion.visuals && r.data.artistUnion.visuals.avatarImage) || {}).sources || []).slice();
          src.sort((a, b) => Math.abs(a.width - 320) - Math.abs(b.width - 320));
          return src[0] ? src[0].url : null;
        })().catch(() => null)
      );
    }
    return avatarCache.get(id);
  }

  const TYPE_LABEL = { ALBUM: "Album", SINGLE: "Single", EP: "EP", COMPILATION: "Compilation" };
  const discoCache = new Map();
  function loadDiscography(id) {
    if (!discoCache.has(id)) {
      discoCache.set(
        id,
        (async () => {
          const G = Spicetify.GraphQL;
          const out = [];
          let offset = 0;
          let total = Infinity;
          while (offset < total && offset < 1000) {
            const r = await G.Request(G.Definitions.queryArtistDiscographyAll, { uri: `spotify:artist:${id}`, offset, limit: 50, order: "DATE_DESC" });
            const all = r.data && r.data.artistUnion && r.data.artistUnion.discography && r.data.artistUnion.discography.all;
            if (!all) throw new Error("no discography");
            total = all.totalCount;
            for (const it of all.items || []) {
              const rel = it.releases && it.releases.items && it.releases.items[0];
              if (!rel) continue;
              const srcs = ((rel.coverArt && rel.coverArt.sources) || []).slice().sort((a, b) => Math.abs(a.width - 300) - Math.abs(b.width - 300));
              out.push({
                uri: rel.uri,
                id: rel.id,
                name: rel.name,
                type: rel.type,
                year: rel.date && rel.date.year,
                cover: srcs[0] ? srcs[0].url : "",
                tracks: rel.tracks && rel.tracks.totalCount,
              });
            }
            if (!all.items || !all.items.length) break;
            offset += all.items.length;
          }
          return out;
        })()
      );
      discoCache.get(id).catch(() => discoCache.delete(id));
    }
    return discoCache.get(id);
  }

  // song index: every track of every release, fetched only once you search
  const songIndex = new Map();
  function indexSongs(id, releases, onProgress) {
    let idx = songIndex.get(id);
    if (idx) {
      idx.listeners.add(onProgress);
      return idx;
    }
    idx = { songs: [], done: 0, total: releases.length, finished: false, listeners: new Set([onProgress]) };
    songIndex.set(id, idx);
    const G = Spicetify.GraphQL;
    let next = 0;
    const worker = async () => {
      while (next < releases.length) {
        const rel = releases[next++];
        try {
          const r = await G.Request(G.Definitions.queryAlbumTracks, { uri: rel.uri, offset: 0, limit: 300 });
          const items = (r.data && r.data.albumUnion && r.data.albumUnion.tracksV2 && r.data.albumUnion.tracksV2.items) || [];
          for (const it of items) {
            const t = it.track;
            if (t && t.name && t.uri) idx.songs.push({ name: t.name, uri: t.uri, release: rel, norm: norm(t.name) });
          }
        } catch {
          // skip a release that fails; the rest still index
        }
        idx.done++;
        idx.listeners.forEach((fn) => fn());
      }
    };
    Promise.all(Array.from({ length: 6 }, worker)).then(() => {
      idx.finished = true;
      idx.listeners.forEach((fn) => fn());
    });
    return idx;
  }

  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const matches = (n, words) => words.every((w) => n.includes(w));
  function highlight(textValue, words) {
    const frag = document.createDocumentFragment();
    if (!words.length) {
      frag.append(textValue);
      return frag;
    }
    const lower = textValue.toLowerCase();
    let i = 0;
    const hits = [];
    for (const w of words) {
      const at = lower.indexOf(w);
      if (at >= 0) hits.push([at, at + w.length]);
    }
    hits.sort((a, b) => a[0] - b[0]);
    for (const [a, b] of hits) {
      if (a < i) continue;
      frag.append(textValue.slice(i, a));
      const m = document.createElement("mark");
      m.textContent = textValue.slice(a, b);
      frag.append(m);
      i = b;
    }
    frag.append(textValue.slice(i));
    return frag;
  }

  function play(contextUri, trackUri) {
    const P = Spicetify.Platform && Spicetify.Platform.PlayerAPI;
    if (P && P.play) {
      P.play({ uri: contextUri }, {}, trackUri ? { skipTo: { uri: trackUri } } : {});
    } else {
      Spicetify.Player.playUri(trackUri || contextUri);
    }
  }

  function releaseRow(rel, words, song) {
    const row = el("div", "wa-row");
    row.setAttribute("role", "link");
    row.tabIndex = 0;
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = "";
    if (rel.cover) img.src = rel.cover;
    const t = el("div", "wa-row-t");
    const b = document.createElement("b");
    const s = document.createElement("span");
    if (song) {
      b.append(highlight(song.name, words));
      s.textContent = `${rel.name} • ${[rel.year, TYPE_LABEL[rel.type] || ""].filter(Boolean).join(" • ")}`;
    } else {
      b.append(highlight(rel.name, words));
      s.textContent = [rel.year, TYPE_LABEL[rel.type] || rel.type].filter(Boolean).join(" • ");
    }
    t.append(b, s);
    const p = el("button", "wa-row-play", ICON_PLAY);
    p.type = "button";
    p.title = song ? `Play ${song.name}` : `Play ${rel.name}`;
    p.addEventListener("click", (e) => {
      e.stopPropagation();
      play(rel.uri, song && song.uri);
    });
    row.append(img, t, p);
    const go = () => Spicetify.Platform.History.push(`/album/${rel.id}` + (song ? `?highlight=${encodeURIComponent(song.uri)}` : ""));
    row.addEventListener("click", go);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    return row;
  }

  function buildDisco(artistId, anchor, content) {
    const box = el("section", "wa-disco");
    box.dataset.waArtist = artistId;
    const head = el("div", "wa-disco-head");
    head.append(text("h2", "", "Discography"));
    const count = text("span", "wa-disco-count", "");
    head.append(count);
    const chips = el("div", "wa-chips");
    chips.style.display = "flex";
    chips.style.gap = "6px";
    const search = el("label", "wa-search", ICON_SEARCH);
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Search songs and releases";
    input.setAttribute("aria-label", "Search this artist's songs and releases");
    search.append(input);
    head.append(search, chips);
    const status = el("div", "wa-disco-status");
    status.hidden = true;
    const body = el("div", "wa-disco-body");
    box.append(head, status, body);
    anchor.after(box);

    let releases = [];
    let filter = "ALL";
    let idx = null;
    const FILTERS = [
      ["ALL", "All", () => true],
      ["ALBUM", "Albums", (r) => r.type === "ALBUM"],
      ["SINGLE", "Singles and EPs", (r) => r.type === "SINGLE" || r.type === "EP"],
      ["COMPILATION", "Compilations", (r) => r.type === "COMPILATION"],
    ];

    const renderList = () => {
      const q = input.value.trim();
      const words = norm(q).split(" ").filter(Boolean);
      const pass = (FILTERS.find((f) => f[0] === filter) || FILTERS[0])[2];
      const list = releases.filter(pass);
      body.replaceChildren();
      if (!words.length) {
        status.hidden = true;
        const rows = el("div", "wa-rows");
        list.forEach((r) => rows.append(releaseRow(r, [])));
        body.append(rows);
        return;
      }
      const relHits = list.filter((r) => matches(norm(r.name), words));
      const songHits = idx ? idx.songs.filter((s) => pass(s.release) && matches(s.norm, words)) : [];
      // albums before singles for the same song, newest first within each
      const rank = { ALBUM: 0, EP: 1, SINGLE: 2, COMPILATION: 3 };
      songHits.sort((a, b) => (rank[a.release.type] ?? 4) - (rank[b.release.type] ?? 4) || (b.release.year || 0) - (a.release.year || 0));
      status.hidden = !idx || idx.finished;
      if (idx && !idx.finished) status.textContent = `Searching songs… ${idx.done} of ${idx.total} releases`;
      if (relHits.length) {
        body.append(text("div", "wa-disco-sub", `Releases (${relHits.length})`));
        const rows = el("div", "wa-rows");
        relHits.forEach((r) => rows.append(releaseRow(r, words)));
        body.append(rows);
      }
      if (songHits.length) {
        body.append(text("div", "wa-disco-sub", `Songs (${songHits.length})`));
        const rows = el("div", "wa-rows");
        songHits.slice(0, 120).forEach((s) => rows.append(releaseRow(s.release, words, s)));
        body.append(rows);
      }
      if (!relHits.length && !songHits.length && (!idx || idx.finished)) body.append(text("div", "wa-disco-sub", `Nothing matches “${q}”.`));
    };

    let timer = 0;
    const startIndex = () => {
      if (!idx && releases.length) {
        idx = indexSongs(artistId, releases, () => {
          clearTimeout(timer);
          timer = setTimeout(() => box.isConnected && input.value.trim() && renderList(), 150);
        });
      }
    };
    input.addEventListener("focus", startIndex);
    input.addEventListener("input", () => {
      startIndex();
      clearTimeout(timer);
      timer = setTimeout(renderList, 120);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && input.value) {
        e.stopPropagation();
        input.value = "";
        renderList();
      }
    });

    body.append(text("div", "wa-disco-sub", "Loading discography…"));
    loadDiscography(artistId)
      .then((list) => {
        if (!box.isConnected) return;
        releases = list;
        count.textContent = `${list.length} releases`;
        for (const [key, label, pass] of FILTERS) {
          if (key !== "ALL" && !list.some(pass)) continue;
          const c = text("button", "wa-chip", label);
          c.type = "button";
          c.setAttribute("aria-pressed", String(key === filter));
          c.addEventListener("click", () => {
            filter = key;
            chips.querySelectorAll(".wa-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
            renderList();
          });
          chips.append(c);
        }
        content.classList.add("wa-disco-ready");
        renderList();
      })
      .catch(() => {
        // keep Spotify's own discography shelf if ours can't load
        box.remove();
      });
    return box;
  }

  // Popular's list reserves 56px per row; rows are 40px here, so size the
  // list to the rows actually rendered
  const watchedWraps = new WeakSet();
  function fitPopular(wrap, rows) {
    const h = rows ? rows.offsetHeight : 0;
    if (h && wrap.style.getPropertyValue("height") !== h + "px") wrap.style.setProperty("height", h + "px", "important");
  }

  // marks for the artist page's side column (You Liked / Artist pick); done in
  // JS rather than with :has() selectors, which are costly to keep up to date
  function tagSide(side) {
    const liked = side.querySelector('[data-testid="saved-tracks-avatar"]');
    if (liked && liked.parentElement) tag(liked.parentElement, "data-wa-side", "liked-row");
    const box = side.querySelector('[data-testid="artist-pick-with-background-container"]');
    if (box) {
      for (const c of box.children) tag(c, "data-wa-side", c.querySelector('[data-testid="artist-pick-link"]') ? "pick-keep" : "pick-hide");
      for (const sec of box.querySelectorAll("section")) tag(sec, "data-wa-side", sec.querySelector('[data-testid="artist-pick-link"]') ? "pick-section" : "pick-hide");
    }
    const img = side.querySelector('[data-testid="artist-pick-image-container"]');
    if (img && img.parentElement) {
      tag(img.parentElement, "data-wa-side", "pick-row");
      // the small avatar + tag ("OUT NOW") above the pick
      const tagRow = img.parentElement.querySelector(":scope > div:last-child > :first-child");
      if (tagRow && tagRow.querySelector("figure .main-avatar-image")) tag(tagRow, "data-wa-side", "pick-hide");
    }
  }

  // ---------- tagging ----------
  function tagArtistPage() {
    const page = document.querySelector('[data-testid="artist-page"]');
    const m = Spicetify.Platform.History.location.pathname.match(/^\/artist\/([A-Za-z0-9]+)/);
    const mainView = document.querySelector(".Root__main-view");
    if (mainView && mainView.classList.contains("wa-on-artist") !== !!(page && m)) mainView.classList.toggle("wa-on-artist", !!(page && m));
    if (!page || !m) return;
    const artistId = m[1];
    tag(page, "data-wa-artist", artistId);

    const barRow = page.querySelector('[data-testid="action-bar-row"]');
    const barWrap = barRow && barRow.closest(".main-actionBar-ActionBarContainer");
    const main = barWrap && barWrap.parentElement;
    let aboutCard = null;
    if (main) {
      tag(main, "data-wa", "main");
      const first = main.firstElementChild;
      if (first && first !== barWrap && !first.querySelector("h2")) tag(first, "data-wa", "actionbg");
      const content = [...main.children].find((c) => c.classList.contains("contentSpacing"));
      if (content) {
        tag(content, "data-wa", "content");
        const isGrid = (e) => e.classList.contains("main-gridContainer-gridContainer");
        const tagSec = (sec) => {
          if (sec.classList.contains("wa-disco")) return;
          const h = sec.querySelector("h2");
          if (!h) return;
          let name = slug(h.textContent);
          if (sec.querySelector('[data-testid="saved-tracks-avatar"], [data-testid^="artist-pick"]') && !sec.querySelector(".main-trackList-trackListContainer")) name = "side";
          else if (/^featuring-/.test(name)) name = "featuring";
          tag(sec, "data-wa-sec", name);
          if (sec.tagName === "SECTION" && sec.querySelector(".main-card-imageContainer")) tag(sec, "data-wa-shelf");
          if (name !== "about") tag(sec, "data-wa-box");
        };
        // Spotify nests some blocks in grid wrappers (Popular + You Liked,
        // About + On Tour); flatten those so every block is placed on its own
        for (const sec of content.children) {
          const only = sec.children.length === 1 ? sec.firstElementChild : null;
          if (isGrid(sec)) {
            tag(sec, "data-wa", "group");
            for (const c of sec.children) tagSec(c);
          } else if (sec.tagName === "DIV" && only && isGrid(only)) {
            tag(sec, "data-wa", "group");
            tag(only, "data-wa", "group");
            for (const c of only.children) tagSec(c);
          } else {
            tagSec(sec);
          }
        }

        // Popular: always 10 rows (expand once), list sized to the rows
        const popular = content.querySelector('[data-wa-sec="popular"]');
        if (popular) {
          const more = popular.querySelector(":scope > button:last-child");
          if (more && /more/i.test(more.textContent) && !more.hasAttribute("data-wa-expanded")) {
            more.setAttribute("data-wa-expanded", "");
            more.click();
          }
          const wrap = popular.querySelector(".main-rootlist-wrapper");
          if (wrap) {
            const rows = [...wrap.children].find((c) => !/Sentinel/.test(c.className));
            if (rows) {
              tag(rows, "data-wa", "pop-rows");
              fitPopular(wrap, rows);
              if (!watchedWraps.has(wrap)) {
                watchedWraps.add(wrap);
                const refit = () => fitPopular(wrap, [...wrap.children].find((c) => !/Sentinel/.test(c.className)));
                new MutationObserver(refit).observe(wrap, { attributes: true, attributeFilter: ["style"] });
              }
              // rows change height when the window resizes (2 columns <-> 1)
              if (!watchedWraps.has(rows)) {
                watchedWraps.add(rows);
                new ResizeObserver(() => fitPopular(wrap, rows)).observe(rows);
              }
            }
          }
        }
        const side = settings.extras && content.querySelector('[data-wa-sec="side"]');
        if (side) tagSide(side);
        const sideShown = settings.extras && content.querySelector('[data-wa-sec="side"], [data-wa-sec="on-tour"]');
        content.classList.toggle("wa-pop-wide", !sideShown);
        content.classList.toggle("wa-no-tour", !content.querySelector('[data-wa-sec="on-tour"]'));

        // our discography replaces Spotify's shelf
        const spotDisco = content.querySelector('[data-wa-sec="discography"]');
        let disco = content.querySelector(".wa-disco");
        if (disco && disco.dataset.waArtist !== artistId) {
          disco.remove();
          content.classList.remove("wa-disco-ready");
          disco = null;
        }
        if (!disco && spotDisco) {
          buildDisco(artistId, spotDisco.closest('[data-wa="content"] > *') || spotDisco, content);
        }

        const about = content.querySelector('[data-wa-sec="about"]');
        if (about) {
          aboutCard = about.querySelector("button");
        }
      }
    }

    // header: profile picture when Spotify shows a banner instead, and the
    // short bio under the name ("Read full bio" opens Spotify's bio window)
    const hdrText = page.querySelector('[data-testid="entity-header"] .main-entityHeader-headerText');
    const hdrRow = hdrText && hdrText.parentElement;
    if (hdrRow && !hdrRow.querySelector(".main-entityHeader-imageContainer")) {
      let pfp = hdrRow.querySelector(".wa-pfp");
      if (!pfp || pfp.dataset.waArtist !== artistId) {
        if (pfp) pfp.remove();
        pfp = document.createElement("img");
        pfp.className = "wa-pfp";
        pfp.alt = "";
        pfp.dataset.waArtist = artistId;
        hdrRow.insertBefore(pfp, hdrRow.firstChild);
        artistAvatar(artistId).then((url) => {
          if (url) pfp.src = url; // no picture: the grey circle keeps the layout the same
        });
      }
    }
    if (hdrText) {
      let snip = hdrText.querySelector(".wa-hdr-about");
      if (!snip) {
        snip = document.createElement("button");
        snip.type = "button";
        snip.className = "wa-hdr-about";
        snip.textContent = "Read bio";
        snip.addEventListener("click", () => {
          const c = document.querySelector('[data-wa-sec="about"] button');
          if (c) c.click();
        });
        hdrText.appendChild(snip);
      }
      snip.disabled = !aboutCard;
    }

    // action buttons: Spotify's Play / Shuffle / More are restyled in place;
    // Follow is replaced by an icon button that clicks the hidden original
    if (barRow) {
      const follow = [...barRow.querySelectorAll("button:not([data-wa])")].find((b) => /^(follow|following|unfollow)$/i.test(b.textContent.trim()));
      let mine = barRow.querySelector('[data-wa="follow-btn"]');
      if (follow) {
        tag(follow, "data-wa", "follow-orig");
        if (!mine) {
          mine = iconButton("follow-btn", "Follow", ICON_FOLLOW + ICON_FOLLOWING);
          mine.addEventListener("click", () => {
            const o = barRow.querySelector('[data-wa="follow-orig"]');
            if (o) o.click();
          });
          follow.after(mine);
        }
      }
      const orig = barRow.querySelector('[data-wa="follow-orig"]');
      if (mine && orig) {
        const on = /^following$/i.test(orig.textContent.trim());
        if (on) tag(mine, "data-wa-on");
        else untag(mine, "data-wa-on");
        const label = on ? "Unfollow" : "Follow";
        if (mine.title !== label) {
          mine.title = label;
          mine.setAttribute("aria-label", label);
        }
      }
      if (!barRow.querySelector('[data-wa="wiki-btn"]')) {
        const w = iconButton("wiki-btn", "Wikipedia", ICON_WIKI);
        w.addEventListener("click", () => {
          const id = (Spicetify.Platform.History.location.pathname.match(/^\/artist\/([A-Za-z0-9]+)/) || [])[1];
          const nameEl = page.querySelector(".main-entityHeader-title");
          if (id) openWiki(id, nameEl ? nameEl.textContent.trim() : null);
        });
        const anchor = barRow.querySelector('[data-wa="follow-btn"]') || [...barRow.children].pop();
        if (anchor) anchor.after(w);
        else barRow.appendChild(w);
      }
    }
  }

  // ---------- playlist + Liked Songs pages ----------
  // Same treatment as the artist page: flat header with the cover Spotify
  // generates (or the Liked Songs heart), one outlined toolbar, small chips,
  // the track list and Recommended in outlined boxes. Song rows keep
  // Spotify's size (its list positions rows by that height).
  const listCss = `
[data-wa-list] [data-testid="entity-header"]{padding-bottom:0 !important;background:var(--spice-main,#0f0f11) !important;height:auto !important;min-height:0 !important;max-height:none !important}
[data-wa-list] [data-testid="entity-header"] > :not(.main-entityHeader-contentWrapper){display:none !important}
[data-wa-list] .main-entityHeader-contentWrapper{position:relative !important;height:auto !important;min-height:0 !important;padding-top:24px !important;padding-bottom:0 !important;margin:0 !important;display:flex !important;align-items:center !important;gap:20px;max-width:100% !important}
[data-wa-list] .main-entityHeader-contentWrapper > div:first-child:empty{display:none !important}
[data-wa-list] .main-entityHeader-imageContainer,[data-wa-list] .main-entityHeader-imageContainer [data-testid="playlist-image"],[data-wa-list] .main-entityHeader-imageContainer .main-entityHeader-image,[data-wa-list] .main-entityHeader-imageContainer img{width:120px !important;height:120px !important;min-width:120px !important;margin:0 !important;border-radius:8px !important;box-shadow:none !important}
[data-wa-list] .main-entityHeader-headerText{display:flex !important;flex-direction:column !important;justify-content:center !important;gap:2px !important;height:auto !important;min-height:120px !important;max-height:none !important;flex:1 1 auto !important;min-width:0;padding:0 !important;margin:0 !important;overflow:hidden}
[data-wa-list] .main-entityHeader-headerText > *{margin:0 !important;padding:0 !important;min-width:0;max-width:100%}
[data-wa-list] .main-entityHeader-headerText > span:first-child{font-size:13px !important;line-height:20px !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-list] .main-entityHeader-title,[data-wa-list] .main-entityHeader-title > *{display:block !important;height:48px !important;max-height:48px !important;padding:0 !important;margin:0 !important;overflow:hidden !important;text-align:left !important}
[data-wa-list] .main-entityHeader-title *{font-size:40px !important;line-height:48px !important;white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;max-height:48px !important;letter-spacing:-.01em;-webkit-line-clamp:unset !important}
[data-wa-list] .main-entityHeader-headerText > :not(span):not(.main-entityHeader-metaData){font-size:13px !important;line-height:20px !important;max-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-list] .main-entityHeader-headerText > :not(span):not(.main-entityHeader-metaData) *{font-size:13px !important;line-height:20px !important}
[data-wa-list] .main-entityHeader-headerText > *{flex:none !important;min-height:20px}
[data-wa-list] .main-entityHeader-headerText > button{align-self:flex-start;height:20px !important;padding:0 !important;background:transparent !important;font-size:12px !important;color:var(--spice-subtext,#b3b3b3) !important;text-align:left}
[data-wa-list] .main-entityHeader-headerText > button:hover{color:var(--spice-text,#fff) !important}
[data-wa-list] .main-entityHeader-metaData{height:20px !important;margin-top:2px !important;font-size:13px !important;flex-wrap:nowrap !important;overflow:hidden}
[data-wa-list] .main-entityHeader-metaData *{font-size:13px !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-list] .main-entityHeader-metaData > span:not([data-testid]){display:none !important}
[data-wa-list] .main-entityHeader-metaData > span[data-testid="release-date"]::before{content:"•";margin:0 4px}
[data-wa-list] [data-wa="shelf-wrap"]{padding-top:0 !important;margin-top:0 !important;min-height:0 !important}
[data-wa-list] .main-entityHeader-creatorWrapper span,[data-wa-list] .main-entityHeader-creatorWrapper a{color:var(--spice-text,#fff) !important}
/* Spotify shows its sticky title bar by how close the title is to the top;
   with the shorter header that would be immediately, so wait for a real scroll */
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile):not(.wa-scrolled) .main-topBar-topbarContentWrapper{opacity:0 !important;pointer-events:none !important}
.Root__main-view:is(.wa-on-artist,.wa-on-list,.wa-on-home,.wa-on-profile):not(.wa-scrolled) .main-topBar-background{opacity:0 !important}

[data-wa-list] [data-wa="actionbg"],[data-wa-list] .playlist-playlist-actionBarBackground-background{display:none !important}
[data-wa-list] .playlist-playlist-playlistContent{background:var(--spice-main,#0f0f11) !important}

/* toolbar: one outlined bar, equal icon buttons; search and sort on the right */
[data-wa-list] [data-testid="action-bar"]{padding-top:12px !important;padding-bottom:10px !important;min-height:0 !important}
[data-wa-list] [data-testid="action-bar-row"]{display:flex !important;align-items:center !important;gap:2px !important;width:auto !important;height:auto !important;min-height:0 !important;padding:4px !important;border:1px solid var(--spice-misc,#2a2930);border-radius:11px;background:var(--spice-main,#0f0f11)}
[data-wa-list] [data-testid="action-bar-row"] > *{margin:0 !important}
[data-wa-list] [data-testid="action-bar-row-actions"]{display:contents !important}
[data-wa-list] [data-testid="action-bar-row"] [data-testid="watch-feed-entity-button"]{display:none !important}
[data-wa-list] [data-testid="action-bar-row"] > button,[data-wa-list] [data-testid="action-bar-row-actions"] > button,[data-wa-list] [data-testid="action-bar-row-actions"] > * > button,
[data-wa-list] [data-testid="action-bar-row"] .main-playButton-PlayButton,[data-wa-list] [data-testid="action-bar-row"] .main-actionBar-ActionBarPlayButtonContainer,[data-wa-list] [data-testid="action-bar-row"] .main-playButton-PlayButton button{width:32px !important;height:32px !important;min-width:32px !important;min-height:0 !important;inline-size:32px !important;block-size:32px !important;padding:0 !important;margin:0 !important;border:0 !important;border-radius:8px !important;background:transparent !important;display:grid !important;place-items:center !important;color:var(--spice-subtext,#b3b3b3) !important;transform:none !important;box-shadow:none !important}
[data-wa-list] [data-testid="action-bar-row"] button > span{min-block-size:0 !important;padding:0 !important;background:transparent !important;color:inherit !important;transform:none !important;box-shadow:none !important}
[data-wa-list] [data-testid="action-bar-row"] .main-playButton-PlayButton button > span{width:32px !important;height:32px !important;block-size:32px !important;inline-size:32px !important;display:grid !important;place-items:center !important}
[data-wa-list] [data-testid="action-bar-row"] button:hover{background:rgba(255,255,255,.07) !important;color:var(--spice-text,#fff) !important}
[data-wa-list] [data-testid="action-bar-row"] svg{width:16px !important;height:16px !important;fill:currentColor}
[data-wa-list] [data-testid="action-bar-row"] .main-playButton-PlayButton button,[data-wa-list] [data-testid="action-bar-row"] .main-playButton-PlayButton svg{color:var(--spice-text,#fff) !important;fill:var(--spice-text,#fff) !important}
[data-wa-list] [data-testid="action-bar-row"] button[aria-checked="true"],[data-wa-list] [data-testid="action-bar-row"] button[aria-pressed="true"]{color:var(--spice-button-active,#1ed760) !important}
[data-wa-list] [data-testid="action-bar-row"] button::after{display:none !important}
[data-wa-list] [data-testid="action-bar-row-trailing"]{display:flex !important;align-items:center !important;margin-left:auto !important;width:auto !important;height:32px !important;flex:0 1 auto !important;min-width:0}
[data-wa-list] [data-testid="action-bar-row-trailing"] > *{width:auto !important;height:32px !important;display:flex !important;align-items:center !important;gap:2px !important;margin:0 !important;padding:0 !important}
[data-wa-list] [data-testid="action-bar-row-trailing"] button{width:auto !important;min-width:32px !important;height:32px !important;inline-size:auto !important;padding:0 8px !important;font-size:12px !important;gap:6px;display:inline-flex !important;align-items:center !important}
[data-wa-list] [data-testid="action-bar-row-trailing"] input{font-size:12px !important;height:28px !important}

/* chips: Add / Mix / Name & details, or Liked Songs' filter tags */
[data-wa-list] [data-wa="chips"]{padding-top:0 !important;padding-bottom:10px !important;height:auto !important;min-height:0 !important}
[data-wa-list] [data-wa="chips"] *{min-height:0 !important}
[data-wa-list] [data-wa="chips"] > *,[data-wa-list] [data-wa="chips"] > * > *,[data-wa-list] [data-wa="chips"] > * > * > *{height:auto !important;margin-top:0 !important;margin-bottom:0 !important;padding-top:0 !important;padding-bottom:0 !important}
[data-wa-list] [data-wa="chips"] button,[data-wa-list] [data-wa="chips"] [role="option"] > *,[data-wa-list] [data-wa="chips"] [role="option"]{height:auto !important;block-size:auto !important}
[data-wa-list] [data-wa="chips"] button > span,[data-wa-list] [data-wa="chips"] [role="option"] span,[data-wa-list] [data-wa="chips"] button[data-wa-plain]{padding:3px 10px !important;min-block-size:0 !important;font-size:12px !important;line-height:1.4 !important;border-radius:999px !important;background:transparent !important;border:1px solid var(--spice-misc,#2a2930) !important;color:var(--spice-text,#fff) !important;box-shadow:none !important}
[data-wa-list] [data-wa="chips"] button:hover > span,[data-wa-list] [data-wa="chips"] [role="option"]:hover span{background:rgba(255,255,255,.07) !important}
[data-wa-list] [data-wa="chips"] [aria-selected="true"] span,[data-wa-list] [data-wa="chips"] [aria-checked="true"] span{background:var(--spice-text,#fff) !important;color:var(--spice-main,#0f0f11) !important;border-color:var(--spice-text,#fff) !important}
[data-wa-list] [data-wa="chips"] svg{width:12px !important;height:12px !important}
[data-wa-list] [data-wa="chips"] button > span{display:inline-flex !important;align-items:center !important;gap:5px !important}
[data-wa-list] [data-wa="chips"] .e-10860-button__icon-wrapper{position:static !important;inset:auto !important;transform:none !important;margin:0 !important;padding:0 !important;border:0 !important;background:transparent !important;width:12px !important;height:12px !important}

/* track list + Recommended in outlined boxes */
[data-wa-list] [data-wa="tracks"]{border:1px solid var(--spice-misc,#2a2930);border-radius:10px;padding:0 4px 4px;margin-bottom:8px !important}
[data-wa-list] [data-wa="tracks"] .main-trackList-trackListHeader{background:var(--spice-main,#0f0f11) !important;border-radius:10px 10px 0 0;margin:0 -4px !important;padding:0 4px !important;box-shadow:none !important}
[data-wa-list] [data-wa="tracks"] .main-trackList-trackListHeaderRow{height:32px !important;min-height:0 !important;border-bottom:1px solid var(--spice-misc,#2a2930) !important;margin-bottom:6px !important}
[data-wa-list] [data-wa="tracks"] .main-trackList-trackListHeaderRow *{font-size:12px !important}
[data-wa-list] [data-wa="tracks"] ~ div:not([data-testid]) p{font-size:11px !important;line-height:1.5 !important;color:var(--spice-subtext,#b3b3b3) !important;margin:0 !important}
[data-wa-list] [data-wa="tracks"] ~ div:not([data-testid]){margin:4px 4px 12px !important;padding:0 !important;height:auto !important;min-height:0 !important}
[data-wa-list] [data-wa="tracks"] ~ div:not([data-testid]) button{background:transparent !important;border:1px solid var(--spice-misc,#2a2930) !important;border-radius:999px !important;padding:3px 10px !important;height:auto !important;color:var(--spice-text,#fff) !important;font-size:12px !important;gap:4px}
[data-wa-list] [data-wa="tracks"] ~ div:not([data-testid]) button:hover{background:rgba(255,255,255,.07) !important}
[data-wa-list] [data-wa="tracks"] ~ div:not([data-testid]) button *{font-size:12px !important}
[data-wa-list] [data-wa="tracks"] ~ div:not([data-testid]) button svg{width:12px !important;height:12px !important}
[data-wa-list] section.Shelf{padding:10px 10px 8px !important;margin:0 0 12px !important;min-height:0 !important}
[data-wa-list] section.Shelf > :first-child,[data-wa-list] section.Shelf > :first-child *{min-height:0 !important}
[data-wa-list] section.Shelf > :first-child{margin:0 0 6px !important;padding:0 2px !important}
[data-wa-list] section.Shelf > :first-child > *{margin:0 !important}
[data-wa-list] section.Shelf h2{font-size:16px !important;line-height:1.25 !important}
[data-wa-list] section.Shelf > :first-child a span{font-size:12px !important}
[data-wa-list] section.Shelf:not([data-wa-shelf]) .main-gridContainer-gridContainer{grid-template-rows:none !important}
[data-wa-list] .playlist-playlist-findMoreButton{display:block !important;margin:0 0 12px auto !important;padding:2px 6px !important;height:auto !important}
[data-wa-list] .playlist-playlist-findMoreButton *{font-size:12px !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-list] .playlist-playlist-findMoreButton:hover *{color:var(--spice-text,#fff) !important}
[data-wa-list] [data-testid="recommended-track"]{border:1px solid var(--spice-misc,#2a2930);border-radius:10px;padding:10px 4px 6px;margin:0 0 24px !important}
[data-wa-list] [data-testid="recommended-track"] > *{margin:0 !important;padding:0 !important;row-gap:4px !important}
[data-wa-list] [data-testid="recommended-track"] .playlist-playlist-sectionTitleWrapper{padding:0 8px !important;margin:0 0 4px !important;height:auto !important;min-height:0 !important}
[data-wa-list] [data-testid="recommended-track"] .playlist-playlist-sectionTitleWrapper *{margin:0 !important;min-height:0 !important}
[data-wa-list] [data-testid="recommended-track"] .playlist-playlist-sectionTitleWrapper h2,[data-wa-list] [data-testid="recommended-track"] .playlist-playlist-sectionTitleWrapper [class*="title"]{font-size:16px !important;line-height:1.25 !important}
[data-wa-list] [data-testid="recommended-track"] .playlist-playlist-sectionTitleWrapper p,[data-wa-list] [data-testid="recommended-track"] .playlist-playlist-sectionTitleWrapper [class*="subtitle"]{font-size:12px !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-list] [data-testid="recommended-track"] button[data-testid="add-to-playlist-button"]{min-block-size:0 !important;block-size:auto !important;height:24px !important;padding:0 10px !important;font-size:12px !important;line-height:22px !important;border-radius:999px !important;background:transparent !important;border:1px solid var(--spice-misc,#2a2930) !important;box-shadow:none !important;color:var(--spice-text,#fff) !important;transform:none !important}
[data-wa-list] [data-testid="recommended-track"] button[data-testid="add-to-playlist-button"]:hover{background:rgba(255,255,255,.07) !important}
[data-wa-list] [data-testid="recommended-track"] > * > button:last-child{justify-self:end;height:auto !important;min-block-size:0 !important;padding:4px 8px !important;margin:2px 4px 0 auto !important;font-size:12px !important;display:block !important}
[data-wa-list] [data-testid="recommended-track"] > * > button:last-child *{font-size:12px !important}
`;
  let menuCss = `
/* popup menus (song "...", sort, profile, submenus like Add to playlist) */
[data-tippy-root] [role="menu"],#context-menu [role="menu"]{background:var(--spice-main,#0f0f11) !important;border:1px solid var(--spice-misc,#2a2930) !important;border-radius:10px !important;padding:4px !important;box-shadow:0 12px 32px rgba(0,0,0,.55) !important;color:var(--spice-text,#fff) !important}
[data-tippy-root] [role="menu"] [role="menuitem"],[data-tippy-root] [role="menu"] [role="menuitemradio"],[data-tippy-root] [role="menu"] [role="menuitemcheckbox"]{min-height:0 !important;height:32px !important;padding:0 10px !important;border-radius:6px !important;background:transparent !important;color:var(--spice-text,#fff) !important;gap:10px}
[data-tippy-root] [role="menu"] [role="menuitem"]:hover,[data-tippy-root] [role="menu"] [role="menuitem"]:focus-visible,[data-tippy-root] [role="menu"] [role="menuitem"][aria-expanded="true"],[data-tippy-root] [role="menu"] [role="menuitemradio"]:hover,[data-tippy-root] [role="menu"] [role="menuitemcheckbox"]:hover{background:rgba(255,255,255,.07) !important;text-decoration:none !important}
[data-tippy-root] [role="menu"] [role="menuitem"] span,[data-tippy-root] [role="menu"] [role="menuitemradio"] span,[data-tippy-root] [role="menu"] [role="menuitemcheckbox"] span{font-size:13px !important}
[data-tippy-root] [role="menu"] svg{color:var(--spice-subtext,#b3b3b3);fill:currentColor}
[data-tippy-root] [role="menu"] [role="menuitem"]:hover svg{color:var(--spice-text,#fff)}
[data-tippy-root] [role="menu"] [aria-checked="true"],[data-tippy-root] [role="menu"] [aria-checked="true"] *{color:var(--spice-button-active,#1ed760) !important}
[data-tippy-root] [role="menu"] [aria-disabled="true"],[data-tippy-root] [role="menu"] [disabled]{opacity:.45}
[data-tippy-root] [role="menu"] hr,[data-tippy-root] [role="menu"] [role="separator"]{border:0 !important;border-top:1px solid var(--spice-misc,#2a2930) !important;margin:4px 6px !important;height:0 !important;background:none !important}
[data-tippy-root] [role="menu"] input{background:transparent !important;border:1px solid var(--spice-misc,#2a2930) !important;border-radius:8px !important;color:var(--spice-text,#fff) !important;box-shadow:none !important;font-size:13px !important}
[data-tippy-root] [role="menu"] input:focus{border-color:var(--spice-subtext,#b3b3b3) !important}
[data-tippy-root] [role="menu"] [role="heading"],[data-tippy-root] [role="menu"] h1,[data-tippy-root] [role="menu"] h2,[data-tippy-root] [role="menu"] h3{font-size:11px !important;color:var(--spice-subtext,#b3b3b3) !important}
/* selected song rows: a soft highlight instead of Spotify's bright grey */
[role="row"][aria-selected="true"] > .main-trackList-trackListRow{background-color:rgba(255,255,255,.1) !important}
[role="row"][aria-selected="true"] > .main-trackList-trackListRow:hover{background-color:rgba(255,255,255,.14) !important}
/* tooltips */
[data-tippy-root] [role="tooltip"],.main-contextMenu-tippy{background:var(--spice-main,#0f0f11) !important;color:var(--spice-text,#fff) !important;border:1px solid var(--spice-misc,#2a2930) !important;border-radius:8px !important;box-shadow:0 8px 24px rgba(0,0,0,.5) !important}
`;
  // DJ in black and white: Spotify paints the DJ's narration (panel, player
  // bar button, artwork) with blue/green colours from the DJ's data, set
  // inline at runtime; override those with the theme's colours.
  const djCss = `
[data-wa-dj-panel]{--dj-narration-background:var(--spice-main,#0f0f11) !important;background:var(--spice-main,#0f0f11) !important}
[data-wa-dj-panel] *{--dj-narration-background:var(--spice-main,#0f0f11) !important}
/* the animated green visual is hidden (no drawing cost) and replaced by a
   static white DJ mark in an outlined square */
[data-wa-dj-panel] canvas{display:none !important}
[data-wa-dj-panel] [data-wa-dj-art]{background:var(--spice-main,#0f0f11) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='white' d='M7.813 14.497A6.5 6.5 0 0 1 1.5 8.016c.008-3.553 2.71-5.744 5.043-6.078.85-.121 1.288.037 1.564.246.312.238.553.639.822 1.276q.115.277.239.602c.451 1.167 1.05 2.717 2.505 3.81 1.01.76 1.46 1.529 1.592 2.209.13.679-.037 1.375-.468 2.03-.88 1.34-2.793 2.388-4.844 2.388zm-.037 1.5A8 8 0 1 0 0 8.032c0 4.34 3.464 7.87 7.776 7.965m6.666-7.124c-.358-.788-.979-1.532-1.868-2.2-1.082-.813-1.51-1.9-1.967-3.06a31 31 0 0 0-.296-.736 6.3 6.3 0 0 0-.605-1.151 6.53 6.53 0 0 1 4.39 4.01 6.5 6.5 0 0 1 .346 3.137'/%3E%3C/svg%3E") center / 38% no-repeat !important;border:1px solid var(--spice-misc,#2a2930) !important;border-radius:12px !important;box-sizing:border-box}
[data-wa-dj-panel] div{background:transparent !important}
[data-wa-dj-btn]{background:var(--spice-text,#fff) !important;outline-color:var(--spice-text,#fff) !important;border-color:var(--spice-text,#fff) !important}
[data-wa-dj-btn] svg{color:var(--spice-main,#0f0f11) !important;fill:var(--spice-main,#0f0f11) !important}
.main-nowPlayingBar-extraControls .dj-button{background:transparent !important}
html.wa-dj-talking [data-testid="now-playing-bar"] .main-nowPlayingBar-left img,
html.wa-dj-talking [data-testid="now-playing-widget"] img{filter:grayscale(1) contrast(1.1) !important}
`;
  // Now Playing panel (right side): outlined boxes instead of grey fills,
  // theme headings and pill buttons. Spicy Lyrics' own card is left alone.
  const npvCss = `
.main-nowPlayingView-container aside,.main-nowPlayingView-container aside > div{background:var(--spice-main,#0f0f11) !important}
.main-nowPlayingView-container aside > div > :first-child{padding:14px 16px 10px !important}
.main-nowPlayingView-container aside > div > :first-child a,.main-nowPlayingView-container aside > div > :first-child a *{font-size:14px !important;font-weight:700 !important;color:var(--spice-text,#fff) !important}
.main-nowPlayingView-container [data-testid="cover-art-slot"],.main-nowPlayingView-container [data-testid="cover-art-slot"] img{border-radius:12px !important;overflow:hidden}
.main-nowPlayingView-container [data-testid="cover-art-slot"]{box-shadow:none !important}
.main-nowPlayingView-container div > .main-trackInfo-overlay:first-child:not(:only-child) :is(a,span){font-size:24px !important;line-height:1.25 !important;letter-spacing:-.01em}
.main-nowPlayingView-container div > .main-trackInfo-overlay:first-child + div :is(a,span){font-size:15px !important;color:var(--spice-subtext,#b3b3b3) !important}
.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard):not(#SpicyLyricsNPVCard *){background:transparent !important;border:1px solid var(--spice-misc,#2a2930) !important;border-radius:12px !important;box-shadow:none !important}
/* About the artist: keep the photo, drop the grey fills behind the text, theme type */
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist{overflow:hidden !important}
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist *{background-color:transparent !important}
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist > div{border-radius:12px !important}
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist a[href*="/artist/"]{font-size:16px !important;font-weight:700 !important;color:var(--spice-text,#fff) !important}
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist span{color:var(--spice-subtext,#b3b3b3) !important}
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist .encore-text-body-small{font-size:14px !important;line-height:1.55 !important}
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist button{border:1px solid var(--spice-misc,#2a2930) !important;background:transparent !important;color:var(--spice-text,#fff) !important;box-shadow:none !important;font-size:12px !important}
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist button:hover{background:rgba(255,255,255,.07) !important;transform:none !important}
.main-nowPlayingView-container .main-nowPlayingView-aboutArtist button > span{background:transparent !important;color:inherit !important}
.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) h2{font-size:16px !important;font-weight:700 !important;color:var(--spice-text,#fff) !important}
.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) .e-10860-legacy-button-secondary,
.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) button[class*="secondary"]{border:1px solid var(--spice-misc,#2a2930) !important;background:transparent !important;color:var(--spice-text,#fff) !important;box-shadow:none !important;font-size:12px !important}
.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) .e-10860-legacy-button-secondary:hover{background:rgba(255,255,255,.07) !important;transform:none !important}
.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) button[class*="tertiary"]:not([aria-label]) ,.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) a[href*="queue"]{color:var(--spice-subtext,#b3b3b3) !important;font-size:12px !important}
.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) [role="row"],.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) .e-10860-legacy-box--interactive{border-radius:8px !important}
.main-nowPlayingView-container :is(section,.main-nowPlayingView-section):not(#SpicyLyricsNPVCard *) .e-10860-legacy-box--interactive:hover{background:rgba(255,255,255,.06) !important}
`;
  const npvStyle = document.createElement("style");
  npvStyle.id = "wiki-about-npv";
  npvStyle.textContent = npvCss;
  document.head.appendChild(npvStyle);

  const djStyle = document.createElement("style");
  djStyle.id = "wiki-about-dj";
  djStyle.textContent = djCss;
  document.head.appendChild(djStyle);
  // Mark the DJ's narration panel and player-bar button (Spotify colours them
  // with inline styles). A one-off query per song change is far cheaper than
  // [style*=...] CSS selectors, which re-run on every inline-style change.
  const djCheck = () => {
    const panel = document.querySelector('.Root__right-sidebar [style*="--dj-narration-background"]');
    document.querySelectorAll("[data-wa-dj-panel]").forEach((e) => e !== panel && e.removeAttribute("data-wa-dj-panel"));
    if (panel) {
      panel.setAttribute("data-wa-dj-panel", "");
      const canvas = panel.querySelector("canvas");
      if (canvas && canvas.parentElement) canvas.parentElement.setAttribute("data-wa-dj-art", "");
    }
    document.documentElement.classList.toggle("wa-dj-talking", !!panel);
    const btn = document.querySelector('.main-nowPlayingBar-extraControls button[style*="rgb(10, 89, 184)"]');
    document.querySelectorAll("[data-wa-dj-btn]").forEach((e) => e !== btn && e.removeAttribute("data-wa-dj-btn"));
    if (btn) btn.setAttribute("data-wa-dj-btn", "");
  };
  const djSoon = () => [50, 400, 1200, 3000].forEach((ms) => setTimeout(djCheck, ms));
  Spicetify.Player.addEventListener("songchange", djSoon);
  Spicetify.Player.addEventListener("onplaypause", djSoon);
  djCheck();

  const menuStyle = document.createElement("style");
  menuStyle.id = "wiki-about-menus";
  menuStyle.textContent = menuCss;
  document.head.appendChild(menuStyle);

  const listStyle = document.createElement("style");
  listStyle.id = "wiki-about-list-page";
  listStyle.textContent = listCss;
  document.head.appendChild(listStyle);

  let scrollNode = null;
  const onMainScroll = () => {
    const mv = document.querySelector(".Root__main-view");
    if (!mv || !scrollNode) return;
    const past = scrollNode.scrollTop > 150;
    if (mv.classList.contains("wa-scrolled") !== past) mv.classList.toggle("wa-scrolled", past);
  };
  function watchScroll() {
    const page = document.querySelector('[data-wa-artist], [data-wa-list], [data-wa-home-wrap], [data-wa-profile]');
    if (page && scrollNode && scrollNode.isConnected && scrollNode.contains(page)) return; // same page, nothing to do
    let n = page;
    while (n && !(n.scrollHeight > n.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(n).overflowY))) n = n.parentElement;
    if (n && n !== scrollNode) {
      if (scrollNode) scrollNode.removeEventListener("scroll", onMainScroll);
      scrollNode = n;
      scrollNode.addEventListener("scroll", onMainScroll, { passive: true });
    }
    onMainScroll();
  }

  // ---------- profile pages ----------
  // Same header as the other pages (120px round picture, name, meta), one
  // outlined toolbar, and each row of artists/playlists in an outlined box
  // with round artist pictures and no grey card fills.
  const profileCss = `
[data-wa-profile] [data-testid="entity-header"]{background:var(--spice-main,#0f0f11) !important;height:auto !important;min-height:0 !important;max-height:none !important;padding-bottom:0 !important}
[data-wa-profile] [data-testid="entity-header"] > :not(.main-entityHeader-contentWrapper){display:none !important}
[data-wa-profile] .main-entityHeader-contentWrapper{height:auto !important;min-height:0 !important;padding-top:24px !important;padding-bottom:0 !important;margin:0 !important;display:flex !important;align-items:center !important;gap:20px}
[data-wa-profile] .main-entityHeader-contentWrapper > div:first-child:empty{display:none !important}
[data-wa-profile] .main-entityHeader-imageContainer,[data-wa-profile] .main-entityHeader-imageContainer *{width:120px !important;height:120px !important;min-width:120px !important;margin:0 !important;border-radius:50% !important;box-shadow:none !important}
[data-wa-profile] .main-entityHeader-imageContainer img{object-fit:cover}
[data-wa-profile] .main-entityHeader-headerText{height:auto !important;min-height:120px !important;justify-content:center !important;gap:2px !important;padding:0 !important}
[data-wa-profile] .main-entityHeader-headerText > *{margin:0 !important;padding:0 !important}
[data-wa-profile] .main-entityHeader-headerText > span:first-child{font-size:13px !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-profile] .main-entityHeader-title,[data-wa-profile] .main-entityHeader-title *{font-size:40px !important;line-height:48px !important;max-height:48px !important;white-space:nowrap !important;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em;padding:0 !important}
[data-wa-profile] .main-entityHeader-metaData,[data-wa-profile] .main-entityHeader-metaData *{font-size:13px !important;color:var(--spice-subtext,#b3b3b3) !important}
/* bullets only between items, never before the first one */
[data-wa-profile] .main-entityHeader-metaData > span{display:none !important}
[data-wa-profile] .main-entityHeader-metaData > :not(span) ~ :not(span)::before{content:"•";margin:0 6px}
[data-wa-profile] [data-wa="actionbg"]{display:none !important}
[data-wa-profile] [data-wa="profile-main"]{background:var(--spice-main,#0f0f11) !important}
[data-wa-profile] [data-testid="action-bar"]{padding-top:12px !important;padding-bottom:12px !important;min-height:0 !important}
[data-wa-profile] [data-testid="action-bar-row"]{display:inline-flex !important;align-items:center !important;gap:2px !important;width:auto !important;height:auto !important;min-height:0 !important;padding:4px !important;border:1px solid var(--spice-misc,#2a2930);border-radius:11px}
[data-wa-profile] [data-testid="action-bar-row"] > *{margin:0 !important}
[data-wa-profile] [data-testid="action-bar-row"] button{width:32px !important;height:32px !important;min-width:32px !important;min-block-size:0 !important;padding:0 !important;border:0 !important;border-radius:8px !important;background:transparent !important;display:grid !important;place-items:center !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-profile] [data-testid="action-bar-row"] button:hover{background:rgba(255,255,255,.07) !important;color:var(--spice-text,#fff) !important}
[data-wa-profile] [data-testid="action-bar-row"] button[data-wa-plain]{width:auto !important;padding:0 12px !important;font-size:12px !important;color:var(--spice-text,#fff) !important}
[data-wa-profile] [data-testid="action-bar-row"] svg{width:16px !important;height:16px !important}
[data-wa-profile] [data-wa="profile-content"]{display:flex !important;flex-direction:column !important;gap:12px !important;padding-bottom:28px !important}
[data-wa-profile] [data-wa="profile-content"] > section{border:1px solid var(--spice-misc,#2a2930) !important;border-radius:10px !important;padding:10px 6px 6px !important;margin:0 !important;min-height:0 !important}
[data-wa-profile] [data-wa="profile-content"] > section > :first-child,[data-wa-profile] [data-wa="profile-content"] > section > :first-child *{min-height:0 !important}
[data-wa-profile] [data-wa="profile-content"] > section > :first-child{margin:0 0 6px !important;padding:0 6px !important}
[data-wa-profile] [data-wa="profile-content"] > section > :first-child > *{margin:0 !important}
[data-wa-profile] [data-wa="profile-content"] h2{font-size:16px !important;line-height:1.25 !important}
[data-wa-profile] [data-wa="profile-content"] > section > :first-child a span{font-size:13px !important;font-weight:700 !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-profile] [data-wa="profile-content"] > section > :first-child p{font-size:12px !important}
[data-wa-profile] [data-wa="profile-content"] .main-gridContainer-gridContainer{display:grid !important;grid-template-columns:repeat(auto-fill,minmax(172px,1fr)) !important;grid-template-rows:auto !important;grid-auto-rows:0 !important;row-gap:0 !important;column-gap:8px !important;overflow:hidden !important;padding:0 !important;margin:0 !important;width:auto !important}
[data-wa-profile] [data-wa="profile-content"] .main-gridContainer-gridContainer > *{overflow:hidden !important;min-width:0 !important}
[data-wa-profile] [data-wa="profile-content"] .e-10860-legacy-box--interactive{border:0 !important;background:transparent !important;box-shadow:none !important;border-radius:12px !important;padding:8px 8px 12px !important;gap:12px !important}
[data-wa-profile] [data-wa="profile-content"] .e-10860-legacy-box--interactive:hover{background:rgba(255,255,255,.06) !important}
[data-wa-profile] [data-wa="profile-content"] .main-card-imageContainer{width:100% !important;aspect-ratio:1 !important;height:auto !important;margin:0 !important;padding:0 !important}
[data-wa-profile] [data-wa="profile-content"] .main-card-imageContainer > :first-child{width:100% !important;height:100% !important;padding:0 !important;box-shadow:none !important;border-radius:10px !important;overflow:hidden}
[data-wa-profile] [data-wa="profile-content"] .main-card-imageContainer img{position:absolute;inset:0;width:100% !important;height:100% !important;object-fit:cover}
[data-wa-profile] [data-wa="profile-content"] .main-card-imageContainer > .main-cardImage-circular,[data-wa-profile] [data-wa="profile-content"] .main-card-imageContainer .main-cardImage-circular img{border-radius:50% !important}
[data-wa-profile] [data-wa="profile-content"] .main-card-PlayButtonContainer button > span{background:var(--spice-text,#fff) !important;color:var(--spice-main,#0f0f11) !important}
[data-wa-profile] [data-wa="profile-content"] .main-card-PlayButtonContainer svg{fill:var(--spice-main,#0f0f11) !important}
[data-wa-profile] [data-wa="profile-content"] .main-cardImage-circular ~ .main-card-PlayButtonContainer{top:4px !important;bottom:auto !important;right:4px !important}
[data-wa-profile] [data-wa="profile-content"] .e-10860-card-title,[data-wa-profile] [data-wa="profile-content"] .e-10860-card-title *{font-size:15px !important;font-weight:700 !important}
[data-wa-profile] [data-wa="profile-content"] .e-10860-card__column > :not(:first-child) *{font-size:13px !important;color:var(--spice-subtext,#b3b3b3) !important}
`;
  const profileStyle = document.createElement("style");
  profileStyle.id = "wiki-about-profile";
  profileStyle.textContent = profileCss;
  document.head.appendChild(profileStyle);

  function tagProfilePage() {
    const onProfile = /^\/user\/[^/]+\/?$/.test(Spicetify.Platform.History.location.pathname);
    const mainView = document.querySelector(".Root__main-view");
    if (mainView && mainView.classList.contains("wa-on-profile") !== onProfile) mainView.classList.toggle("wa-on-profile", onProfile);
    if (!onProfile) return;
    const h = document.querySelector('.Root__main-view [data-testid="entity-header"]');
    if (!h) return;
    const inner = h.parentElement;
    const page = inner && inner.parentElement && inner.parentElement.tagName === "SECTION" ? inner.parentElement : inner;
    if (!page) return;
    tag(page, "data-wa-profile");
    for (const b of page.querySelectorAll('[data-testid="action-bar-row"] button')) if (!b.querySelector("svg")) tag(b, "data-wa-plain");
    tag(inner, "data-wa", "profile-main");
    for (const c of inner.children) {
      if (c === h) continue;
      if (c.querySelector('[data-testid="action-bar"]')) continue;
      if (c.classList.contains("contentSpacing")) tag(c, "data-wa", "profile-content");
      else if (!c.hasAttribute("data-wa") && !c.querySelector("h2") && getComputedStyle(c).backgroundImage !== "none") tag(c, "data-wa", "actionbg");
    }
  }

  function tagListPage() {
    // playlists, albums and Liked Songs are "playlist-page"/"album-page" sections;
    // other track-list pages (Local Files, ...) are the entity header's wrapper
    let page = document.querySelector('.Root__main-view section:is([data-testid="playlist-page"], [data-testid="album-page"])');
    if (!page) {
      const h = document.querySelector('.Root__main-view [data-testid="entity-header"]');
      const wrap = h && !h.closest('[data-testid="artist-page"]') ? h.parentElement : null;
      if (wrap && wrap.querySelector(".main-trackList-trackListContainer")) page = wrap;
    }
    const mainView = document.querySelector(".Root__main-view");
    if (mainView && mainView.classList.contains("wa-on-list") !== !!page) mainView.classList.toggle("wa-on-list", !!page);
    if (!page) return;
    tag(page, "data-wa-list");
    const row = page.querySelector('[data-testid="action-bar-row"]');
    const abc = row && row.closest(".main-actionBar-ActionBarContainer");
    if (abc) {
      // the coloured band behind the toolbar (Liked Songs keeps it beside the toolbar)
      const prev = abc.previousElementSibling;
      if (prev && !prev.hasAttribute("data-wa") && !prev.querySelector("h1, h2, [data-testid]") && getComputedStyle(prev).backgroundImage !== "none") tag(prev, "data-wa", "actionbg");
      // the chips row is the block right after the toolbar, before the list
      let next = abc.nextElementSibling;
      if (next && !next.querySelector(".main-trackList-trackListContainer")) tag(next, "data-wa", "chips");
      else if (!next) {
        const outer = abc.parentElement && abc.parentElement.nextElementSibling;
        if (outer && !outer.querySelector(".main-trackList-trackListContainer")) tag(outer, "data-wa", "chips");
      }
    }
    const chips = page.querySelector('[data-wa="chips"]');
    if (chips) for (const b of chips.querySelectorAll("button")) if (!b.querySelector(":scope > span")) tag(b, "data-wa-plain");
    for (const c of page.querySelectorAll(".main-trackList-trackListContainer")) {
      if (!c.closest('[data-testid="recommended-track"]')) tag(c, "data-wa", "tracks");
    }
    // album footer shelves (Merch, More by ...): same library-style rows as the artist page
    for (const sec of page.querySelectorAll("section.Shelf")) {
      const w = sec.parentElement;
      if (w) tag(w, "data-wa", "shelf-wrap");
      if (w && w.parentElement && w.parentElement.classList.contains("contentSpacing")) tag(w.parentElement, "data-wa", "shelf-wrap");
      tag(sec, "data-wa-box");
      if (sec.querySelector(".main-card-imageContainer")) tag(sec, "data-wa-shelf");
    }
  }

  // ---------- home page ----------
  // Layout (top to bottom): a tile block with a big Liked
  // Songs tile beside your shortcuts and the DJ; Recents with the biggest
  // cards; "Quick picks" (recent likes as compact
  // song rows); New release beside Made For; a few more rows; everything else
  // folded under "More for you". Sections have no outlines, just space and
  // headings. Quick picks and the number of rows are paintbrush settings.
  const DJ_URI = "spotify:playlist:37i9dQZF1EYkqdzj48dyYq";
  const homeCss = `
[data-wa-home-wrap] > [data-wa="home-bg"]{display:none !important}
/* chips stay at the top of the page instead of following the scroll on a black bar */
[data-wa-home-wrap] [data-wa="home-chipbar"] > :first-child{display:none !important}
[data-wa-home-wrap] [data-wa="home-chipbar"]{position:relative !important;top:auto !important;height:auto !important;min-height:0 !important;background:transparent !important}
[data-wa-home-wrap] [data-wa="home-chipbar"] > :last-child{padding-top:14px !important;padding-bottom:6px !important}
[data-wa-home-wrap] [data-wa="home-chipbar"] [role="list"]{gap:8px !important;padding:0 8px !important;margin:0 !important;height:auto !important}
[data-wa-home-wrap] [data-wa="home-chipbar"] [role="list"] button{height:auto !important;margin:0 !important;padding:0 !important;background:transparent !important}
/* Spotify tucks sub-filters (e.g. "Following" under Music) behind the selected chip with a negative margin; show them as normal chips instead */
[data-wa-home-wrap] [data-wa="home-chipbar"] [role="list"] > * > *{margin:0 !important;transform:none !important}
[data-wa-home-wrap] [data-wa="home-chipbar"] [role="list"] > *{gap:8px !important}
[data-wa-home-wrap] [data-wa="home-chipbar"] [role="list"] button > span{display:inline-flex !important;align-items:center !important;height:32px !important;padding:0 16px !important;min-block-size:0 !important;font-size:13px !important;font-weight:700 !important;line-height:1 !important;border-radius:999px !important;background:transparent !important;border:1px solid var(--spice-misc,#2a2930) !important;color:var(--spice-text,#fff) !important;box-shadow:none !important;transition:background .15s}
[data-wa-home-wrap] [data-wa="home-chipbar"] [role="list"] button:hover > span{background:rgba(255,255,255,.07) !important}
[data-wa-home-wrap] [data-wa="home-chipbar"] [role="list"] button[aria-checked="true"] > span{background:var(--spice-text,#fff) !important;color:var(--spice-main,#0f0f11) !important;border-color:var(--spice-text,#fff) !important}
[data-wa-home-wrap] [data-wa="home-chipbar"] .search-searchCategory-carousel{display:none !important}

[data-wa="home-content"]{container-type:inline-size;display:flex !important;flex-wrap:wrap !important;column-gap:12px !important;row-gap:12px !important;padding-top:4px !important;padding-bottom:48px !important;align-items:stretch}
[data-wa="home-content"] > *{flex:1 1 100% !important;margin:0 !important;min-width:0 !important;max-width:100% !important;box-sizing:border-box}
/* fixed order: tiles, Jump back in, Quick picks, New release + Made For, rows, More for you */
[data-wa="home-content"] > .wa-bento{order:-9 !important}
[data-wa="home-content"] > [data-wa-hrole="recents"]{order:-8 !important}
[data-wa="home-content"] > .wa-recents{order:-8 !important}
[data-wa="home-content"].wa-recents-ready > [data-wa-hrole="recents"]{display:none !important}
.wa-cards.wa-one-row{grid-template-columns:repeat(auto-fill,minmax(200px,1fr));grid-template-rows:auto;grid-auto-rows:0;row-gap:0;overflow:hidden}
.wa-cards.wa-one-row > *{overflow:hidden}
/* artists: round photo, and the play button sits at the top right outside the circle's clip */
.wa-card-img.wa-round{border-radius:50%;overflow:visible;box-shadow:none;background:transparent}
.wa-card-img.wa-round img{border-radius:50%;box-shadow:none;background:var(--spice-misc,#2a2930)}
.wa-card-img.wa-round .wa-card-play{top:4px;right:4px;bottom:auto;transform:translateY(-6px)}
.wa-card:hover .wa-card-img.wa-round .wa-card-play,.wa-card-img.wa-round .wa-card-play:focus-visible{transform:none}
[data-wa="home-content"] > .wa-qp{order:-7 !important}
[data-wa="home-content"] > [data-wa-hsec="release"]{order:-6 !important}
[data-wa="home-content"] > [data-wa-hrole="madefor"]{order:-5 !important}
[data-wa="home-content"] > .wa-more{order:900 !important}
[data-wa="home-content"] > [data-wa-fold]{order:901 !important}
[data-wa="home-content"]:not(.wa-expanded) > [data-wa-fold]{display:none !important}
[data-wa="home-content"].wa-bento-ready > [data-wa-hsec="shortcuts"]{display:none !important}
/* the chips decide what's relevant: Liked Songs, DJ, shortcuts and Quick picks are music */
[data-wa="home-content"]:is([data-wa-filter="podcasts"],[data-wa-filter="audiobooks"]) > :is(.wa-bento,.wa-qp){display:none !important}
[data-wa="home-content"] > .wa-recents[hidden]{display:none !important}

/* sections: outlined boxes like the artist and playlist pages */
[data-wa-hsec],.wa-sec{border:1px solid var(--spice-misc,#2a2930) !important;border-radius:10px !important;padding:10px 6px 6px !important;height:auto !important;min-height:0 !important;background:transparent !important}
[data-wa-hsec] h2,.wa-sec h2{font-size:16px !important;line-height:1.2 !important;font-weight:700 !important;color:var(--spice-text,#fff) !important;margin:0 !important;letter-spacing:-.01em}
[data-wa-hsec] > :first-child[role="group"],[data-wa-hsec] > :first-child:not(:only-child){min-height:0 !important;margin:0 0 6px !important;padding:0 6px !important;height:auto !important}
[data-wa-hsec] > :first-child *{min-height:0 !important}
[data-wa-hsec] > :first-child a span{font-size:13px !important;font-weight:700 !important;color:var(--spice-subtext,#b3b3b3) !important}
[data-wa-hsec] > :first-child a:hover span{color:var(--spice-text,#fff) !important}
[data-wa-hsec] > :first-child p{font-size:12px !important}
.wa-sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 6px;padding:0 6px}
.wa-sec-head small{font-size:13px;color:var(--spice-subtext,#b3b3b3)}


/* tile block: big Liked Songs tile + shortcuts + DJ */
.wa-bento{display:grid !important;grid-template-columns:minmax(380px,1.35fr) repeat(var(--wa-cols,4),minmax(0,1fr));grid-template-rows:76px 76px;gap:12px;row-gap:12px !important}
.wa-liked{grid-row:1 / span 2;display:flex;align-items:center;gap:18px;padding:12px 18px 12px 12px;border-radius:10px;background:transparent;border:1px solid var(--spice-misc,#2a2930);min-width:0;cursor:pointer;transition:background .15s}
.wa-liked:hover{background:rgba(255,255,255,.04)}
.wa-collage{width:140px;height:140px;flex:none;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;border-radius:10px;overflow:hidden;background:var(--spice-misc,#2a2930);box-shadow:none}
.wa-collage img{width:100%;height:100%;object-fit:cover;display:block}
.wa-collage.wa-heart{display:grid;place-items:center;grid-template-columns:1fr;grid-template-rows:1fr}
.wa-collage.wa-heart svg{width:48px;height:48px;fill:var(--spice-text,#fff)}
.wa-liked-t{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}
.wa-k{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--spice-subtext,#b3b3b3)}
.wa-liked-t b{font-size:28px;line-height:1.1;font-weight:700;color:var(--spice-text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wa-liked-t > span{font-size:13px;color:var(--spice-subtext,#b3b3b3)}
.wa-liked-btns{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center}

.wa-tile{position:relative;display:flex;align-items:center;gap:12px;height:76px;border-radius:10px;background:transparent;outline:1px solid var(--spice-misc,#2a2930);outline-offset:-1px;overflow:hidden;cursor:pointer;min-width:0;transition:background .15s;color:inherit;border:0;padding:0;text-align:left;font:inherit}
.wa-tile:hover{background:rgba(255,255,255,.06)}
.wa-tile > img,.wa-tile > .wa-tile-icon{width:76px;height:76px;flex:none;object-fit:cover;background:var(--spice-misc,#2a2930)}
.wa-tile-icon{display:grid;place-items:center;background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.03)) !important;color:var(--spice-text,#fff)}
.wa-tile-icon svg{width:40px;height:40px;fill:none}
.wa-tile-t{min-width:0;flex:1;padding-right:48px}
.wa-tile-t b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14px;line-height:1.3;font-weight:700;color:var(--spice-text,#fff)}
.wa-tile-t span{display:block;font-size:12px;color:var(--spice-subtext,#b3b3b3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wa-tile .wa-card-play{right:12px;bottom:auto;top:50%;transform:translateY(-50%) scale(.9);width:36px;height:36px}
.wa-tile:hover .wa-card-play,.wa-tile .wa-card-play:focus-visible{opacity:1;transform:translateY(-50%)}
@container (max-width: 1200px){
  .wa-bento{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:auto}
  .wa-liked{grid-column:1 / -1;grid-row:auto}
}

/* Jump back in / Made For / rows: cards */
[data-wa-hsec="shelf"] .search-searchCategory-contentArea{height:auto !important;overflow:visible !important;padding:0 !important;margin:0 !important;width:auto !important}
[data-wa-hsec="shelf"] .search-searchCategory-categoryGrid{display:block !important;overflow:visible !important;width:auto !important;height:auto !important;mask-image:none !important;-webkit-mask-image:none !important}
[data-wa-hsec="shelf"] .search-searchCategory-categoryGrid > *{width:auto !important;transform:none !important}
[data-wa-hsec="shelf"] .search-searchCategory-carousel{display:none !important}
[data-wa-hsec] [data-wa="hgrid"]{display:grid !important;grid-template-columns:repeat(auto-fill,minmax(172px,1fr)) !important;grid-template-rows:auto !important;grid-auto-rows:0 !important;grid-auto-flow:row !important;grid-auto-columns:auto !important;row-gap:0 !important;column-gap:8px !important;width:auto !important;transform:none !important;overflow:hidden !important;padding:0 !important;margin:0 !important}
[data-wa-hrole="recents"] [data-wa="hgrid"]{grid-template-columns:repeat(auto-fill,minmax(200px,1fr)) !important}
[data-wa-hsec] [data-wa="hgrid"] > *{overflow:hidden !important}
[data-wa-hsec] [data-wa="hgrid"] > *,[data-wa-hsec] [data-wa="hgrid"] > * > *,[data-wa-hsec] [data-wa="hgrid"] > * > * > *{width:auto !important;height:auto !important;min-width:0 !important;padding:0 !important;margin:0 !important}
[data-wa-hsec] .e-10860-legacy-box--interactive:not(a){display:flex !important;flex-direction:column !important;gap:12px !important;padding:8px 8px 12px !important;margin:0 !important;min-height:0 !important;height:auto !important;width:auto !important;border:0 !important;border-radius:12px !important;background:transparent !important;box-shadow:none !important;transition:background .15s}
[data-wa-hsec] .e-10860-legacy-box--interactive:not(a):hover{background:rgba(255,255,255,.06) !important}
[data-wa-hsec] .main-card-imageContainer{width:100% !important;height:auto !important;aspect-ratio:1 !important;min-width:0 !important;margin:0 !important;padding:0 !important;position:relative !important}
[data-wa-hsec] .main-card-imageContainer > :first-child{width:100% !important;height:100% !important;padding:0 !important;border-radius:10px !important;box-shadow:none !important;overflow:hidden}
[data-wa-hsec] .main-card-imageContainer img{width:100% !important;height:100% !important;object-fit:cover;border-radius:10px}
[data-wa-hsec] .main-cardImage-circular,[data-wa-hsec] .main-cardImage-circular img{border-radius:50% !important}
[data-wa-hsec] .main-card-PlayButtonContainer{right:10px !important;bottom:10px !important;width:44px !important;height:44px !important}
[data-wa-hsec] .main-card-PlayButtonContainer button,[data-wa-hsec] .main-card-PlayButtonContainer button > span{width:44px !important;height:44px !important;min-block-size:0 !important;inline-size:44px !important;block-size:44px !important}
[data-wa-hsec] .main-card-PlayButtonContainer button > span{background:var(--spice-text,#fff) !important;color:var(--spice-main,#0f0f11) !important;box-shadow:0 6px 16px rgba(0,0,0,.45) !important}
[data-wa-hsec] .main-card-PlayButtonContainer svg{width:16px !important;height:16px !important;fill:var(--spice-main,#0f0f11) !important}
[data-wa-hsec] .e-10860-card__main{min-width:0 !important;width:auto !important;padding:0 4px !important;margin:0 !important;overflow:hidden !important}
[data-wa-hsec] .e-10860-card__main *{min-width:0 !important;max-width:100% !important}
[data-wa-hsec] .e-10860-card__column{padding:0 !important;gap:3px !important;width:auto !important;overflow:hidden !important}
[data-wa-hsec] .e-10860-card-title *{opacity:1 !important;visibility:visible !important}
[data-wa-hsec] .e-10860-card__column > a,[data-wa-hsec] .e-10860-card__column > a > .e-10860-card-title{display:block !important;height:auto !important;max-height:none !important;position:static !important;clip:auto !important;clip-path:none !important;opacity:1 !important;overflow:hidden !important;white-space:nowrap !important;text-overflow:ellipsis !important}
[data-wa-hsec] .e-10860-card-title,[data-wa-hsec] .e-10860-card-title *{font-size:15px !important;font-weight:700 !important;line-height:1.35 !important;-webkit-line-clamp:1 !important}
[data-wa-hsec] .e-10860-card__column > :not(:first-child),[data-wa-hsec] .e-10860-card__column > :not(:first-child) *{font-size:13px !important;line-height:1.4 !important;color:var(--spice-subtext,#b3b3b3)}
[data-wa-hsec] .e-10860-card__column > :not(:first-child) .e-10860-line-clamp{-webkit-line-clamp:2 !important;line-clamp:2 !important}

/* New release beside Made For */
[data-wa-hsec="release"]{flex:0 1 400px !important;align-self:start}
[data-wa-hsec="release"] > a{flex:0 0 auto !important;min-height:0 !important;max-height:none !important;aspect-ratio:auto !important;container-type:normal !important;display:block !important;height:auto !important;width:100% !important;box-sizing:border-box !important;padding:8px !important;background:transparent !important;border:0 !important;border-radius:8px !important}
[data-wa-hsec="release"] > a:hover{background:rgba(255,255,255,.06) !important}
[data-wa-hsec="release"] > a > div{container-type:normal !important;grid-template-areas:none !important;display:grid !important;grid-template-columns:150px minmax(0,1fr) !important;grid-template-rows:auto auto !important;column-gap:18px !important;row-gap:8px !important;width:100% !important;height:auto !important;padding:0 !important;margin:0 !important;align-items:center !important}
[data-wa-hsec="release"] > a > div > div:first-child{grid-row:1 / span 2 !important;grid-column:1 !important;width:150px !important;height:150px !important;position:relative !important;margin:0 !important}
[data-wa-hsec="release"] > a > div > div:first-child img{position:static !important;width:150px !important;height:150px !important;border-radius:10px !important;object-fit:cover;box-shadow:none}
[data-wa-hsec="release"] > a > div > div:nth-child(2){grid-column:2 !important;grid-row:1 !important;align-self:end !important;width:100% !important;display:flex !important;flex-direction:column !important;min-width:0 !important;margin:0 !important;padding:0 !important}
[data-wa-hsec="release"] > a > div > div:nth-child(2) > :last-child{font-size:24px !important;line-height:1.2 !important}
[data-wa-hsec="release"] > a > div > div:nth-child(2) > :first-child{font-size:13px !important}
[data-wa-hsec="release"] > a > div > div:nth-child(3){display:none !important}
[data-wa-hsec="release"] > a > div > div:nth-child(4){grid-column:2 !important;grid-row:2 !important;align-self:start !important;height:auto !important;width:auto !important;margin:0 !important;padding:0 !important;display:flex !important;align-items:center !important;gap:4px !important}
[data-wa-hsec="release"] > a > div > div:nth-child(4) > *,[data-wa-hsec="release"] > a > div > div:nth-child(4) > * > *{display:flex !important;align-items:center !important;height:40px !important;gap:2px}
[data-wa-hsec="release"] > a > div > div:nth-child(4) button{width:40px !important;height:40px !important;min-block-size:0 !important;padding:0 !important;background:transparent !important;color:var(--spice-subtext,#b3b3b3) !important;border-radius:50% !important}
[data-wa-hsec="release"] > a > div > div:nth-child(4) button > span{background:transparent !important;width:40px !important;height:40px !important;min-block-size:0 !important;display:grid !important;place-items:center !important;padding:0 !important}
[data-wa-hsec="release"] > a > div > div:nth-child(4) button[aria-label^="Play"]{background:var(--spice-text,#fff) !important}
[data-wa-hsec="release"] > a > div > div:nth-child(4) button[aria-label^="Play"] *{color:var(--spice-main,#0f0f11) !important;fill:var(--spice-main,#0f0f11) !important}
[data-wa-hsec="release"] > a > div > div:nth-child(4) button:not([aria-label^="Play"]):hover{color:var(--spice-text,#fff) !important;background:rgba(255,255,255,.08) !important}
[data-wa-hsec="release"] > a > div > div:nth-child(4) svg{width:16px !important;height:16px !important}
[data-wa-hsec="release"] > :first-child{padding:0 4px !important}
[data-wa-hrole="madefor"]{flex:1 1 480px !important}
[data-wa-hsec="release"] ~ [data-wa-hrole="madefor"] [data-wa="hgrid"]{grid-template-columns:repeat(auto-fill,minmax(160px,1fr)) !important}

/* Quick picks: compact song rows */
.wa-qp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:column;grid-template-rows:repeat(4,auto);column-gap:16px;row-gap:2px}
@container (max-width: 1100px){ .wa-qp-grid{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(6,auto)} }
.wa-song{position:relative;display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:center;column-gap:14px;padding:6px 8px;border-radius:10px;cursor:pointer;min-width:0;transition:background .15s}
.wa-song:hover{background:rgba(255,255,255,.06)}
.wa-song-img{position:relative;width:52px;height:52px;border-radius:8px;overflow:hidden;background:var(--spice-misc,#2a2930)}
.wa-song-img img{width:100%;height:100%;object-fit:cover;display:block}
.wa-song-img .wa-song-play{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.45);opacity:0;transition:opacity .15s;color:#fff}
.wa-song-img .wa-song-play svg{width:18px;height:18px;fill:currentColor}
.wa-song:hover .wa-song-play{opacity:1}
.wa-song-t{min-width:0}
.wa-song-t b{display:block;font-size:15px;font-weight:700;color:var(--spice-text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wa-song-t span{display:block;font-size:13px;color:var(--spice-subtext,#b3b3b3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.wa-song-d{font-size:12px;color:var(--spice-subtext,#b3b3b3);font-variant-numeric:tabular-nums}

/* our cards (More for you) */
.wa-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(172px,1fr));column-gap:8px;row-gap:8px}
.wa-card{display:flex;flex-direction:column;gap:12px;padding:8px 8px 12px;border-radius:12px;cursor:pointer;min-width:0;transition:background .15s}
.wa-card:hover{background:rgba(255,255,255,.06)}
.wa-card-img{position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--spice-misc,#2a2930);box-shadow:none}
.wa-card-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.wa-card-play{position:absolute;right:10px;bottom:10px;width:44px;height:44px;border-radius:50%;border:0;background:var(--spice-text,#fff);color:var(--spice-main,#0f0f11);display:grid;place-items:center;cursor:pointer;padding:0;opacity:0;transform:translateY(6px);transition:opacity .15s,transform .15s;box-shadow:0 6px 16px rgba(0,0,0,.45)}
.wa-card:hover .wa-card-play,.wa-card-play:focus-visible{opacity:1;transform:none}
.wa-card-play svg{width:16px;height:16px;fill:currentColor}
.wa-card-k{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--spice-subtext,#b3b3b3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px}
.wa-card b{display:block;font-size:15px;font-weight:700;color:var(--spice-text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px;margin-top:-6px}
.wa-card span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;line-height:1.4;color:var(--spice-subtext,#b3b3b3);padding:0 4px}
[data-wa-hsec="feed"].wa-feed-ready > :not(.wa-feed){display:none !important}

/* More for you (folds the rest) */
.wa-more{display:flex !important;align-items:center;gap:16px;padding:0 8px !important}
.wa-more{justify-content:center}
.wa-more button{font:inherit;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 18px;border-radius:999px;border:1px solid var(--spice-misc,#2a2930);background:transparent;color:var(--spice-text,#fff);cursor:pointer}
.wa-more button:hover{background:rgba(255,255,255,.07)}
.wa-more button svg{width:12px;height:12px;fill:currentColor;transition:transform .2s}
[data-wa="home-content"].wa-expanded > .wa-more button svg{transform:rotate(180deg)}

.wa-pill{font:inherit;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:999px;border:1px solid var(--spice-misc,#2a2930);background:transparent;color:var(--spice-text,#fff);cursor:pointer}
.wa-pill:hover{background:rgba(255,255,255,.07)}
.wa-pill.wa-primary{background:var(--spice-text,#fff);color:var(--spice-main,#0f0f11);border-color:var(--spice-text,#fff)}
.wa-pill.wa-primary:hover{opacity:.9}
.wa-pill svg{width:14px;height:14px;fill:currentColor}
`;
  const homeStyle = document.createElement("style");
  homeStyle.id = "wiki-about-home";
  homeStyle.textContent = homeCss;
  document.head.appendChild(homeStyle);

  const ICON_SHUFFLE = svg('<path d="M13.15.47a.75.75 0 0 1 1.06 0l1.6 1.6a.75.75 0 0 1 0 1.06l-1.6 1.6a.75.75 0 1 1-1.06-1.06l.32-.32h-.46a3.25 3.25 0 0 0-2.66 1.38L5.52 11.3A4.75 4.75 0 0 1 1.63 13.3H.75a.75.75 0 0 1 0-1.5h.88a3.25 3.25 0 0 0 2.66-1.38L9.1 3.85a4.75 4.75 0 0 1 3.89-2.03h.48l-.32-.32a.75.75 0 0 1 0-1.03z"/><path d="M.75 3.85a.75.75 0 0 0 0 1.5h.88c.72 0 1.4.24 1.96.67l.86-1.23A4.74 4.74 0 0 0 1.63 3.85H.75zM13.15 10.26a.75.75 0 0 1 1.06 0l1.6 1.6a.75.75 0 0 1 0 1.06l-1.6 1.6a.75.75 0 1 1-1.06-1.06l.32-.32H13a4.75 4.75 0 0 1-3.31-1.36l.86-1.23A3.24 3.24 0 0 0 13 11.6h.46l-.32-.32a.75.75 0 0 1 0-1.02z"/>');
  const ICON_HEART = svg('<path d="M15.72 4.78a4.36 4.36 0 0 0-7.39-2.32L8 2.8l-.33-.34a4.36 4.36 0 0 0-6.17 6.17L8 15.13l6.5-6.5a4.35 4.35 0 0 0 1.22-3.85z"/>');
  // Spotify's own DJ glyph (the one on the player bar's DJ button)
  const ICON_DJ = svg('<path d="M7.813 14.497A6.5 6.5 0 0 1 1.5 8.016c.008-3.553 2.71-5.744 5.043-6.078.85-.121 1.288.037 1.564.246.312.238.553.639.822 1.276q.115.277.239.602c.451 1.167 1.05 2.717 2.505 3.81 1.01.76 1.46 1.529 1.592 2.209.13.679-.037 1.375-.468 2.03-.88 1.34-2.793 2.388-4.844 2.388zm-.037 1.5A8 8 0 1 0 0 8.032c0 4.34 3.464 7.87 7.776 7.965m6.666-7.124c-.358-.788-.979-1.532-1.868-2.2-1.082-.813-1.51-1.9-1.967-3.06a31 31 0 0 0-.296-.736 6.3 6.3 0 0 0-.605-1.151 6.53 6.53 0 0 1 4.39 4.01 6.5 6.5 0 0 1 .346 3.137"/>');
  const ICON_CHEVRON = svg('<path d="M1.47 4.97a.75.75 0 0 1 1.06 0L8 10.44l5.47-5.47a.75.75 0 1 1 1.06 1.06L8 12.56 1.47 6.03a.75.75 0 0 1 0-1.06z"/>');
  const imgUrl = (u) => (u && u.startsWith("spotify:image:") ? "https://i.scdn.co/image/" + u.slice(14) : u || "");
  const likedCtx = () => `spotify:user:${Spicetify.Platform.username}:collection`;
  const uriFromHref = (href) => {
    const m = (href || "").match(/^\/?(playlist|album|artist|show|episode|track)\/([A-Za-z0-9]+)/);
    return m ? `spotify:${m[1]}:${m[2]}` : null;
  };
  const go = (href) => Spicetify.Platform.History.push(href.startsWith("/") ? href : "/" + href);

  function pill(label, icon, primary, onClick) {
    const b = el("button", "wa-pill" + (primary ? " wa-primary" : ""), icon || "");
    b.type = "button";
    b.append(label);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }
  function playButton(cls, label, onPlay) {
    const p = el("button", cls, ICON_PLAY);
    p.type = "button";
    p.title = label;
    p.setAttribute("aria-label", label);
    p.addEventListener("click", (e) => {
      e.stopPropagation();
      onPlay();
    });
    return p;
  }
  function card({ img, kicker, title, sub, onOpen, onPlay, round }) {
    const c = el("div", "wa-card");
    c.setAttribute("role", "link");
    c.tabIndex = 0;
    const box = el("div", "wa-card-img" + (round ? " wa-round" : ""));
    const im = document.createElement("img");
    im.alt = "";
    im.loading = "lazy";
    if (img) im.src = img;
    box.append(im);
    if (onPlay) box.append(playButton("wa-card-play", `Play ${title}`, onPlay));
    c.append(box);
    if (kicker) c.append(text("div", "wa-card-k", kicker));
    c.append(text("b", "", title));
    if (sub) c.append(text("span", "", sub));
    c.addEventListener("click", onOpen);
    c.addEventListener("keydown", (e) => e.key === "Enter" && onOpen());
    return c;
  }
  const shuffleLiked = () => {
    try {
      Spicetify.Player.setShuffle(true);
    } catch {
      // play still works without shuffle
    }
    play(likedCtx());
  };

  // recent likes, fetched once per visit to Home and shared by the Liked
  // Songs collage and Quick picks
  let likesPromise = null;
  let likesAt = 0;
  function recentLikes() {
    if (!likesPromise || Date.now() - likesAt > 60000) {
      likesAt = Date.now();
      likesPromise = Spicetify.Platform.LibraryAPI.getTracks({ limit: 12, offset: 0 })
        .then((r) => r.items || [])
        .catch(() => []);
    }
    return likesPromise;
  }
  const trackImg = (t, label = "standard") => {
    const imgs = (t.album && t.album.images) || [];
    const pick = imgs.find((i) => i.label === label) || imgs[0];
    return imgUrl(pick && pick.url);
  };

  // tile block: Liked Songs (big) + Spotify's shortcuts + DJ
  function readShortcuts(sec) {
    const out = [];
    for (const tile of sec.querySelectorAll('[data-testid="shortcut-background"]')) {
      const root = tile.parentElement;
      const a = root.querySelector("a[href]");
      const name = [...root.querySelectorAll("a[href] p, a[href] span")].map((x) => x.textContent.trim()).find(Boolean) || (a && a.textContent.trim());
      const img = root.querySelector("img");
      if (a && name) out.push({ href: a.getAttribute("href"), title: name, img: img ? img.src : "" });
    }
    return out;
  }
  function buildBento(content, shortcuts) {
    let bento = content.querySelector(":scope > .wa-bento");
    // Liked Songs has its own tile, and the DJ is a button on it
    const items = shortcuts.filter((s) => !/liked songs/i.test(s.title) && !/collection\/tracks/.test(s.href) && !s.href.includes("37i9dQZF1EYkqdzj48dyYq")).slice(0, 7);
    const sig = items.map((s) => s.href).join("|");
    if (bento && bento.dataset.sig === sig) return;
    if (!bento) {
      bento = el("section", "wa-bento");
      bento.setAttribute("aria-label", "Your shortcuts");
      content.append(bento);
    }
    bento.dataset.sig = sig;
    bento.replaceChildren();

    // Liked Songs: collage of the latest likes, Play / Shuffle
    const liked = el("div", "wa-liked");
    liked.setAttribute("role", "link");
    liked.tabIndex = 0;
    const collage = el("div", "wa-collage wa-heart", ICON_HEART);
    const lt = el("div", "wa-liked-t");
    const sub = text("span", "", "Everything you've hearted");
    lt.append(text("div", "wa-k", "Your library"), text("b", "", "Liked Songs"), sub);
    const btns = el("div", "wa-liked-btns");
    const djPill = pill("DJ", ICON_DJ, false, () => play(DJ_URI));
    djPill.classList.add("wa-dj-pill");
    djPill.title = "Start your personal DJ";
    btns.append(pill("Play", ICON_PLAY, true, () => play(likedCtx())), pill("Shuffle", ICON_SHUFFLE, false, shuffleLiked), djPill);
    lt.append(btns);
    liked.append(collage, lt);
    const openLiked = () => Spicetify.Platform.History.push("/collection/tracks");
    liked.addEventListener("click", openLiked);
    liked.addEventListener("keydown", (e) => e.key === "Enter" && openLiked());
    bento.append(liked);
    recentLikes().then((items) => {
      const covers = [...new Set(items.map((t) => trackImg(t)).filter(Boolean))].slice(0, 4);
      if (covers.length === 4) {
        collage.classList.remove("wa-heart");
        collage.replaceChildren(
          ...covers.map((u) => {
            const im = document.createElement("img");
            im.src = u;
            im.alt = "";
            return im;
          })
        );
      }
      if (items[0]) sub.textContent = `Latest: ${items[0].name}`;
    });

    // shortcuts
    for (const s of items) {
      const t = el("div", "wa-tile");
      t.setAttribute("role", "link");
      t.tabIndex = 0;
      const im = document.createElement("img");
      im.alt = "";
      if (s.img) im.src = s.img;
      const tt = el("div", "wa-tile-t");
      tt.append(text("b", "", s.title));
      t.append(im, tt);
      const uri = uriFromHref(s.href);
      if (uri) t.append(playButton("wa-card-play", `Play ${s.title}`, () => play(uri)));
      t.addEventListener("click", () => go(s.href));
      t.addEventListener("keydown", (e) => e.key === "Enter" && go(s.href));
      bento.append(t);
    }

    // two rows of tiles; columns follow the count so nothing stretches
    bento.style.setProperty("--wa-cols", String(Math.max(2, Math.min(4, Math.ceil(items.length / 2)))));
    content.classList.add("wa-bento-ready");
  }

  // Quick picks: recent likes as compact song rows
  function buildQuickPicks(content) {
    const sec = el("section", "wa-sec wa-qp");
    sec.setAttribute("aria-label", "Quick picks");
    const head = el("div", "wa-sec-head");
    head.append(text("h2", "", "Quick picks"), text("small", "", "From your recent likes"));
    const grid = el("div", "wa-qp-grid");
    sec.append(head, grid);
    content.append(sec);
    recentLikes().then((items) => {
      if (!items.length) return sec.remove();
      for (const t of items) {
        const row = el("div", "wa-song");
        row.setAttribute("role", "button");
        row.tabIndex = 0;
        const box = el("div", "wa-song-img");
        const im = document.createElement("img");
        im.alt = "";
        im.loading = "lazy";
        im.src = trackImg(t, "small") || trackImg(t);
        box.append(im, el("div", "wa-song-play", ICON_PLAY));
        const tt = el("div", "wa-song-t");
        tt.append(text("b", "", t.name), text("span", "", ((t.artists || []).map((a) => a.name).join(", ")) || (t.album && t.album.artist && t.album.artist.name) || ""));
        const ms = (t.duration && t.duration.milliseconds) || 0;
        const d = text("span", "wa-song-d", ms ? `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}` : "");
        row.append(box, tt, d);
        const p = () => play(likedCtx(), t.uri);
        row.addEventListener("click", p);
        row.addEventListener("keydown", (e) => e.key === "Enter" && p());
        grid.append(row);
      }
    });
  }

  // The big preview cards (video backgrounds, carousels) are rebuilt as
  // ordinary cards from what each card already shows.
  const FEED_TITLE = { all: "Picked for you", music: "Picked for you", podcasts: "Episodes for you", audiobooks: "Audiobooks for you" };
  const FEED_MORE = { all: "More picked for you", music: "More picked for you", podcasts: "More episodes", audiobooks: "More audiobooks" };
  let homeFilter = "all";
  function buildFeed(sec) {
    const src = [...sec.querySelectorAll(".main-gridContainer-gridContainer > *")];
    let box = sec.querySelector(":scope > .wa-feed");
    if (box && box.dataset.count === String(src.length) && box.dataset.filter === homeFilter) return;
    if (box) box.dataset.filter = homeFilter;
    const items = [];
    for (const c of src) {
      const head = c.querySelector(".e-10860-legacy-box > header");
      const a = head && head.querySelector("a[href]");
      if (!a) continue;
      const img = head.querySelector("img");
      const kicker = ((c.querySelector("header span") || {}).textContent || "").trim();
      const type = [...new Set([...head.querySelectorAll(":scope > div:last-child > span span")].map((x) => x.textContent.replace(/[•·]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean))].join(" • ");
      items.push({ href: a.getAttribute("href"), title: a.textContent.trim(), img: img ? img.src : "", kicker, type });
    }
    if (!items.length) return;
    if (!box) {
      box = el("div", "wa-feed");
      const head = el("div", "wa-sec-head");
      head.append(text("h2", "", ""));
      box.append(head, el("div", "wa-cards"));
      sec.append(box);
    }
    const h = box.querySelector("h2");
    const nth = [...sec.parentElement.querySelectorAll(':scope > [data-wa-hsec="feed"]')].indexOf(sec);
    const base = FEED_TITLE[homeFilter] || "Picked for you";
    const title = nth > 0 ? FEED_MORE[homeFilter] || base : base;
    if (h.textContent !== title) h.textContent = title;
    box.dataset.count = String(src.length);
    const grid = box.querySelector(".wa-cards");
    grid.replaceChildren();
    for (const it of items) {
      const uri = uriFromHref(it.href);
      grid.append(card({ img: it.img, kicker: it.kicker, title: it.title, sub: it.type, onPlay: uri ? () => play(uri) : null, onOpen: () => go(it.href) }));
    }
    sec.classList.add("wa-feed-ready");
  }

  // Recents from Spotify's live play history. Spotify's own Home row comes
  // from a feed it only re-downloads now and then, so it lags behind.
  const TYPE_NAME = { playlist: "Playlist", album: "Album", artist: "Artist", show: "Podcast", collection: "Playlist" };
  let recentsSig = "";
  let homeVisit = true;
  const recentsAsked = new WeakSet();
  async function buildRecents(content, force) {
    let ctxs;
    try {
      ctxs = await Spicetify.Platform.RecentlyPlayedAPI.getContexts();
    } catch {
      return;
    }
    const KINDS = { music: ["playlist", "album", "artist", "collection"], podcasts: ["show", "episode"], audiobooks: ["audiobook"] };
    const allow = KINDS[homeFilter];
    ctxs = (Array.isArray(ctxs) ? ctxs : (ctxs && ctxs.items) || []).filter((c) => c && c.uri && c.name && (!allow || allow.includes(c.uri.split(":")[1]) || allow.includes(c.type))).slice(0, 16);
    // songs from Liked Songs, merged in by time; they stand in for the Liked Songs card
    rememberSong(); // the song playing (or paused) right now counts too
    const songs = allow && !allow.includes("playlist") ? [] : loadSongs();
    if (songs.some((x) => x.fromLiked !== false)) ctxs = ctxs.filter((c) => !(isLikedCtx(c.uri) || /^liked songs$/i.test(c.name)));
    ctxs = [...ctxs.map((c) => ({ ...c, _t: c.timestampMs || 0 })), ...songs.map((x) => ({ _song: x, uri: x.uri, name: x.name, _t: x.t }))]
      .sort((a, b) => b._t - a._t)
      .slice(0, 16);
    if (!content.isConnected) return;
    const existing = content.querySelector(":scope > .wa-recents");
    if (!ctxs.length) {
      // nothing played of this kind yet
      if (existing) existing.hidden = true;
      recentsSig = homeFilter + ":";
      return;
    }
    if (existing) existing.hidden = false;
    const sig = homeFilter + ":" + ctxs.map((c) => c.uri).join("|");
    let sec = content.querySelector(":scope > .wa-recents");
    if (sec && !force && sig === recentsSig) return;
    recentsSig = sig;
    if (!sec) {
      sec = el("section", "wa-sec wa-recents");
      sec.setAttribute("aria-label", "Recents");
      const head = el("div", "wa-sec-head");
      head.append(text("h2", "", "Recents"));
      sec.append(head, el("div", "wa-cards wa-one-row"));
      content.append(sec);
    }
    const grid = sec.querySelector(".wa-cards");
    grid.replaceChildren();
    for (const c of ctxs) {
      if (c._song) {
        const x = c._song;
        const albumId = x.album ? x.album.split(":")[2] : null;
        grid.append(
          card({
            img: x.img,
            title: x.name,
            sub: ["Song", x.artists].filter(Boolean).join(" • "),
            onPlay: () => (x.fromLiked === false ? play(x.uri) : play(likedCtx(), x.uri)),
            onOpen: () => (albumId ? go(`/album/${albumId}?highlight=${encodeURIComponent(x.uri)}`) : x.fromLiked === false ? play(x.uri) : play(likedCtx(), x.uri)),
          })
        );
        continue;
      }
      const kind = c.uri.split(":")[1];
      const liked = /^liked songs$/i.test(c.name) || c.uri.endsWith(":collection");
      const imgs = c.images || [];
      const pick = imgs.find((i) => i.label === "standard") || imgs[0];
      const owner = c.owner && c.owner.displayName;
      const type = TYPE_NAME[kind] || "";
      const path = liked ? "/collection/tracks" : "/" + c.uri.split(":").slice(1).join("/");
      grid.append(
        card({
          img: imgUrl(pick && pick.url),
          title: c.name,
          sub: kind === "artist" ? "Artist" : [type, owner].filter(Boolean).join(" • "),
          round: kind === "artist",
          onPlay: () => play(liked ? likedCtx() : c.uri),
          onOpen: () => go(path),
        })
      );
    }
    content.classList.add("wa-recents-ready");
  }
  // Songs show up in Recents one by one when they weren't played from a
  // playlist, album, artist or podcast: from Liked Songs (Spotify's history
  // only lists "Liked Songs" as a whole), from search, or on their own.
  // Spotify's history skips those entirely. Kept on this machine only.
  const SONGS_KEY = "wikiAbout:recentSongs";
  const isLikedCtx = (uri) => !!uri && (uri.endsWith(":collection") || uri.endsWith(":37i9dQZF1F5p3rmiWPIYgZ"));
  const loadSongs = () => {
    try {
      return JSON.parse(localStorage.getItem(SONGS_KEY) || "[]");
    } catch {
      return [];
    }
  };
  function rememberSong() {
    const d = Spicetify.Player.data;
    const it = d && d.item;
    if (!it || !it.uri || !it.uri.startsWith("spotify:track:")) return false;
    const ctx = (d.context && d.context.uri) || "";
    const fromLiked = isLikedCtx(ctx);
    // playlists, albums, artists and podcasts already appear as their own card
    if (!fromLiked && /^spotify:(playlist|album|artist|show|station|user:[^:]+:playlist)/.test(ctx)) return false;
    const imgs = (it.album && it.album.images) || [];
    const pick = imgs.find((i) => i.label === "standard") || imgs[0];
    const song = {
      uri: it.uri,
      name: it.name,
      artists: (it.artists || []).map((a) => a.name).join(", "),
      img: imgUrl((pick && pick.url) || (it.metadata && it.metadata.image_url)),
      album: it.album && it.album.uri,
      fromLiked,
      t: Math.floor(Date.now() / 1000),
    };
    const list = [song, ...loadSongs().filter((x) => x.uri !== song.uri)].slice(0, 30);
    try {
      localStorage.setItem(SONGS_KEY, JSON.stringify(list));
    } catch {
      // still shown this session via the list above
    }
    return true;
  }
  // refresh Recents when playback moves to a new album/playlist, or a new song was recorded
  let lastCtx = "";
  Spicetify.Player.addEventListener("songchange", () => {
    const ctx = Spicetify.Player.data && Spicetify.Player.data.context && Spicetify.Player.data.context.uri;
    const songAdded = rememberSong();
    if (!songAdded && (!ctx || ctx === lastCtx)) return;
    lastCtx = ctx || lastCtx;
    setTimeout(() => {
      const content = document.querySelector('[data-wa="home-content"]');
      if (content) buildRecents(content);
    }, 1500);
  });
  rememberSong();

  function buildMore(content) {
    const more = el("div", "wa-more");
    const b = el("button", "", "");
    b.type = "button";
    more.append(b);
    b.addEventListener("click", () => {
      content.classList.toggle("wa-expanded");
      label();
    });
    const label = () => {
      const n = content.querySelectorAll(":scope > [data-wa-fold]").length;
      const open = content.classList.contains("wa-expanded");
      const html = (open ? "Show less" : `More for you · ${n} more`) + " " + ICON_CHEVRON;
      if (b.dataset.html !== html) {
        b.dataset.html = html;
        b.innerHTML = html;
      }
    };
    more.wa_label = label;
    content.append(more);
    label();
  }

  function tagHomePage() {
    const home = document.querySelector('.Root__main-view [data-testid="home-page"]');
    const mainView = document.querySelector(".Root__main-view");
    if (mainView && mainView.classList.contains("wa-on-home") !== !!home) {
      mainView.classList.toggle("wa-on-home", !!home);
      if (home) homeVisit = true; // just arrived on Home: refresh Recents
    }
    if (!home) return;
    const wrap = home.parentElement;
    tag(wrap, "data-wa-home-wrap");
    for (const c of wrap.children) {
      if (c === home) break;
      if (c.hasAttribute("data-wa")) continue;
      if (c.querySelector('[role="list"], .search-searchCategory-contentArea')) tag(c, "data-wa", "home-chipbar");
      else if (c.offsetHeight > 40 && getComputedStyle(c).backgroundImage !== "none") tag(c, "data-wa", "home-bg");
    }
    const content = [...home.children].find((c) => c.classList.contains("contentSpacing"));
    if (!content) return;
    tag(content, "data-wa", "home-content");

    // which chip is selected (a "Following" sub-chip counts as its parent)
    const chip = [...wrap.querySelectorAll('[data-wa="home-chipbar"] [role="list"] button[aria-checked="true"]')].map((b) => (b.getAttribute("aria-label") || b.textContent || "").toLowerCase()).join(" ");
    const filter = /podcast/.test(chip) ? "podcasts" : /audiobook/.test(chip) ? "audiobooks" : /music/.test(chip) ? "music" : "all";
    if (filter !== homeFilter) {
      homeFilter = filter;
      homeVisit = true; // re-filter Recents
    }
    tag(content, "data-wa-filter", filter);
    const musicView = filter === "all" || filter === "music";

    let shortcuts = null;
    let rows = 0;
    const limit = settings.homeRows === "all" ? Infinity : +settings.homeRows || 3;
    for (const sec of content.children) {
      if (["wa-bento", "wa-qp", "wa-more", "wa-recents"].some((c) => sec.classList.contains(c))) continue;
      let kind = "other";
      if (sec.querySelector('[data-testid="shortcut-background"]')) kind = "shortcuts";
      else if (sec.dataset.testid === "component-shelf") kind = "shelf";
      else if (sec.classList.contains("Shelf")) kind = "feed";
      else if (sec.querySelector(":scope > a")) kind = "release";
      if (kind === "other" && sec.tagName !== "SECTION") continue;
      tag(sec, "data-wa-hsec", kind);
      const label = (sec.getAttribute("aria-label") || "").trim();
      let role = "";
      if (kind === "shelf" && /^recents$/i.test(label)) role = "recents";
      else if (kind === "shelf" && /^made for/i.test(label)) role = "madefor";
      if (role) tag(sec, "data-wa-hrole", role);
      else untag(sec, "data-wa-hrole");
      if (kind === "shortcuts") shortcuts = sec;
      // fold everything past the first few ordinary rows (and the preview feed)
      const foldable = (kind === "shelf" && !role) || kind === "feed" || kind === "other";
      if (foldable) {
        rows++;
        if (rows > limit || (kind === "feed" && musicView)) tag(sec, "data-wa-fold");
        else untag(sec, "data-wa-fold");
      } else {
        untag(sec, "data-wa-fold");
      }
    }
    for (const g of content.querySelectorAll('[data-wa-hsec="shelf"] .search-searchCategory-categoryGrid > * > [aria-label]')) tag(g, "data-wa", "hgrid");
    for (const f of content.querySelectorAll('[data-wa-hsec="feed"]')) buildFeed(f);

    // refresh Recents on arrival, on a chip change, and for any fresh copy of
    // the Home content (Spotify rebuilds it when the chip changes)
    if (homeVisit || !recentsAsked.has(content)) {
      homeVisit = false;
      recentsAsked.add(content);
      buildRecents(content, !content.querySelector(":scope > .wa-recents"));
      for (const ms of [2500, 7000, 15000]) setTimeout(() => content.isConnected && buildRecents(content), ms);
    }
    if (shortcuts) buildBento(content, readShortcuts(shortcuts));
    const qp = content.querySelector(":scope > .wa-qp");
    if (settings.quickPicks !== false && !qp) buildQuickPicks(content);
    else if (settings.quickPicks === false && qp) qp.remove();
    let more = content.querySelector(":scope > .wa-more");
    const folded = content.querySelectorAll(":scope > [data-wa-fold]").length;
    if (folded && !more) buildMore(content);
    else if (!folded && more) more.remove();
    more = content.querySelector(":scope > .wa-more");
    if (more && more.wa_label) more.wa_label();
  }

  // ---------- after a resize ----------
  // Spotify can re-render parts of a page while resizing; re-apply our tags
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => queueTag(), 150);
  });

  // ---------- setting in the theme's paintbrush panel ----------
  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // setting still applies for this session
    }
    applySettings();
    queueTag();
  }
  function settingRow(title, note, control) {
    const row = el("div", "sbo-row");
    const label = el("div");
    label.append(text("div", "", title), text("small", "", note));
    row.append(label, control);
    return row;
  }
  function settingSwitch(key) {
    const sw = el("button", "sbo-switch");
    sw.type = "button";
    sw.setAttribute("role", "switch");
    sw.setAttribute("aria-checked", String(!!settings[key]));
    sw.addEventListener("click", () => {
      settings[key] = !settings[key];
      sw.setAttribute("aria-checked", String(settings[key]));
      saveSettings();
    });
    return sw;
  }
  const SETTINGS_DEFAULTS = { extras: false, quickPicks: true, homeRows: "3" };
  function addSettingsSection() {
    const panel = document.querySelector(".sbo-panel");
    if (!panel || panel.querySelector(".wa-settings")) return;
    const reset = panel.querySelector(".sbo-reset");
    const put = (sec) => (reset ? panel.insertBefore(sec, reset) : panel.append(sec));

    const home = el("div", "sbo-section wa-settings");
    home.append(text("h3", "", "Home"));
    home.append(settingRow("Quick picks", "A grid of your recently liked songs under Recents.", settingSwitch("quickPicks")));
    const seg = el("div", "sbo-segment");
    for (const v of ["2", "3", "5", "all"]) {
      const b = el("button", String(settings.homeRows) === v ? "sbo-on" : "");
      b.type = "button";
      b.textContent = v === "all" ? "All" : v;
      b.addEventListener("click", () => {
        settings.homeRows = v;
        seg.querySelectorAll("button").forEach((x) => x.classList.toggle("sbo-on", x === b));
        saveSettings();
      });
      seg.append(b);
    }
    home.append(settingRow("Rows before More for you", "How many of Spotify's rows show after Made For; the rest fold away.", seg));
    put(home);

    const artist = el("div", "sbo-section");
    artist.append(text("h3", "", "Artist page"));
    artist.append(settingRow("Extra artist sections", "Show You Liked, Artist pick, On Tour, Featuring, Discovered on, Fans also like and the rest. Off: only Popular and Discography.", settingSwitch("extras")));
    put(artist);
  }
  // "Reset to defaults" (the theme's button) also resets these settings; the
  // theme then rebuilds its panel, so add our sections to the new one
  document.addEventListener(
    "click",
    (e) => {
      if (!(e.target instanceof Element) || !e.target.closest(".sbo-reset")) return;
      Object.assign(settings, SETTINGS_DEFAULTS);
      saveSettings();
      let tries = 0;
      const t = setInterval(() => {
        addSettingsSection();
        if (document.querySelector(".sbo-panel .wa-settings") || ++tries > 20) clearInterval(t);
      }, 50);
    },
    true
  );
  // the theme builds its panel when the paintbrush is clicked
  document.addEventListener(
    "click",
    (e) => {
      if (!(e.target instanceof Element) || !e.target.closest(".sbo-settings-btn")) return;
      let tries = 0;
      const t = setInterval(() => {
        addSettingsSection();
        if (document.querySelector(".sbo-panel .wa-settings") || ++tries > 20) clearInterval(t);
      }, 50);
    },
    true
  );

  // Tagging runs on the next frame after a change, then at most every 250ms
  // while changes keep coming (e.g. Spotify swapping rows as a list scrolls),
  // so busy pages cost a few runs a second instead of one per frame.
  let tagQueued = false;
  let lastTag = 0;
  const queueTag = () => {
    if (tagQueued) return;
    tagQueued = true;
    const wait = Math.max(0, 250 - (performance.now() - lastTag));
    const run = () => {
      tagQueued = false;
      lastTag = performance.now();
      // each page on its own, so one breaking after a Spotify update doesn't stop the rest
      for (const fn of [tagArtistPage, tagListPage, tagHomePage, tagProfilePage, watchScroll]) {
        try {
          fn();
        } catch (err) {
          console.error(`[wikiAbout] ${fn.name}`, err);
        }
      }
    };
    if (wait === 0) requestAnimationFrame(run);
    else setTimeout(() => requestAnimationFrame(run), wait);
  };
  (function observe() {
    const root = document.querySelector(".Root__main-view");
    if (!root) return setTimeout(observe, 500);
    new MutationObserver(queueTag).observe(root, { childList: true, subtree: true, characterData: true });
    queueTag();
  })();

  // right-click an artist > Wikipedia (waits for Spicetify's React helpers)
  (function registerMenu(tries = 0) {
    try {
      if (!(Spicetify.React && Spicetify.ReactJSX && Spicetify.ContextMenu && Spicetify.URI)) throw new Error("not ready");
      new Spicetify.ContextMenu.Item(
        "Wikipedia",
        (uris) => openWiki(uris[0].split(":")[2]),
        (uris) => uris.length === 1 && Spicetify.URI.fromString(uris[0]).type === Spicetify.URI.Type.ARTIST
      ).register();
    } catch {
      if (tries < 60) setTimeout(() => registerMenu(tries + 1), 500);
    }
  })();
})();
