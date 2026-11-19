/** Workers 1–7 plus the dispatcher. */
export const WORKERS = [
  {
    key: "w1_fetch_email",
    num: 1,
    name: "Mail room",
    short: "Prove the email and its files are safely stored before any AI spend.",
    queue: "critical",
    stage: "EMAIL_INGESTION",
    job: "Worker 1 does not talk to Outlook. Mailbox sync already pulled the message. This step checks that every attachment has a storage path, records what arrived, and catches duplicates or forward-only senders.",
    why: "AI is expensive. If a PDF upload half-failed, you want to retry here — not after three model calls.",
    writes: ["workflow stage details", "duplicate / forward-only flags on the workflow"],
    reads: ["email.fetch", "email.folders", "connectors.email", "sender routes (layer3_routes)"],
    connectors: ["email (already used by sync)", "storage (files must already be in S3)"],
    files: [
      "backend/src/modules/email/workers.py",
      "backend/src/modules/email/tasks.py",
      "backend/src/modules/email/providers/microsoft.py",
    ],
    skips: [
      "Forward-only sender: known mailbox is forwarded and the pipeline stops. Attachments are intentionally not stored.",
      "Duplicate email: same files or same body as an earlier message.",
    ],
    fails: ["An attachment row with no storage path raises and retries. Sync is idempotent, so the retry finishes the upload."],
    related: [
      { label: "Email sync", href: "#/atlas/email" },
      { label: "Storage", href: "#/atlas/storage" },
      { label: "Run this in the simulator", href: "#/sim" },
    ],
    beats: [
      {
        title: "Who actually fetches the mail",
        body: "A scheduler job, email.dispatch_due, runs every minute. It claims mailboxes that are due and enqueues email.fetch_mailbox on the critical queue. That task uses the Outlook or Gmail connector, pages the inbox, stores the body and files, then starts a workflow. Worker 1 is the per-message gate after that.",
      },
      {
        title: "Forward-only is decided early",
        body: "Settings classification.layer3_routes can match From address or domain before any model call. handling: forward_only means no S3 upload of customer files, no extraction row, just a Graph draft-then-send. A known vendor mailbox costs zero VLM tokens.",
      },
    ],
  },
  {
    key: "w2_vlm_classify",
    num: 2,
    name: "Triage clerk",
    short: "Is this a purchase order, whose brand, and which catalogue SKUs?",
    queue: "triage",
    stage: "CLASSIFICATION",
    job: "Two model calls, then a local catalogue lookup. Call one triages the email. Call two matches product lines to SKUs. Brand comes from catalogue hits against active sub_tenants, not from a free-text guess.",
    why: "One shared mailbox serves every brand. Until Worker 2 names the brand, the workflow is still on tenant-level settings.",
    writes: ["email_threads", "extractions (created here)", "workflows.sub_tenant_id"],
    reads: ["active sub_tenants", "connectors.vlm", "connectors.storage", "email.save_only_if_valid_po", "products catalogue"],
    connectors: ["vlm", "storage"],
    files: [
      "backend/src/modules/extraction/workers.py",
      "backend/src/modules/extraction/triage_prompt.txt",
      "backend/src/modules/extraction/sku_prompt.txt",
    ],
    skips: [
      "Not a purchase order — workflow ends. No Worker 3, no extraction used downstream.",
      "Thread artwork follow-up — art files attach to an earlier order in the same thread.",
      "Thread order follow-up — a thanks, a re-forward, or art that arrived before the PO.",
      "Vendor brand — classification.vendor_brands forwards that brand's mail and stops before Worker 3.",
    ],
    fails: ["Model timeout, 429, or 5xx retries. A missing VLM connector is not retried — the tenant is not set up."],
    related: [
      { label: "AI gateway", href: "#/atlas/ai" },
      { label: "Tenancy and brands", href: "#/atlas/tenancy" },
      { label: "Connectors", href: "#/atlas/connectors" },
    ],
    beats: [
      {
        title: "Settings are snapshotted twice",
        body: "Workers 1 and 2 run on tenant settings because the brand is unknown. The moment the brand resolves, effective_settings(tenant, sub_tenant) is copied again and settings_rebound_at is stamped. Later workers follow that brand's flow. A brand's workers.order must still start with w1 and w2 or the dispatcher loses its place.",
      },
      {
        title: "vendor_brands vs brand_routing",
        body: "vendor_brands is a tenant map of brand name to forward address. A hit still writes an Extraction for audit, then forwards and stops — even if the catalogue match is incomplete. brand_routing is a per-brand override; its forward_to is informational today and does not itself send mail.",
      },
    ],
  },
  {
    key: "w3_extract",
    num: 3,
    name: "Deep read",
    short: "Pull order type, priority, lines, dates, and totals out of the document.",
    queue: "extract",
    stage: "EXTRACTION",
    job: "Two more model calls. Call 1 classifies order type, priority, and modifiers. Call 2 fills line items. PDF pages are rasterized to JPEG first so the vision model never needs a PDF parser.",
    why: "This is the slowest and most expensive step. It has its own queue so a backlog of extractions cannot starve mail fetch or triage.",
    writes: ["extractions updated (dates, totals, raw_payload.extract)", "product_extractions"],
    reads: ["connectors.vlm", "Worker 2 catalogue hits and triage payload"],
    connectors: ["vlm", "storage"],
    files: [
      "backend/src/modules/extraction/workers.py",
      "backend/src/modules/extraction/pdf_extraction/classify_prompt.txt",
      "backend/src/modules/extraction/pdf_extraction/prompt.txt",
      "backend/src/modules/extraction/pdf_extraction/pages.py",
      "backend/src/modules/extraction/pdf_extraction/isolation.py",
    ],
    skips: ["Never reached if Worker 2 already stopped the workflow."],
    fails: [
      "Timeouts widen 1.5x per attempt, capped at 10 minutes. A pathological document should become a human review, not a 40-minute retry loop.",
      "Malformed JSON is re-prompted. A timeout is not — the model was cut off, not wrong.",
    ],
    related: [
      { label: "AI gateway", href: "#/atlas/ai" },
      { label: "Extract queue", href: "#/atlas/queues" },
      { label: "Order types", href: "#/atlas/validation" },
    ],
    beats: [
      {
        title: "What the classify call decides",
        body: "Priority is a step-by-step rule in the prompt: rush basis, printed tier, ship date, in-hands days, then a first-match table. The trace is stored under raw_payload.classification.priorityTrace. A working-calendar block is appended so the model looks up warehouse days instead of counting across a weekend. Worker 4 still corrects some date mistakes afterward.",
      },
      {
        title: "Files it can read",
        body: "PDF pages via pypdfium2 (isolated in a child process), images, Excel (openpyxl / xlrd), Word, nested .eml, and Outlook .msg via olefile. Archives are expanded with hard caps on size, members, compression ratio, and nesting so a zip bomb cannot take the worker down.",
      },
    ],
  },
  {
    key: "w4_validate",
    num: 4,
    name: "Rules desk",
    short: "Match the customer, check the rules, and build both NetSuite payloads. No POST yet.",
    queue: "default",
    stage: "VALIDATION",
    job: "Local gates plus a few live SuiteQL calls: repeat orders, clone sales-order counts, and item autosuggest for the color or process child. Business misses return success plus a human review so the queue does not retry a decision that will not change.",
    why: "Workers 5 and 7 must not re-decide the customer or the SKU. If two steps own the order contents, they will eventually disagree in front of a customer.",
    writes: ["extractions.raw_payload.validation (Form 338 and Form 340 bodies)", "workflows.po_type", "human_reviews when a gate fails"],
    reads: [
      "erp.statics and lists",
      "erp.preflight dummy customer and item",
      "order_types.mvp_fully_automated and rules",
      "validation.customer cascade knobs",
      "validation.order.duplicate_po_check",
      "customers and customer_addresses",
    ],
    connectors: ["erp (SuiteQL only)", "FedEx or UPS when a ship date needs transit time"],
    files: [
      "backend/src/modules/validation/workers.py",
      "backend/src/modules/validation/customers.py",
      "backend/src/modules/validation/payload.py",
      "backend/src/modules/validation/gates.py",
      "backend/src/modules/order_types/",
    ],
    skips: [
      "Order revision: this PO is an earlier order of ours with only quantities changed. An order_changes row is written and the pipeline stops.",
    ],
    fails: [
      "Customer unresolved, missing artwork, duplicate PO, non-MVP order type — pause for review.",
      "NetSuite timeout or 429 is a real failure and can retry. A business miss is not.",
    ],
    related: [
      { label: "Validation atlas", href: "#/atlas/validation" },
      { label: "Form 338 vs 340", href: "#/compare/forms" },
      { label: "ERP", href: "#/atlas/erp" },
    ],
    beats: [
      {
        title: "Customer cascade",
        body: "Form 340 matching walks customers and customer_addresses in the order set by validation.customer.cascade: email, email domain, phone, zip, country and state, city, then name. Plant zips, factory email domains, and name stopwords are settings so a second tenant can change them without a deploy. Pricing level is filled later from NetSuite and is not part of the customer export, because a stale price level would misprice an order quietly.",
      },
      {
        title: "Order types",
        body: "Seven slugs: standard, rush, blank, sample, drop_ship, self_promo, remake. Worker 4 takes the first matching rule, otherwise the default, and always stores the result. A type outside mvp_fully_automated (often just standard) opens a review with reason order_type_not_in_mvp. Enabling another type is an array edit, not a migration.",
      },
    ],
  },
  {
    key: "w5_erp_preflight",
    num: 5,
    name: "Draft order",
    short: "POST a dummy preflight sales order so a person can review a real NetSuite record.",
    queue: "default",
    stage: "PREFLIGHT_SO_CREATION",
    job: "Creates the order on Form 338 with a dummy customer and one zero-priced dummy item. It does not pick SKUs, match customers, or call a model. Worker 4 already wrote the body.",
    why: "This is the one step that is genuinely unsafe to run twice. It creates a record in a finance system. A local check plus a NetSuite lookup by externalId stop a replay from booking a second order.",
    writes: ["sales_orders with so_kind = preflight", "external_so_id from the Location header", "payload_snapshot"],
    reads: ["erp.preflight.form_id", "connectors.erp", "raw_payload.validation.preflight"],
    connectors: ["erp"],
    files: [
      "backend/src/modules/erp/workers.py",
      "backend/src/modules/erp/records.py",
      "backend/src/modules/erp/netsuite.py",
      "backend/src/modules/erp/duplicate_guard.py",
    ],
    skips: ["If Worker 4 said the order is not ready, this step succeeds with a review attached. Raising would burn retries on an answer that will not change."],
    fails: ["NetSuite 5xx or timeout retries. A duplicate externalId is treated as the order we already created."],
    related: [
      { label: "ERP and SkyDoc", href: "#/atlas/erp" },
      { label: "Form 338 vs 340", href: "#/compare/forms" },
      { label: "Worker 7", href: "#/worker/w7_erp_convert" },
    ],
    beats: [
      {
        title: "externalId, not PO number",
        body: "The old PO-number search adopted orders that staff had keyed by hand, and other customers' orders with the same number. externalId is unique in NetSuite and is stamped by this step, so two concurrent attempts at one email cannot make two orders.",
      },
    ],
  },
  {
    key: "w6_skydoc",
    num: 6,
    name: "File cabinet",
    short: "File the PO, artwork, and email onto the preflight sales order.",
    queue: "default",
    stage: "DOCUMENT_UPLOAD",
    job: "Uploads documents through a SkyDoc RESTlet. SkyDoc is a NetSuite SuiteApp, not a separate product. It uses the same token-based authentication as Workers 5 and 7.",
    why: "Reviewers need the real PDF sitting on the real transaction before they approve a conversion.",
    writes: ["document_filings (upload_pass = 1)", "human_reviews when the preflight is ready for a person"],
    reads: ["skydoc script, deploy, folder, categories", "connectors.erp"],
    connectors: ["erp"],
    files: ["backend/src/modules/skydoc/workers.py"],
    skips: ["Sensitive-customer forwarding can still send mail here. Sensitivity comes from customers.is_sensitive, decided at Worker 4, never from a route the model invented."],
    fails: ["RESTlet errors retry. A missing sales order means Worker 5 did not land — this step should not invent one."],
    related: [
      { label: "ERP and SkyDoc", href: "#/atlas/erp" },
      { label: "Reviews", href: "#/atlas/api" },
    ],
    beats: [
      {
        title: "Where files go",
        body: "Default folder plus per-document overrides for packing slips, shipping labels, bills of lading, and barcode labels. Categories map po, artwork, email, and those shipping docs onto SkyDoc category ids. All of that is settings, not code.",
      },
    ],
  },
  {
    key: "w7_erp_convert",
    num: 7,
    name: "Final stamp",
    short: "After a person approves, PATCH the same NetSuite record into the real form.",
    queue: "critical",
    stage: "REAL_SO_CONVERSION",
    job: "Does not create a second sales order. It PATCHes the preflight record in place: Form 338 becomes Form 340, so_kind flips from preflight to real, and the real payload Worker 4 assembled is applied. Internal id and tranId stay the same.",
    why: "A second row for the same order used to be possible. The unique key on external id has no so_kind in it, so a second row is now impossible by design.",
    writes: ["same sales_orders row: so_kind, form_id_used, payload_snapshot"],
    reads: ["erp.real.form_id", "connectors.erp", "raw_payload.validation.real"],
    connectors: ["erp"],
    files: ["backend/src/modules/erp/convert.py", "backend/src/modules/erp/workers.py"],
    skips: ["The engine will not dispatch this while the workflow is awaiting_review. Approval has to move the review and the workflow out of that state first."],
    fails: ["Same NetSuite failure policy as Worker 5. A missing preflight id is a broken pipeline, not a reason to POST a new order."],
    related: [
      { label: "ERP and SkyDoc", href: "#/atlas/erp" },
      { label: "Human review", href: "#/atlas/api" },
      { label: "Approve it in the simulator", href: "#/sim" },
    ],
    beats: [
      {
        title: "Why the simulator stops unless you approve",
        body: "awaiting_review is a terminal state for the dispatcher. run_step refuses to continue until status leaves that state and the review is no longer pending. That is why a sample replay can finish Workers 1–6 and still have zero real sales orders.",
      },
    ],
  },
];

export const ENGINE = {
  key: "workflow-engine",
  name: "Dispatcher",
  short: "No worker names the next worker. The settings snapshot does.",
  job: "run_step opens a stage run, calls the registered handler, records the decision, then advance() reads workers.order. The next step is written to the outbox inside the same database transaction and published only after commit.",
  why: "A Redis publish cannot be rolled back. Publishing inside the transaction would dispatch work for a decision that was undone.",
  files: [
    "backend/src/modules/workflow/engine.py",
    "backend/src/infrastructure/workers/outbox.py",
  ],
  terminal: ["completed", "failed", "cancelled", "awaiting_review"],
  stoppingSkips: [
    "not a purchase order",
    "duplicate_email_forward",
    "thread artwork follow-up",
    "follow-up to an order in its thread",
    "revision of an earlier order",
  ],
  related: [
    { label: "Workflow atlas", href: "#/atlas/workflow" },
    { label: "Queues and outbox", href: "#/atlas/queues" },
  ],
};

export function workerByKey(key) {
  return WORKERS.find((w) => w.key === key) || null;
}
