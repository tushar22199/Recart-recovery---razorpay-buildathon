import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  Gauge,
  IndianRupee,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import type { RecoveryAttempt, ActivityEvent } from "@workspace/api-client-react";

export function formatMoney(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function shortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function relativeTime(value?: string | null) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return value;
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function StatusPill({ status }: { status?: string }) {
  const clean = (status || "unknown").toLowerCase();
  const style = clean.includes("recover") || clean === "success"
    ? "status-success"
    : clean.includes("pend") || clean.includes("retry")
      ? "status-pending"
      : clean.includes("escal") || clean.includes("fail")
        ? "status-danger"
        : "status-neutral";
  return <span data-testid={`status-pill-${clean}`} className={`status-pill ${style}`}><span className="status-mark" />{status || "Unknown"}</span>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function QueryState({ loading, error, empty, onRetry, children }: { loading?: boolean; error?: boolean; empty?: boolean; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (error) return <div className="state-card"><CircleAlert size={20} /><div><strong>Couldn’t load this view</strong><p>Recovery data is temporarily unavailable.</p></div>{onRetry && <button data-testid="button-retry-query" className="button button-quiet ml-auto" onClick={onRetry}>Retry</button>}</div>;
  if (empty) return <div className="state-card"><ShieldCheck size={20} /><div><strong>Nothing needs attention</strong><p>New recovery events will appear here.</p></div></div>;
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [
    { href: "/", label: "Recovery", icon: Gauge },
    { href: "/settings", label: "Guardrails", icon: SlidersHorizontal },
  ];
  return (
    <div className="app-frame noise">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-glyph"><span /><span /><span /></div>
          <div><div className="brand-name">ReCart</div><div className="brand-sub">recovery console</div></div>
          <button data-testid="button-close-menu" className="icon-button mobile-only" onClick={() => setMobileOpen(false)}><X size={17} /></button>
        </div>
        <div className="workspace-chip"><div className="workspace-avatar">N</div><div className="min-w-0"><div className="workspace-name">Nectar & Co.</div><div className="workspace-id">live workspace</div></div><ChevronRight size={14} className="ml-auto opacity-50" /></div>
        <div className="nav-label">Control room</div>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`} className={`nav-item ${location === href ? "nav-item-active" : ""}`} onClick={() => setMobileOpen(false)}><Icon size={17} /><span>{label}</span>{location === href && <span className="nav-active-dot" />}</Link>)}
        </nav>
        <div className="sidebar-rule" />
        <div className="nav-label">System</div>
        <div className="system-status"><span className="live-dot pulse-dot" /><div><div className="text-xs font-semibold">Automation live</div><div className="text-[11px] opacity-55">bounded by guardrails</div></div></div>
        <div className="sidebar-bottom"><div className="sidebar-tip"><Sparkles size={15} /><span>Small wins compound.</span></div><div className="profile-row"><div className="profile-avatar">AR</div><div className="min-w-0"><div className="text-xs font-bold truncate">Aarav Rao</div><div className="text-[11px] opacity-55 truncate">Owner</div></div><MoreHorizontal size={16} className="ml-auto opacity-45" /></div></div>
      </aside>
      {mobileOpen && <button data-testid="button-dismiss-menu" className="mobile-scrim mobile-only" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <main className="main-canvas">
        <header className="topbar">
          <button data-testid="button-open-menu" className="icon-button mobile-only" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
          <div className="crumbs"><span>Workspace</span><ChevronRight size={13} /><strong>{location === "/settings" ? "Guardrails" : location.startsWith("/attempts/") ? "Attempt detail" : "Recovery"}</strong></div>
          <div className="topbar-actions"><div className="sync-status"><span className="live-dot" />Data synced <span className="mono">11:42:08</span></div><div className="top-avatar">AR</div></div>
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-intro animate-rise-in"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function MetricCard({ label, value, note, accent = "saffron", icon: Icon = IndianRupee }: { label: string; value: string; note: string; accent?: string; icon?: typeof IndianRupee }) {
  return <div className={`metric-card metric-${accent} animate-rise-in`}><div className="metric-top"><span className="metric-label">{label}</span><span className="metric-icon"><Icon size={16} /></span></div><div data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`} className="metric-value">{value}</div><div className="metric-note">{note}</div></div>;
}

export function AttemptsTable({
  attempts,
  onSelect,
  onPay,
}: {
  attempts: RecoveryAttempt[];
  onSelect?: (id: string) => void;
  onPay?: (attempt: RecoveryAttempt) => void;
}) {
  return (
    <div className="table-shell">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Failure</th>
              <th>Value</th>
              <th>Channel</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Last activity</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {attempts.map((attempt) => (
              <tr
                key={attempt.id}
                data-testid={`row-attempt-${attempt.id}`}
                className="table-row-clickable"
                onClick={() => onSelect?.(attempt.id)}
              >
                <td>
                  <div className="customer-cell">
                    <div className="customer-avatar">
                      {attempt.customer.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="customer-name">{attempt.customer}</div>
                      <div className="customer-email">{attempt.email}</div>
                    </div>
                  </div>
                </td>

                <td>
                  <div className="failure-reason">{attempt.failureReason}</div>
                  <div className="failure-code mono">{attempt.failureCode}</div>
                </td>

                <td>
                  <strong>{formatMoney(attempt.amount, attempt.currency)}</strong>
                </td>

                <td>
                  <span className="channel-cell">
                    <span className="channel-dot" />
                    {attempt.channel}
                  </span>
                </td>

                <td>
                  <div className="progress-copy">
                    <span>
                      {attempt.attempts} of {attempt.maxAttempts}
                    </span>
                    <span className="muted">tries</span>
                  </div>

                  <div className="mini-progress">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          (attempt.attempts /
                            Math.max(1, attempt.maxAttempts)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </td>

                <td>
                  <StatusPill status={attempt.status} />
                </td>

                <td>
                  <span className="last-action">{attempt.lastAction}</span>
                  <span className="last-time">
                    {relativeTime(attempt.lastActionAt)}
                  </span>
                </td>

                <td>
                  {attempt.razorpayOrderId &&
                  attempt.status !== "recovered" ? (
                    <button
                      type="button"
                      className="button button-primary"
                      data-testid={`button-pay-${attempt.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onPay?.(attempt);
                      }}
                    >
                      Pay
                    </button>
                  ) : (
                    <ArrowUpRight size={16} className="row-arrow" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ActivityList({ events }: { events: ActivityEvent[] }) {
  return <div className="activity-list">{events.map((event) => <div key={event.id} className="activity-item" data-testid={`activity-${event.id}`}><div className={`activity-dot activity-${event.tone || "neutral"}`}><Activity size={13} /></div><div className="min-w-0 flex-1"><div className="activity-title">{event.title}</div><div className="activity-detail">{event.detail}</div></div><div className="activity-time">{relativeTime(event.timestamp)}</div></div>)}</div>;
}

export function BackLink({ href = "/" }: { href?: string }) {
  return <Link href={href} data-testid="link-back" className="back-link"><ArrowLeft size={15} /> Back to recovery</Link>;
}

export function ConfigSummary({ config, onEdit }: { config?: { enabled: boolean; maxAttempts: number; cooldownMinutes: number; windowHours: number; discountCap: number }; onEdit: () => void }) {
  if (!config) return null;
  return <div className="config-summary"><div className="config-summary-head"><div><div className="eyebrow">Active policy</div><h3>{config.enabled ? "Automation is live" : "Automation is paused"}</h3></div><span className={`policy-chip ${config.enabled ? "policy-live" : "policy-paused"}`}><span className="status-mark" />{config.enabled ? "Enforcing" : "Paused"}</span></div><div className="policy-grid"><div><span>Attempts</span><strong>{config.maxAttempts}</strong></div><div><span>Cooldown</span><strong>{config.cooldownMinutes}m</strong></div><div><span>Window</span><strong>{config.windowHours}h</strong></div><div><span>Discount cap</span><strong>{config.discountCap}%</strong></div></div><button data-testid="button-edit-guardrails" className="button button-outline w-full" onClick={onEdit}><Settings2 size={15} /> Review guardrails <ArrowUpRight size={14} className="ml-auto" /></button></div>;
}

export function ErrorNotice({ text = "Something went wrong. Please try again." }: { text?: string }) {
  return <div className="inline-error"><CircleAlert size={16} />{text}</div>;
}

export function ActionButton({ children, onClick, pending = false, disabled = false }: { children: ReactNode; onClick: () => void; pending?: boolean; disabled?: boolean }) {
  return <button data-testid="button-recovery-action" className="button button-primary" onClick={onClick} disabled={disabled || pending}>{pending ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}{children}</button>;
}

export const toneIcon = (type: string) => type.includes("recover") ? Check : type.includes("fail") ? Ban : type.includes("retry") ? RefreshCw : Clock3;