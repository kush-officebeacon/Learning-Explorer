export const TABLES = [
  { name: "tenants", group: "Who", use: "The company. settings JSON is the rulebook." },
  { name: "sub_tenants", group: "Who", use: "A brand. NULL settings means inherit the tenant." },
  { name: "erp_connectors", group: "Who", use: "Per-tenant credentials. config is public. config_enc is sealed." },
  { name: "users", group: "Who", use: "People. token_epoch bumps to revoke every device." },
  { name: "user_sessions", group: "Who", use: "Server-side session. Missing in Redis means logged out." },
  { name: "roles / permissions", group: "Who", use: "Roles bundle permission codes. Endpoints ask for codes." },
  { name: "email_messages", group: "Mail", use: "One inbound message. Deduped tenant-wide on Message-ID." },
  { name: "email_threads", group: "Mail", use: "Conversation. Later art can attach to an earlier order here." },
  { name: "email_attachments", group: "Mail", use: "Files plus storage path, hash, and kind." },
  { name: "email_forwards", group: "Mail", use: "Vendor forwards. Recorded even when sending is switched off." },
  { name: "workflows", group: "Run", use: "One pipeline run. Holds the settings snapshot and current worker." },
  { name: "workflow_stage_runs", group: "Run", use: "Timing and outcome per worker attempt. There is no second worker_runs table." },
  { name: "human_reviews", group: "Run", use: "The pause. reason_code, failed worker, who decided." },
  { name: "extractions", group: "Model", use: "Triage, classify, extract, and validation JSON on one row." },
  { name: "product_extractions", group: "Model", use: "One line item from Worker 3." },
  { name: "products", group: "Reference", use: "Live SKU catalogue. Brand comes from which sub-tenant owns the SKU." },
  { name: "customers", group: "Reference", use: "NetSuite customer cache. is_sensitive is the confidentiality flag." },
  { name: "customer_addresses", group: "Reference", use: "Zip, city, state, country for the cascade." },
  { name: "sales_orders", group: "ERP", use: "Preflight and real share one row. so_kind flips. external id does not." },
  { name: "document_filings", group: "ERP", use: "SkyDoc uploads. upload_pass 1 is the preflight filing." },
  { name: "order_changes", group: "ERP", use: "Quantity revisions that should not create a second order." },
  { name: "audit_logs", group: "Trace", use: "What changed on an entity. Before and after images." },
  { name: "activity_logs", group: "Trace", use: "What the system did. worker_key, reason, correlation id." },
  { name: "dead letters / outbox", group: "Trace", use: "Lost jobs you can replay, and publishes waiting on a commit." },
];

export const VIEWS = [
  { name: "v_tenant_ops_metrics", use: "Emails read, in process, awaiting review, failed, completed. Preflight and real counts." },
  { name: "v_tenant_ops_failures", use: "Which worker failed, what reason, what explanation, when." },
  { name: "v_tenant_worker_runtime", use: "Success, failure, skip, pause, average, p50, p95 per worker." },
  { name: "v_email_process_timings", use: "One email: status, total duration, and a JSON of per-worker timings." },
];

export const COMPARES = {
  forms: {
    title: "Form 338 vs Form 340",
    left: {
      name: "338 · preflight",
      points: [
        "Built by Worker 4, posted by Worker 5.",
        "Dummy customer and one dummy item priced at zero.",
        "Exists so a person can review real files on a real transaction.",
        "so_kind = preflight.",
        "Form id lives in erp.preflight.form_id, not in code.",
      ],
    },
    right: {
      name: "340 · real",
      points: [
        "Built by Worker 4, patched by Worker 7.",
        "Actual customer, real lines, priority, addresses, charges.",
        "Same NetSuite internal id and tranId as the preflight.",
        "so_kind flips to real. external_so_id stays.",
        "Form id lives in erp.real.form_id.",
      ],
    },
  },
  logs: {
    title: "audit_logs vs activity_logs",
    left: {
      name: "audit_logs",
      points: [
        "Question: what changed on this row?",
        "Stores before and after images.",
        "Written in the same transaction as the change.",
        "The thing a security review asks for first.",
      ],
    },
    right: {
      name: "activity_logs",
      points: [
        "Question: what did the system or a person do?",
        "Carries worker_key, reason, explanation, correlation id.",
        "Append-only. No updated_at.",
        "The thing you read when a workflow looks stuck.",
      ],
    },
  },
  queues: {
    title: "Triage queue vs extract queue",
    left: {
      name: "triage",
      points: [
        "Worker 2. Is this a PO, whose brand, which SKUs.",
        "Median around 13 seconds, so it can burst.",
        "Capped so it does not flood extraction.",
        "A non-PO stops here and never spends extract tokens.",
      ],
    },
    right: {
      name: "extract",
      points: [
        "Worker 3. Full document read. Slowest and costliest.",
        "Scale this process first when the backlog grows.",
        "PDF rasterization is isolated in a child process.",
        "Its own pool size must be at least its async task cap.",
      ],
    },
  },
};
