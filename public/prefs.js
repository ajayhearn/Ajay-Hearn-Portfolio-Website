// Runs in <head>, before the page is drawn, so saved settings apply without a flash.
// Sets attributes on <html> that styles.css reacts to:
//   data-theme      light | dark
//   data-motion     reduce | full    (follows the device unless the visitor chose)
//   data-text-size  100 | 115 | 130 | 150
//   data-contrast, data-font, data-spacing, data-links   "on" when switched on
(function () {
  var root = document.documentElement;
  function get(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.dataset.theme = get("theme") || (prefersDark ? "dark" : "light");
  root.dataset.motion = get("a11y-motion") || (prefersReduced ? "reduce" : "full");
  var size = get("a11y-text-size");
  root.dataset.textSize = ["100", "115", "130", "150"].indexOf(size) >= 0 ? size : "100";
  ["contrast", "font", "spacing", "links"].forEach(function (key) {
    if (get("a11y-" + key) === "on") root.dataset[key] = "on";
  });
})();
