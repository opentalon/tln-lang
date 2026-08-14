/*
 * Tln syntax highlighter.
 *
 * Chroma (Hugo's highlighter) has no Tln lexer, so we colorize `.tln` code
 * blocks on the client. Keyword sets and token rules are ported verbatim from
 * the maintained Tln Monaco editor grammar, which itself mirrors the Tln Go
 * lexer (tln-language/internal/lexer). Keep in sync with that.
 *
 * Scoped strictly to `code.language-tln` — every ```tln fenced block on the
 * site plus the Tln pane of the {{< compare >}} shortcode. Nothing else.
 */
(function () {
  "use strict";

  var BLOCK = new Set(["detect", "rule", "recommend", "combine", "define", "workflow", "predict", "forecast", "cluster", "classify", "find", "test"]);
  var CLAUSE = new Set(["for", "where", "when", "and", "or", "not", "in", "is", "has", "attr", "type", "category", "status", "flag", "label", "priority", "block", "allow", "reason", "action", "suggest", "return", "best", "minimize", "maximize", "requires", "approval", "from", "role", "before", "after", "every", "on", "step", "depends_on", "mcp", "invoke", "context", "category_tree"]);
  var ML = new Set(["anomaly", "compared_to", "series", "over", "within", "same", "similar", "calculate", "threshold", "learned_threshold", "trained_on", "features", "confidence"]);
  var UNIT = new Set(["days", "weeks", "months", "years", "km", "last", "next", "matching", "records", "items", "each", "today", "changed_to"]);
  var STROP = new Set(["contains", "starts_with", "ends_with", "older_than", "newer_than"]);
  var PRIORITY = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]); // case-sensitive
  var BOOL = new Set(["true", "false"]);
  var TEST = new Set(["given", "expect", "flagged", "record"]);

  function wordClass(w) {
    if (BLOCK.has(w)) return "tln-block";
    if (PRIORITY.has(w)) return "tln-priority";
    if (BOOL.has(w)) return "tln-bool";
    if (ML.has(w)) return "tln-ml";
    if (STROP.has(w)) return "tln-strop";
    if (CLAUSE.has(w)) return "tln-clause";
    if (UNIT.has(w)) return "tln-unit";
    if (TEST.has(w)) return "tln-test";
    return null;
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function span(cls, text) {
    return '<span class="' + cls + '">' + esc(text) + "</span>";
  }

  function isIdentStart(c) { return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_"; }
  function isIdent(c) { return isIdentStart(c) || (c >= "0" && c <= "9"); }
  function isDigit(c) { return c >= "0" && c <= "9"; }

  // Reads a "..." string starting at index i (src[i] === '"'). Handles \escapes
  // and {interpolation}. Returns [html, nextIndex].
  function readString(src, i, n) {
    var out = span("tln-str", '"');
    var plain = "";
    var j = i + 1;
    function flush() { if (plain) { out += span("tln-str", plain); plain = ""; } }
    while (j < n) {
      var ch = src[j];
      if (ch === '"') { flush(); out += span("tln-str", '"'); j++; return [out, j]; }
      if (ch === "\\") { flush(); out += span("tln-escape", src.substr(j, 2)); j += 2; continue; }
      if (ch === "{") {
        flush();
        var k = src.indexOf("}", j + 1);
        if (k === -1) k = n - 1;
        out += span("tln-interp", src.slice(j, k + 1));
        j = k + 1;
        continue;
      }
      plain += ch;
      j++;
    }
    flush(); // unterminated string
    return [out, j];
  }

  function highlight(src) {
    var out = "";
    var i = 0;
    var n = src.length;
    while (i < n) {
      var c = src[i];

      // line comment
      if (c === "/" && src[i + 1] === "/") {
        var e = src.indexOf("\n", i);
        if (e === -1) e = n;
        out += span("tln-com", src.slice(i, e));
        i = e;
        continue;
      }
      // block comment
      if (c === "/" && src[i + 1] === "*") {
        var b = src.indexOf("*/", i + 2);
        b = b === -1 ? n : b + 2;
        out += span("tln-com", src.slice(i, b));
        i = b;
        continue;
      }
      // string
      if (c === '"') {
        var r = readString(src, i, n);
        out += r[0];
        i = r[1];
        continue;
      }
      // identifier / keyword
      if (isIdentStart(c)) {
        var j = i + 1;
        while (j < n && isIdent(src[j])) j++;
        var w = src.slice(i, j);
        var cls = wordClass(w);
        out += cls ? span(cls, w) : esc(w);
        i = j;
        continue;
      }
      // number (int or float)
      if (isDigit(c)) {
        var k = i + 1;
        while (k < n && (isDigit(src[k]) || src[k] === ".")) k++;
        out += span("tln-num", src.slice(i, k));
        i = k;
        continue;
      }
      // multi-char operators
      var two = src.substr(i, 2);
      if (two === "==" || two === "!=" || two === "<=" || two === ">=" || two === "~=") {
        out += span("tln-op", two);
        i += 2;
        continue;
      }
      // single-char operators
      if ("<>+-*/%".indexOf(c) !== -1) {
        out += span("tln-op", c);
        i++;
        continue;
      }
      // anything else (brackets, punctuation, whitespace)
      out += esc(c);
      i++;
    }
    return out;
  }

  function process(el) {
    if (el.dataset.tlnHighlighted) return;
    el.innerHTML = highlight(el.textContent);
    el.dataset.tlnHighlighted = "1";
  }

  function run() {
    var nodes = document.querySelectorAll("code.language-tln");
    for (var i = 0; i < nodes.length; i++) process(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
