# Google Search Console integration: RMG MCP Hub → RMG Command Centre

Status: **implementation specification / not deployed**. Prepared 12 November 2026.
Pilot: **Alpha Paving, https://alphapaving.co.uk/**. Prioritise read-only access, reusable multi-site architecture and zero regression to existing WordPress/email MCP operations.

## Existing state (verified 12 November 2026)

- Live RMG Hub: `https://mcp.racemediagroup.co.uk/admin/`, UI reports **v0.2.3**, seven healthy WordPress site connections, existing Email Accounts section.
- **Known migration state, not a mystery:** Alpha was intentionally migrated from `https://alpha.racemediagroup.co.uk/` (old staging) to `https://alphapaving.co.uk/` (live); the old Hub WordPress site record `alpha-paving` still points at staging because it has not yet been updated. **The RMG WordPress plugin is already installed on the new live Alpha site.** Investigate the correct v0.2.3 Hub / v0.2.2 plugin re-pairing or migration flow and credentials, without assuming old credentials are portable or need manual copying.
- Command Centre code is here (`steverace/RMG-Command-Centre-NEW`), a React/Cloudflare Pages/Supabase app with its **own distinct** `/mcp` endpoint. The live WordPress/email Hub code is not established as being in this GitHub repository. Do not insert production GSC credentials into the Command Centre frontend.
- Codex has previously accessed Detectorist World's Search Console; locate and *inspect* its configuration and permission scope locally. Reuse design ideas if safe; do not print, copy to source control, or reveal tokens.

## Architectural decision

Build a **native read-only GSC adapter inside the existing RMG MCP Hub** rather than deploy a separate full-time Python MCP server or expose a third-party hosted service to client data. Use `AminForou/mcp-gsc` (MIT, v0.4.2 as inspected 12 Nov 2026) as a *reference*, only after a full source/dependency audit. `every-app/open-seo` is a broader alternative, **not** part of this pilot.

```text
                   RMG Command Centre (later)
                             |
               protected server-to-server gateway
                             |
                  Existing RMG MCP Hub
                /          |             \
        WordPress MCP   Email MCP     GSC read-only
             |              |             |
          site_id       mailbox_id     gsc_connection_id
                \          |           /
               central site registry / authorisation
                                       |
                                Google Search Console
```

Do not invent a second disconnected client/site registry or a parallel MCP authentication model. Existing Hub permissions, audit logging and encryption patterns take precedence. Future RMCC integration consumes Hub APIs/tool results **server-side**, with no browser exposure of refresh tokens, service-role keys or hub credentials.

## Phase A: pre-flight audit / security gate (no production changes)

1. In the *actual local Hub repository*, identify the current source tree, package manager/runtime, credentials encryption, SQLite schema, migrations, registered tool router, read-only aliases, release/deployment flow, rollback/backup procedure and admin UI structure. Read `docs/RESUME.md` if present.
2. Identify how Detectorist World GSC currently works in Codex (MCP name, command/server type, property ID, package/version, whether OAuth or service account, and scope only). Report **metadata only**; never echo secrets or token contents. Separately inspect how the existing RMG Hub WordPress plugin pairs: prior design used a one-time short-lived pairing code exchanged for revocable per-site Hub credentials. Confirm whether this remains the current implementation.
3. Audit `AminForou/mcp-gsc`: maintainer/history, release/tags, licence, dependency lock and vulnerable dependencies, install scripts, auth scopes, local token storage, egress/exfiltration points, write/delete tools, tests and untrusted instructions. Do not execute it, import it, or install dependencies before the verdict and owner approval.
4. Baseline the existing live Hub: connected sites, MCP tool inventory, email read functions, readonly/write separation and permissions. Verify a *restorable* backup. Do not change existing tooling merely to add GSC.
5. Confirm which GSC property covers live Alpha: prefer the exact `sc-domain:alphapaving.co.uk` if the account can access it, otherwise an exact URL-prefix property such as `https://alphapaving.co.uk/`. Never substitute the staging property.
6. Check public repository hygiene: `.env` is tracked in the public `RMG-Command-Centre-NEW` repository. Identify whether it contains only intentionally public client values; remove tracked env files and rotate any real secret discovered. Do not report secrets verbatim.

**Stop if the source repository, backup, Google authorisation ownership or permissions are unclear.**

## Phase B: backend and credential design

- Add **Google OAuth 2.0 web-server consent** from the authenticated Hub admin. Register a Google Cloud project and enable the Search Console API. Use the minimum `https://www.googleapis.com/auth/webmasters.readonly` scope. Obtain refresh tokens via `access_type=offline`, verify OAuth `state`/PKCE where supported, and protect callback/session against CSRF and account mismatch.
- Reuse the Hub's authenticated admin and encrypted-at-rest secret storage; key material is server-only. No plaintext credentials in UI, logs, Git, exported CSVs or MCP replies. Provide Connect, Connection health, Reauthorise and Disconnect controls.
- **One Google connection can expose multiple authorised properties.** Store a connection record, and bind selected GSC properties to existing Hub **site IDs**, preserving exact Google property strings (including `sc-domain:`).
- Suggested logical tables, adapt to real schema:
  - `gsc_connections`: id, display_label, account_identifier, auth_provider, encrypted_refresh_token, granted_scope, status, last_checked_at, created_at, updated_at.
  - `gsc_site_bindings`: id, hub_site_id, gsc_connection_id, gsc_property_id, permission_level, enabled, last_validated_at.
  - `gsc_audit_events` or existing general audit log: actor/client/site/tool, timestamp, outcome, count; no credentials.
- Enforce per-agent/per-client site allowlists **before** invoking the Google API. A user authorised for Alpha must not infer Detectorist World data via listing, errors or property IDs.
- Normalize errors (401 reauth needed, 403 insufficient site permissions, 404 unknown property or URL, 429 quota/rate limit, 5xx retryable) and implement bounded retries, timeouts and caching; make the refresh-token path concurrency safe.
- Do not give the model arbitrary HTTP/Google API proxy access or any write-scope token. No sitemaps submission/deletion, property removal, Google Removals action, Search Console UI automation or indexing requests in this phase.

## Phase C: minimum MCP read-only tools

Register a *small* namespaced read-only set, using existing Hub aliases/approval conventions:

1. `rmg_gsc_list_sites`: list only mapped, authorised Hub sites and connection health; don't leak all properties to client agents.
2. `rmg_gsc_search_performance`: typed site_id, start/end dates, dimensions (`date`, `page`, `query`, `device`, `country`), optional filters, row limits and pagination. Return clicks, impressions, CTR and position with date/data-freshness metadata; Google may return incomplete/top-only data.
3. `rmg_gsc_inspect_url`: inspect one or bounded batch of known URLs for a mapped site. Validate site ownership, exact host/property, URL normalisation and caller permissions before the Google request; return Google's indexed-version findings, not a fabricated live crawl test. Add quota throttling per property.
4. `rmg_gsc_list_sitemaps`: list sitemap URLs/status and recent processing details for a mapped site, read-only.
5. `rmg_gsc_site_overview`: short structured summary using the previous tools; make data sources and missing fields explicit.

Each tool must expose a clear schema, stable site ID and useful audit entry. Tools must show up in a fresh Codex MCP session. Future RMCC dashboards consume exactly these contracts through an authenticated backend gateway rather than directly hitting Google APIs from browser JS.

## Phase D: Hub UI

In the existing Hub admin add **Search Console** as a service/connection section (or integrate under existing Connections if that fits the UI):

- Google accounts: label, connected state, last checked, reconnect/disconnect.
- Discover properties visible to the connected Google identity, including its permission level.
- Bind properties to the existing Hub site record, with explicit host display and preview/confirmation.
- Site status: WordPress URL, live canonical domain, GSC property, last sync, access rights and warning when the WordPress URL differs from the selected GSC property.
- Alpha is the **first test**, not a hard-coded special case. Ability to add additional sites later without editing code.
- A connection with no permission to Alpha should produce an actionable error, not falsely show Connected.

## Phase E: Alpha hacked-site pilot (read only)

1. Establish correct Alpha **live-domain** GSC property; do not use `alpha.racemediagroup.co.uk` as a substitute.
2. Live Alpha has the RMG WordPress plugin already installed; first verify the live plugin settings. Inspect whether the correct approach is **a fresh Hub pairing** for `https://alphapaving.co.uk/` (likely), a supported in-place site migration, or safe credential rotation. Prefer creating and verifying a live connection first, then disconnecting/removing the stale staging connection only after an explicit check and approval. Confirm implications for the stable Hub site ID and future RMCC site mappings. Do not accidentally change staging or production WordPress data.
3. Fresh Codex session: prove `rmg_gsc_list_sites`, 28-day `rmg_gsc_search_performance`, `rmg_gsc_list_sitemaps`, and `rmg_gsc_inspect_url` for the live homepage, 3–5 genuine service pages and several known hacked URLs.
4. For known hacked pages, import Search Console **Page Indexing report exports** and optionally supported Search Performance rows, WordPress inventory and server logs into a **separate local audit CSV**. Fields: original_url, source, first_seen, live_http_status, gsc_index_status, last_crawl, path_pattern, classification, recommended_action, review_status.
5. Be explicit: **GSC API cannot enumerate the entire Page Indexing report nor invoke Search Console Removals**. Search Analytics does not return every indexed page. The URL Inspection API reports Google's known/indexed version, not a real-time live URL test. Verify live HTTP status separately. A 404 or 410 can be appropriate, but no server rewrites or Google removals without review.
6. Deliver: count of genuine vs suspect sample URLs; safe spam-only path prefixes (if any); recommended next steps; sitemap findings; which genuine pages are indexed or excluded; 28-day performance baseline; no credentials in artifacts.

## Acceptance tests and non-regression

- [ ] Fresh Codex MCP client sees the **existing** Hub WordPress/email tools and the 5 new read-only GSC tools.
- [ ] Seven previously healthy WordPress site connections remain healthy, and email calls work.
- [ ] Admin OAuth can connect, refresh, reconnect and revoke without logging secrets.
- [ ] One connection discovers multiple properties; property-to-site bindings persist correctly across restart.
- [ ] Caller authorised for Alpha cannot access other clients, properties, or unbound URLs.
- [ ] Index inspection host and exact property checks prevent cross-site URL probing and SSRF-like arbitrary fetch.
- [ ] Mocked Google 401, 403, 429, 5xx, slow responses, missing scopes and expired token paths handled.
- [ ] No GSC write/delete tools available to AI clients in phase one.
- [ ] Staging vs live Alpha mismatch displayed explicitly and cannot silently cross-wire.
- [ ] Codex test returns a real Search Console property list and site report, not synthetic or sample data.
- [ ] Production ZIP/release has checksum, migrations, backup, smoke tests and rollback documented; **do not deploy without owner approval**.

## Handoff for Codex (execute in small phases)

Work within the real local RMG MCP Hub repo and follow existing `AGENTS.md` and `docs/RESUME.md`. **Do not invent repo paths or overwrite deployed configuration.**

**Session 1:** audit actual Hub source and current Detectorist World Codex GSC connection; audit candidate repository, current admin UI and **the known Alpha staging-to-live WordPress MCP re-pairing procedure**. Output `GSC-PHASE-0-AUDIT.md`, specific file/change plan, evidence and risk verdict. Do not install, modify production, generate credentials or request broad Google scopes.

**Session 2:** once Phase 0 is approved, implement schema/adapter/permission checks/OAuth against local mocks, with small changes and automated tests; update docs.

**Session 3:** implement Hub UI, local end-to-end tests, release candidate and detailed rollback. Do not deploy yet.

**Session 4:** with owner approval, authorise the Google account and Alpha property, deploy and smoke test, run initial Alpha hacked-URL audit, and publish read-only metrics for future RMCC integration.

Report at the end of each session: files changed, tests, risks, tokens/approval needed, and the *single next action*. Avoid unrelated refactors and extra third-party SaaS/paid APIs.

## Sources verified (12 November 2026)

- Google API services: https://developers.google.com/webmaster-tools/v1/api_reference_index
- Google Search Console property discovery: https://developers.google.com/webmaster-tools/v1/sites/list
- Read-only OAuth and server-side refresh: https://developers.google.com/identity/protocols/oauth2/web-server
- Google URL Inspection indexed-version limitation: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- URL Inspection quota: https://developers.google.com/webmaster-tools/limits
- Search Analytics row limits: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Candidate source (audit required): https://github.com/AminForou/mcp-gsc

## Initial external-repository security triage (12 November 2026)

**Verdict: HOLD / reference-only. Not approved for installation, execution, forking into production, or access to Google credentials.** Static review only; no dependencies installed and no code executed.

Target: `AminForou/mcp-gsc`, main commit `45291df024c7873b2042c83d7add70ced7bb621f` as inspected 12 Nov 2026. The repo was created March 2025, had approximately 2,180 stars / 281 forks and a 6 Nov 2026 push. These are weak legitimacy signals, not proof of safety. MIT licence; main package `mcp-search-console` v0.4.2; normal Google OAuth/MCP dependencies, with `uv.lock` present.

**Specific source-code concerns** (from `gsc_server.py`):

1. Lines ~1771–1790: remote SSE/HTTP mode explicitly sets `mcp.settings.transport_security.enable_dns_rebinding_protection = False`. This is unacceptable unmodified for a network-exposed production service. Treat remote mode as unsafe without additional security analysis and strong authentication/network isolation.
2. Lines ~1726–1762: the exposed `reauthenticate` tool **deletes the existing OAuth token file before verifying new credentials or completing a replacement login**. That can disconnect live integrations and should not be an agent-exposed tool.
3. Lines ~1573–1620: `submit_sitemap` is directly registered as an MCP tool and calls the sitemap submit API without checking `GSC_ALLOW_DESTRUCTIVE`. The default Google read-only OAuth scope would deny this, but preexisting broader-scope credentials or changed configuration could allow it. The Hub pilot must not expose any write tools, even accidentally.
4. The package registers property add/remove and sitemap delete tools controlled by `GSC_ALLOW_DESTRUCTIVE`, and uses `webmasters` scope when enabled; inappropriate for the Phase 1 read-only pilot.
5. OAuth refresh credentials are persisted as local JSON, without project-level explicit at-rest encryption in the inspected module. A shared multi-client server requires encrypted storage, strict file/DB access and robust secret redaction.
6. Some third-party directories claim no SECURITY.md and no formal release; GitHub repository files inspected showed no .github folder or SECURITY.md in root. These are maintenance-process gaps, not evidence of maliciousness.

**What the static review did NOT find:** No apparent arbitrary shell execution, obvious exfiltration endpoint, hidden downloader, suspicious embedded domain or obvious external telemetry in the main Python module. The visible imports use Google authentication/client packages, FastMCP and standard libraries. However this is **not** a clean bill of health: no isolated execution, full commit-chain review, PyPI provenance verification or dependency CVE scan has been performed. The lockfile contains substantial transitive dependencies and requires automated vulnerability scanning and install-hook verification before any installation, even in development.

**Required follow-up security gate:** check package publisher/provenance, dependency versions against OSV/PyPI advisories, all source diffs and maintainer integrity, signed tags/release provenance if any, test code side effects, all remote transport/auth paths, tool authority boundaries, secret handling and outbound network requests. Work from a **pinned reviewed commit**, verify downloads/hashes, execute only in an isolated least-privilege test environment with dummy credentials, and ask Steve to approve use after a documented verdict. **Do not interpret this triage as permission to proceed.**

## Alpha WordPress MCP migration clarification (12 Nov 2026)

This is an expected state after migrating Alpha, not evidence of a mysterious integration error. The live WordPress site has the RMG connector plugin installed; the Hub still retains the previous staging URL. Before the Search Console pilot, inspect the implemented pairing contract, WordPress plugin configuration and credential identity. The intended original pairing flow was Hub one-time code + plugin Hub URL + dedicated rotatable site credential, but verify the currently deployed code before assuming identical behaviour. Document if a new pairing code is required for the live domain; if so, pair the new live site first, test read-only then agreed write permissions and stable capabilities, and retire the staging site after approval. Do not expose secrets, blindly copy staging credentials, silently repoint the stale record, or make Google Search Console depend on a stale WordPress connection.
