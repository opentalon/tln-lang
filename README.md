# tln-lang.org

The website for **[Tln](https://github.com/opentalon/tln-language)** — the modern expert-system
language that modernizes Prolog into a deterministic, testable, data-native rule platform.

**Live:** https://tln-lang.org · **Source of truth for the language:** [`opentalon/tln-language`](https://github.com/opentalon/tln-language)

Built with [Hugo](https://gohugo.io) (extended) and the
[PaperMod](https://github.com/adityatelange/hugo-PaperMod) theme, deployed to GitHub Pages.

---

## Quick start

Requires **Hugo extended ≥ 0.161** and Git.

```bash
git clone --recurse-submodules https://github.com/opentalon/tln-lang.git
cd tln-lang
hugo server            # http://localhost:1313
```

If you cloned without `--recurse-submodules` (the PaperMod theme lives in a submodule):

```bash
git submodule update --init --recursive
```

Build the static site into `public/`:

```bash
hugo --gc --minify
```

`public/` is **not** committed — CI builds and deploys it (see [Deployment](#deployment)).

---

## Project structure

```
content/
  _index.md              Home (hero, "Why Tln?", flagship comparison)
  docs/                  Language: getting-started, reference (incl. metaprogramming)
  comparisons/           Prolog → Tln, side-by-side (insurance, recursion, fleet, family)
  beyond-prolog/         MCP & workflows, built-in ML, testing, metaprogramming
  plugins.md             tln-mcp (tools), tln-io (I/O), tln-db (storage), tln-asp (solver), tln-prolog (runtime)
  workflows.md           deterministic agents — LLM authors once, runtime executes
  db.md                  tln-db deep-dive
  opentalon.md           Tln in production — the OpenTalon orchestration system
layouts/
  shortcodes/compare.html, pane.html    side-by-side comparison
  partials/extend_head.html             SEO: JSON-LD + meta
  partials/extend_footer.html           GitHub corner icon + Tln highlighter <script>
assets/
  js/tln-highlight.js                   client-side Tln syntax highlighter
  css/extended/*.css                    compare, tln theme, sidebar, gh-corner (PaperMod auto-loads)
static/                                  CNAME, robots.txt, llms.txt, favicon.svg
hugo.toml                                config + left-sidebar menu
.github/workflows/deploy.yml             GitHub Pages deploy
```

---

## Authoring content

Pages are Markdown with front matter. Always include a `description` (used for the meta
description and Open Graph):

```markdown
---
title: "My page"
description: "One-sentence summary for search engines and LLMs."
weight: 2          # ordering within a section
---
```

### Side-by-side comparisons

Use the `compare` / `pane` shortcodes. Left pane is Prolog, right pane is Tln:

```
{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
parent(tom, bob).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
detect "Children of Tom" {
  for records where type == "person" and attr "parent" == "tom"
  flag matching items
}
{{< /pane >}}
{{< /compare >}}
```

- `lang="prolog"` → Chroma highlighting. `lang="tln"` → the client-side Tln highlighter.
- ` ```tln ` fenced code blocks are highlighted anywhere on the site too.

### Tln syntax highlighting

`assets/js/tln-highlight.js` is a single-pass tokenizer **ported from the Tln Monaco editor
grammar** (which mirrors the Go lexer). If the language keywords change upstream, update the
keyword sets there to keep them in sync.

---

## Validating examples (please do this!)

Every code sample on the site is checked against a real toolchain — **please keep it that way**:

- **Prolog** — syntax-checked with SWI-Prolog:
  ```bash
  swipl -q -g halt -t halt your_example.pl
  ```
- **Tln** — validated with the actual compiler. Build it from the language repo (Go ≥ 1.24):
  ```bash
  git clone https://github.com/opentalon/tln-language
  cd tln-language && go build -o /tmp/tln ./cmd/tln
  /tmp/tln build your_example.tln          # parse + validate + show the plan
  /tmp/tln test  rules.tln rules.tln.test  # run assertions
  ```

If a construct is **proposed / not yet in the grammar** (e.g. the `defmacro` metaprogramming
syntax, or recursive-rule surface syntax), label it clearly and don't claim it compiles — show the
validated *expansion* / equivalent instead.

---

## Contributing

1. Fork and branch from `master`.
2. Make changes; run `hugo server` and verify locally.
3. **Validate every new/changed code example** (Prolog with `swipl`, Tln with `tln build`).
4. Keep prose grounded in the real repos — link to `opentalon/tln-language`, `tln-mcp`, `tln-db`,
   `tln-asp`, `tln-prolog`, and cite ADRs/PRs where relevant.
5. Open a PR.

Conventions:

- The language is **Tln** — don't write "Talon". (The umbrella ecosystem is **OpenTalon**, which
  keeps its name.)
- Describe Tln accurately: a **native-Go** engine (lexer → parser → validator → planner →
  executor) over a pluggable `FactStore`. It does **not** compile to Prolog.
- Facts are loaded externally as `record`/`attr` triples — never written in `.tln`.

---

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds with Hugo extended and
publishes to GitHub Pages. The custom domain `tln-lang.org` is set via `static/CNAME`; DNS uses the
GitHub Pages apex A records plus a `www` CNAME to `opentalon.github.io`.

## License

Content and configuration: Apache-2.0 (matching the Tln projects), unless noted otherwise. The
PaperMod theme is MIT, © its authors.
