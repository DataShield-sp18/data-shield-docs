# data-shield-docs

Stakeholder-facing documentation site for Data Shield — a Docusaurus site,
separate from the engineering wiki (`.wiki/` in the main `data-shield` repo)
and from the end-user manual (`user_docs/` there). See `BUILD_PROMPT.md` for
the brief this site was built from.

## Local development

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

## Hosting

Deployed to GitHub Pages. Public repo/site with a `robots.txt` that
disallows indexing (unlisted-URL protection, not real access control — a
deliberate, informed tradeoff for this early POC stage; see
`docs/architecture/security.md`).
