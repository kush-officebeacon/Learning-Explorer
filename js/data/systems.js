/** Atlas rooms. Each beat is one click-deeper idea, not a chapter. */
export const SYSTEMS = [
  {
    slug: "architecture",
    kicker: "Map",
    title: "How the code is split",
    summary: "Three layers. Plumbing never imports the business. The HTTP app mostly starts and watches work.",
    files: [
      "backend/src/interfaces/main.py",
      "backend/src/interfaces/worker.py",
      "backend/src/infrastructure/",
      "backend/src/modules/",
    ],
    related: [
      { label: "Factory floor", href: "#/floor" },
      { label: "API surface", href: "#/atlas/api" },
    ],
    beats: [
      {
        title: "interfaces",
        body: "main.py is the FastAPI process. worker.py is the Taskiq process. api/v1/__init__.py is the one file that mounts every public route, so the URL space is readable in one place.",
      },
      {
        title: "infrastructure",
        body: "Auth, database, workers, encryption, logging, cache, rate limit. No domain knowledge. It must never import modules. When a shared helper starts to know about purchase orders, it usually belongs in a module.",
      },
      {
        title: "modules",
        body: "Vertical slices: email, extraction, validation, erp, skydoc, workflow, connectors, ai, tenancy, catalog, reviews, portal, rbac. Routes stay thin. Services own rules. Repositories own queries.",
      },
      {
        title: "The factory vs the control panel",
        body: "The API is the control panel: login, reviews, retries, connector setup. The workers are the factory. Redis is the job board. Postgres is the logbook.",
      },
    ],
  },
  {
    slug: "workflow",
    kicker: "Supervisor",
    title: "Workflow engine",
    summary: "Each worker finishes and leaves. advance() reads the plan. Reordering the line is a JSON edit.",
    files: ["backend/src/modules/workflow/engine.py", "backend/src/modules/workflow/settings.py"],
    related: [
      { label: "Queues", href: "#/atlas/queues" },
      { label: "Tenancy", href: "#/atlas/tenancy" },
      { label: "Watch a run", href: "#/sim" },
    ],
    beats: [
      {
        title: "The loop",
        body: "run_step opens a stage run, calls the handler, records the outcome, then advance. Next step in the plan gets an outbox row. A branch can pause. Nothing left and a review is open means awaiting_review. Nothing left otherwise means completed.",
      },
      {
        title: "Facts come from columns",
        body: "A branch like handling = forward_only is matched against columns on the workflow, not against a second JSON bag. Two copies of the same fact eventually disagree.",
      },
      {
        title: "Snapshots",
        body: "Settings are copied onto the workflow at the start, and again when Worker 2 resolves the brand. An email already in flight keeps the rules it started under. Editing tenant JSON does not rewrite it.",
      },
      {
        title: "Progress",
        body: "percent_complete is the weighted sum of finished steps, not count divided by total, so a four-step tenant and a seven-step tenant both read honestly. ETA uses historical average duration per worker, falling back to the configured timeout.",
      },
    ],
  },
  {
    slug: "ai",
    kicker: "Model",
    title: "How a model call happens",
    summary: "Workers ask for the VLM role. The gateway uses that tenant's URL, model, and key. Nothing is hardcoded to one vendor.",
    files: [
      "backend/src/modules/ai/gateway.py",
      "backend/src/modules/ai/gemini.py",
      "backend/src/modules/ai/profiles.py",
      "backend/src/modules/ai/fallback.py",
      "backend/src/modules/ai/redaction/",
    ],
    related: [
      { label: "Worker 2", href: "#/worker/w2_vlm_classify" },
      { label: "Worker 3", href: "#/worker/w3_extract" },
      { label: "Connectors", href: "#/atlas/connectors" },
    ],
    beats: [
      {
        title: "Two providers",
        body: "Connector type vlm is an OpenAI-compatible HTTP endpoint, called with httpx on purpose so a slightly different gateway does not fight an SDK. Connector type gemini uses the Google GenAI client against Vertex. A tenant switches by pointing settings.connectors.vlm at gemini. Other tenants stay on the compatible endpoint.",
      },
      {
        title: "PDFs become pictures",
        body: "Pages are rasterized at 150 DPI to JPEG, max edge 2000px, max 50 pages. Higher DPI grows every image quadratically and buys more tokens, not more accuracy. pypdfium2 runs in one child process so a native crash does not kill the worker.",
      },
      {
        title: "Limits differ by model",
        body: "The self-hosted vision model is tuned around a 25k token window. Gemini's window is about a million tokens and it spends output tokens thinking before it answers. Those limits live in code profiles, not in connector JSON, so a hand-edited row cannot silently shrink them.",
      },
      {
        title: "Retries, fallback, kill switches",
        body: "Timeouts grow 1.5x per attempt up to 10 minutes. 429s back off. 4xx that means a bad request is not retried. Gemini can fall over to GEMINI_FALLBACK_MODEL after repeated capacity failures (504, 429, timeout) inside 30 minutes. LLM_GATEWAY_ENABLED is the deployment-wide kill switch. LLM_ATTACHMENT_SHARING_ENABLED is the data-governance gate for handing the model attachment URLs.",
      },
      {
        title: "Redaction",
        body: "Presidio plus a Luhn check masks card numbers before a prompt leaves the process. CVC and expiry are only masked when the label beside them makes them meaningful. Pixel redaction covers the same idea on images.",
      },
      {
        title: "Prompts you can open",
        body: "Triage and SKU prompts sit beside Worker 2. Classify and extract prompts sit under pdf_extraction, with sha256 files so a prompt change is detectable. prompt_version on the extraction records which text produced the payload.",
      },
    ],
  },
  {
    slug: "connectors",
    kicker: "Keys",
    title: "Connectors and API keys",
    summary: "Secrets live on a per-tenant row, encrypted. The .env file is for the deployment, not for NetSuite or the model.",
    files: [
      "backend/src/modules/connectors/resolver.py",
      "backend/src/modules/connectors/models.py",
      "backend/src/infrastructure/security/crypto.py",
      "backend/scripts/connect_from_env.py",
    ],
    related: [
      { label: "AI gateway", href: "#/atlas/ai" },
      { label: "Auth", href: "#/atlas/auth" },
      { label: "Deploy", href: "#/atlas/deploy" },
    ],
    beats: [
      {
        title: "Roles, not vendors",
        body: "A worker asks for a role: email, storage, vlm, dms, or erp. settings.connectors maps the role to a vendor string such as outlook, s3, vlm, gemini, or netsuite. Moving a tenant from NetSuite to SAP is one string, and the next run picks up the other row.",
      },
      {
        title: "Brand beats tenant",
        body: "A connector scoped to a sub-tenant wins over the tenant-wide row of the same vendor. One brand can have its own NetSuite account while its siblings share the parent's. Partial unique indexes make 'which one' unambiguous.",
      },
      {
        title: "config vs config_enc",
        body: "config holds non-secrets: account id, model name, bucket, timeouts. config_enc holds the API key, OAuth refresh token, or NetSuite TBA secrets (consumer key and secret, token id and secret). Decrypted secrets live in memory for one step and are never logged.",
      },
      {
        title: "Encryption",
        body: "A per-row data key is sealed with AES-256-GCM. Tenant and column travel as associated data, so ciphertext copied onto another tenant's row fails to decrypt. ENCRYPTION_PROVIDER=local wraps that key with ENCRYPTION_KEYS. aws_kms wraps it with a key that never enters the process. Old v1 Fernet values still decrypt. Reading looks at the tag inside the ciphertext, not at the current provider, so you can switch without a migration.",
      },
      {
        title: "What must stay out of .env",
        body: "Mailbox, LLM, bucket, and NetSuite credentials are not read on the request path. A unit test walks the source and fails if a credential-shaped setting is read. scripts/connect_from_env.py is the allowed exception: it seals environment values onto a connector row at setup time. FedEx and UPS client ids are deployment-wide and do live in settings, because Worker 4 uses them for transit math.",
      },
      {
        title: "OAuth vs API key",
        body: "Outlook and Gmail stay disconnected until the token handshake sets status=active. VLM, S3, and NetSuite become active once credentials are saved. S3 can also run on a bucket alone, using the instance credential chain.",
      },
    ],
  },
  {
    slug: "validation",
    kicker: "Rules",
    title: "Worker 4 in one room",
    summary: "Customer, item, dates, charges, duplicate PO, order type. Then two JSON bodies, still not posted.",
    files: [
      "backend/src/modules/validation/workers.py",
      "backend/src/modules/validation/customers.py",
      "backend/src/modules/order_types/",
    ],
    related: [
      { label: "Worker 4", href: "#/worker/w4_validate" },
      { label: "338 vs 340", href: "#/compare/forms" },
      { label: "Data model", href: "#/atlas/data" },
    ],
    beats: [
      {
        title: "Cascade",
        body: "Email, domain, phone, zip, country and state, city, name. Plant zips (Hub Pen and BST buildings) are ignored so a factory address does not become the customer. Factory email domains and name stopwords are settings. Sister accounts that share a domain, like a large buying group, are broken apart by company name.",
      },
      {
        title: "What else it checks",
        body: "Duplicate PO against real NetSuite orders. Artwork present, or fetched from a URL the PO points at. Repeat-order detection. Promo and setup charges, PMS match, line charges. Ship dates planned with the warehouse calendar, and FedEx or UPS transit when the printed ship date has to be backed into a production date. Quantity-only revisions become an order_changes row and stop.",
      },
      {
        title: "338 and 340",
        body: "Both bodies are assembled here and stored on the extraction. 338 is the preflight: dummy customer, dummy zero-priced item, so a human can look at attachments on a real transaction. 340 is the real body: actual customer, real lines, priority, addresses. Worker 5 posts 338. Worker 7 patches 340 onto the same record.",
      },
      {
        title: "A miss is not an error",
        body: "Customer unresolved or a non-MVP order type returns success with a review. Retrying would not find a customer that is not in the table. NetSuite being down is the opposite: that raises and the queue retries.",
      },
    ],
  },
  {
    slug: "erp",
    kicker: "NetSuite",
    title: "ERP and SkyDoc",
    summary: "Token-based auth, SuiteQL for lookups, REST for the sales order, a RESTlet for documents.",
    files: [
      "backend/src/modules/erp/netsuite.py",
      "backend/src/modules/erp/records.py",
      "backend/src/modules/erp/workers.py",
      "backend/src/modules/erp/convert.py",
      "backend/src/modules/skydoc/workers.py",
    ],
    related: [
      { label: "Worker 5", href: "#/worker/w5_erp_preflight" },
      { label: "Worker 7", href: "#/worker/w7_erp_convert" },
      { label: "Connectors", href: "#/atlas/connectors" },
    ],
    beats: [
      {
        title: "The connector row",
        body: "config.account_id is also the OAuth realm. api_hostname defaults to the account's SuiteTalk host. config_enc holds consumer_key, consumer_secret, token_id, token_secret. Form ids are not here. They are business choices on the tenant: erp.preflight.form_id (often 338) and erp.real.form_id (often 340).",
      },
      {
        title: "What gets stored locally",
        body: "payload_snapshot is the body actually sent. external_so_id comes from the Location header of the 204. external_so_link is the NetSuite URL. Worker 5 does not GET the record afterward. Worker 7 updates so_kind, form, and snapshot, and leaves the external id alone because it still names the same record.",
      },
      {
        title: "SuiteQL",
        body: "Worker 4 uses live SuiteQL for repeat detection, how many sales orders a clone candidate already has, and item autosuggest when a color or imprint process has to be picked. That is read-only. The POST and PATCH belong to Workers 5 and 7.",
      },
      {
        title: "SkyDoc",
        body: "Same TBA token. A RESTlet script and deploy id live in settings, plus folder and category maps. upload_pass 1 is the preflight filing. Sensitive customers can be forwarded at this point using addresses in settings, but the sensitive flag itself comes from the customer row.",
      },
    ],
  },
  {
    slug: "email",
    kicker: "Inbox",
    title: "Mailbox sync",
    summary: "One scheduler claims due mailboxes. Fetch is per mailbox, not per message, so the token is refreshed once.",
    files: [
      "backend/src/modules/email/tasks.py",
      "backend/src/modules/email/providers/microsoft.py",
      "backend/src/modules/email/forward.py",
    ],
    related: [
      { label: "Worker 1", href: "#/worker/w1_fetch_email" },
      { label: "Queues", href: "#/atlas/queues" },
    ],
    beats: [
      {
        title: "The clock",
        body: "email.dispatch_due runs every minute, matching workers.scheduler.connection_sync_cron. It claims the connector, commits that claim, then enqueues fetch_mailbox. Two schedulers would double-fire. Jobs are idempotent, so it is survivable, but still wrong. Keep one scheduler replica.",
      },
      {
        title: "Stranded messages",
        body: "Fetch writes the message and starts the workflow in two transactions. email.sweep_stranded runs every five minutes and starts workflows for messages that were stored but never picked up.",
      },
      {
        title: "Push is not wired",
        body: "Polling works. The provider interface has subscribe and renew, and the Microsoft implementation exists, but nothing drives it: no webhook, no renewal job. Gmail would also need Pub/Sub. Adopting push is a day of work, not a redesign.",
      },
      {
        title: "Forwarding",
        body: "MAILBOX_FORWARDING_ENABLED controls whether a vendor match actually sends. Off still records the email_forwards row and still halts the pipeline. Only the Graph send is suppressed.",
      },
    ],
  },
  {
    slug: "tenancy",
    kicker: "Companies",
    title: "Tenants, brands, settings",
    summary: "A tenant is the company. A sub-tenant is a brand. Onboarding should be an INSERT, not a deploy.",
    files: ["backend/src/modules/tenancy/", "backend/db/README.md"],
    related: [
      { label: "Connectors", href: "#/atlas/connectors" },
      { label: "Config vs code", href: "#/atlas/config" },
    ],
    beats: [
      {
        title: "Inheritance",
        body: "effective_settings is COALESCE(sub_tenant.settings, tenant.settings). NULL on the brand means inherit. A non-NULL document replaces the parent entirely. It is not a deep merge, because merges have to answer 'what happens to an array?' and every answer surprises someone.",
      },
      {
        title: "Brands are rows",
        body: "Worker 2 matches catalogue keys against active sub_tenants: Handstands, Origaudio, Best Promotions. Adding a brand is one INSERT with settings NULL. Alternate spellings the model might return belong on that sub-tenant as aliases.",
      },
      {
        title: "What is data",
        body: "New tenant, new brand, new connector, reordered workers, a newly enabled order type, even a Gmail plus SAP tenant: all data. A brand-new worker handler needs code once. An eighth order-type slug needs an enum value. A new connector category needs the enum. A new vendor inside an existing category is a row.",
      },
      {
        title: "Do not trust the top README blindly",
        body: "The root README still describes the generic organization scaffold this repo started from. The live model is tenants, sub_tenants, workflows, and sales orders. SETUP.md and backend/db/README.md are the ones that match the code. Migrations already exist. Do not autogenerate an initial one.",
      },
    ],
  },
  {
    slug: "auth",
    kicker: "Door",
    title: "Login, sessions, permissions",
    summary: "A signed JWT is not enough. Every request also checks a Redis session, a token epoch, and whether the account is suspended.",
    files: [
      "backend/src/infrastructure/auth/",
      "backend/src/modules/auth/service.py",
      "backend/src/modules/rbac/",
    ],
    related: [
      { label: "API surface", href: "#/atlas/api" },
      { label: "Data model", href: "#/atlas/data" },
    ],
    beats: [
      {
        title: "Four checks",
        body: "1. Signature and expiry. 2. Session record in Redis — missing means revoked. 3. Token epoch matches the user — bumping it kills every device. 4. Account is not suspended. Steps 2–4 are one Redis round trip. ACCESS_TOKEN_TTL only delays permission changes. Revocation does not wait for it.",
      },
      {
        title: "Fail closed",
        body: "SESSION_FAIL_OPEN defaults to false. If Redis is down, everyone is logged out. True would serve requests on the signature alone, which is the one window where a revoked session still works. The rate limiter does the opposite and fails open, because a limiter outage should not 429 the world.",
      },
      {
        title: "Permissions, not role names",
        body: "Endpoints declare a permission code. Roles bundle codes in the database. You cannot grant a permission you do not hold. An organization must keep at least one owner. Platform staff (is_superuser) bypass tenant checks, and that bypass is audited. The catalogue is authored by a migration, not projected out of role arrays, so a typo cannot become a permission that authorizes nothing.",
      },
      {
        title: "Two doors",
        body: "Operators use the admin and review APIs. The customer portal at /api/v1/portal uses the same session but permission order.read_own, and matches the caller's email to customers.email. There is no second token type.",
      },
      {
        title: "Refresh reuse",
        body: "A ten-second grace covers two tabs refreshing at once. Beyond that, presenting a used refresh token is treated as theft and the whole session is revoked. The metric auth.sessions.revoked with reason refresh_token_reuse is the alarm for that.",
      },
    ],
  },
  {
    slug: "queues",
    kicker: "Job board",
    title: "Queues, retries, outbox",
    summary: "Four queues split by cost, one scheduler, and a database outbox so a commit and a publish cannot disagree.",
    files: [
      "backend/src/interfaces/worker.py",
      "backend/src/infrastructure/workers/",
      "docker-compose.yml",
    ],
    related: [
      { label: "Compare the queues", href: "#/compare/queues" },
      { label: "Workflow engine", href: "#/atlas/workflow" },
    ],
    beats: [
      {
        title: "critical",
        body: "User-visible and time-sensitive. Mail fetch, and resume after approval (Worker 7). Small concurrency so it cannot eat the database pool.",
      },
      {
        title: "triage",
        body: "Worker 2. Fast relative to extraction (about 13 seconds median) but it can burst and flood the extract queue, so concurrency is capped.",
      },
      {
        title: "extract",
        body: "Worker 3. Slowest and most expensive. Scale this one first. PDF rendering is isolated so a native crash stays in a child process.",
      },
      {
        title: "default",
        body: "Ordinary work against external systems: validation, preflight, SkyDoc, and the rest that is not on a dedicated queue.",
      },
      {
        title: "Retries and dead letters",
        body: "Exponential backoff with jitter, and only for errors that might vanish. A ValueError from bad arguments fails the same way every time; retrying it four times only hides the bug. After the budget, the task lands in Postgres with arguments, traceback, and trace id, and can be replayed. Alert on any non-zero dead-letter rate.",
      },
      {
        title: "Outbox",
        body: "The intent to publish is written in the same transaction as the state change. A relay ships it a moment later. Delivery is at-least-once, so consumers must be idempotent. Worker 5's externalId check is that idea applied to NetSuite.",
      },
      {
        title: "Redis is four databases",
        body: "0 cache, 1 rate limiter, 2 sessions, 3 task queue. A cache flush must not log everyone out. SESSION_STORE_BACKEND=memory cannot revoke across processes and is refused in production.",
      },
    ],
  },
  {
    slug: "storage",
    kicker: "Files",
    title: "Object storage",
    summary: "Attachments and rendered pages live in S3. The model fetches them with a short-lived presigned URL.",
    files: ["backend/src/modules/connectors/storage.py", "backend/src/infrastructure/storage/"],
    related: [
      { label: "AI gateway", href: "#/atlas/ai" },
      { label: "Worker 1", href: "#/worker/w1_fetch_email" },
    ],
    beats: [
      {
        title: "Two TTLs",
        body: "STORAGE_PRESIGN_TTL_SECONDS (15 minutes) is for the model fetching during a call. STORAGE_DOWNLOAD_TTL_SECONDS (1 hour) is for a human clicking a link in the UI. A presigned URL is a bearer credential.",
      },
      {
        title: "Attacker-controlled files",
        body: "Attachment max 50 MB, 35 per message. Archives cap total uncompressed size, per-member size, member count, compression ratio (about 120x; a zip bomb is 1000x), and nesting depth 2. Sizes declared by the archive are not trusted; members are read in bounded chunks.",
      },
    ],
  },
  {
    slug: "data",
    kicker: "Logbook",
    title: "Tables that matter",
    summary: "Postgres is the source of truth. Metrics are views, not counters you can forget to increment.",
    files: ["backend/db/README.md", "backend/src/modules/workflow/models.py"],
    related: [
      { label: "Open the table index", href: "#/atlas/tables" },
      { label: "Two logs", href: "#/compare/logs" },
    ],
    beats: [
      {
        title: "Pipeline tables",
        body: "email_messages, email_threads, email_attachments hold the mail. workflows and workflow_stage_runs hold the run. extractions and product_extractions hold the model output. sales_orders holds preflight and real. document_filings holds SkyDoc. human_reviews holds the pause.",
      },
      {
        title: "Reference data",
        body: "products is the live catalogue, loaded from hpg_catalogue.json. customers and customer_addresses are the NetSuite export Worker 4 matches against. Without them, realistic orders stop at customer unresolved no matter how good the model was.",
      },
      {
        title: "Two logs",
        body: "audit_logs answers what changed on this entity, with before and after images. activity_logs answers what the system and its users did, with worker_key, reason, explanation, and correlation id. An approval writes both, for different questions.",
      },
      {
        title: "Views",
        body: "v_tenant_ops_metrics, v_tenant_ops_failures, v_tenant_worker_runtime, v_email_process_timings. A counter table goes permanently wrong the first time a write is skipped. A view cannot.",
      },
    ],
  },
  {
    slug: "api",
    kicker: "Control panel",
    title: "HTTP API",
    summary: "Everything public is mounted in one file under /api/v1. Docs live at /docs. Staff SQLAdmin lives at /admin and should be off in production.",
    files: ["backend/src/interfaces/api/v1/__init__.py"],
    related: [
      { label: "Auth", href: "#/atlas/auth" },
      { label: "Endpoint groups", href: "#/atlas/endpoints" },
    ],
    beats: [
      {
        title: "What you call",
        body: "Auth. Admin CRUD for tenants, brands, roles, users, connectors. Self-service connectors and retention. Workflows: list, retry, rerun from a step, reprocess the same email, cancel. Reviews: queue, assign, escalate, decide. Portal orders for the customer. Metrics. Email forwards. Feedback.",
      },
      {
        title: "Errors",
        body: "Every failure has the same shape: error.code, message, details, request_id. Clients branch on the code. Stack traces, SQL, and upstream text stay in the logs. Cross-tenant reads return 404, not 403, so you cannot confirm that another tenant's row exists.",
      },
      {
        title: "Request id",
        body: "X-Request-ID is echoed on the response and written onto the audit row, every log line, and the trace. One string ties a complaint to everything that happened.",
      },
    ],
  },
  {
    slug: "deploy",
    kicker: "Run it",
    title: "Local stack and production gates",
    summary: "Compose runs Postgres, Redis, the API, four workers, and exactly one scheduler. Production refuses to boot if the unsafe switches are on.",
    files: ["docker-compose.yml", "backend/.env.example", "SETUP.md"],
    related: [
      { label: "Queues", href: "#/atlas/queues" },
      { label: "Connectors", href: "#/atlas/connectors" },
    ],
    beats: [
      {
        title: "Processes",
        body: "db (Postgres 17), redis, api, worker-critical, worker-triage, worker-default, worker-extract, scheduler. Pool size is per process. Six processes times a pool of 20 would exceed Postgres's default 100 connections, which is why the example uses a pool of 5.",
      },
      {
        title: "First boot",
        body: "Copy .env.example. Generate SECRET_KEY and ENCRYPTION_KEYS. alembic upgrade head (migrations already exist). python -m scripts.seed for roles and a superadmin. Then import the catalogue and a customer export, and connect Outlook, VLM, S3, and NetSuite. Seed does not create tenants or connectors.",
      },
      {
        title: "Observability",
        body: "Sentry instruments FastAPI, SQLAlchemy, Redis, and httpx. No DSN means init runs and sends nothing, so local and CI stay quiet. Worth alerting: dead letters, refresh-token reuse, mailboxes needing reauth, and a growing outbox backlog. PII is not sent unless you deliberately turn it on.",
      },
      {
        title: "Production refuses",
        body: "Real SECRET_KEY and ENCRYPTION_KEYS. CREATE_TABLES_ON_STARTUP false. CORS origins named, not star. Sessions in Redis. TRUSTED_PROXY_HOPS matching the real proxy depth. Docs and SQLAdmin off unless staff need them. One scheduler.",
      },
      {
        title: "Carriers",
        body: "FedEx and UPS credentials in the environment are for Worker 4 ship-date math. Default product is UPS Ground. FedEx is used when the PO names FedEx.",
      },
    ],
  },
  {
    slug: "config",
    kicker: "Boundary",
    title: "Settings vs code",
    summary: "If onboarding a tenant needs a migration, something leaked into the schema.",
    files: ["backend/db/README.md"],
    related: [
      { label: "Tenancy", href: "#/atlas/tenancy" },
      { label: "Workflow engine", href: "#/atlas/workflow" },
    ],
    beats: [
      {
        title: "JSON is enough",
        body: "Worker order and weights. Branches that skip or pause. Connector role map. Mail folders. Validation cascade. Order types in the MVP list. NetSuite form ids, static ids, and list maps. SkyDoc folders and categories. Vendor forward addresses.",
      },
      {
        title: "Code is required",
        body: "A new worker_key with no handler. A new connector category enum. An eighth order type. A new external system that does not fit the gateway or the NetSuite client.",
      },
      {
        title: "Credentials are rows",
        body: "Even values that happen to sit in .env for local seeding (LLM endpoint, Gemini project, NetSuite TBA) are supposed to be sealed onto erp_connectors. Deleting them as dead code breaks seeding, but reading them during a request is the bug the connector rule test exists to catch.",
      },
    ],
  },
];

export function systemBySlug(slug) {
  return SYSTEMS.find((s) => s.slug === slug) || null;
}
