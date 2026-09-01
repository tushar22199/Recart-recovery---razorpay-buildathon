import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowUpRight, Copy, CreditCard, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import {
  getGetRecoveryActivityQueryKey,
  getGetRecoveryAttemptQueryKey,
  getGetRecoveryAttemptsQueryKey,
  getGetRecoverySummaryQueryKey,
  useGetRecoveryAttempt,
  useRetryRecoveryAttempt,
} from "@workspace/api-client-react";
import { ActionButton, AppShell, BackLink, ErrorNotice, QueryState, StatusPill, formatMoney, shortDate, toneIcon } from "@/components/recovery-ui";

export default function AttemptDetailPage() {
  const [, params] = useRoute("/attempts/:id");
  const id = params?.id || "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const query = useGetRecoveryAttempt(id, { query: { queryKey: getGetRecoveryAttemptQueryKey(id), enabled: Boolean(id) } });
  const retry = useRetryRecoveryAttempt();
  const attempt = query.data;
  const canRetry = Boolean(attempt && !["recovered", "escalated", "closed"].includes(attempt.status.toLowerCase()) && attempt.attempts < attempt.maxAttempts);
  const audit = useMemo(() => attempt?.audit || [], [attempt?.audit]);
  const doRetry = () => retry.mutate({ id }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getGetRecoveryAttemptQueryKey(id) }); void queryClient.invalidateQueries({ queryKey: getGetRecoveryAttemptsQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetRecoverySummaryQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetRecoveryActivityQueryKey() }); } });
  return <AppShell><div className="detail-page">
    <BackLink /><QueryState loading={query.isLoading} error={query.isError} empty={!id} onRetry={() => void query.refetch()}>{attempt && <><div className="detail-hero animate-rise-in"><div><div className="eyebrow">Recovery attempt / <span className="mono">{attempt.id}</span></div><h1>{attempt.customer}</h1><div className="hero-sub"><span>{attempt.email}</span><span className="sub-separator" /><span>Detected {shortDate(attempt.detectedAt)}</span></div></div><div className="detail-actions"><StatusPill status={attempt.status} /><ActionButton onClick={doRetry} pending={retry.isPending} disabled={!canRetry}>{canRetry ? "Retry recovery" : "No retry available"}</ActionButton></div></div>
    {retry.isError && <ErrorNotice text="The retry could not be queued. No changes were made." />}
    <div className="detail-layout"><div className="detail-main">
      <section className="panel value-panel animate-rise-in animate-delay-1"><div className="value-panel-main"><div className="eyebrow">Payment at risk</div><div data-testid="text-attempt-amount" className="big-amount">{formatMoney(attempt.amount, attempt.currency)}</div><div className="value-caption">{attempt.paymentMethod} · {attempt.channel}</div></div><div className="value-side"><div><span>Failure reason</span><strong>{attempt.failureReason}</strong><code>{attempt.failureCode}</code></div><div><span>Recovery window</span><strong>{attempt.expiresAt ? `Ends ${shortDate(attempt.expiresAt)}` : "No expiry set"}</strong></div></div></section>
      {attempt.decision && (
        <section className="panel decision-panel animate-rise-in animate-delay-2">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Agent decision</div>
              <h2>Recovery recommendation</h2>
            </div>

            <StatusPill
              status={
                attempt.decision.shouldEscalate
                  ? "escalated"
                  : attempt.decision.shouldRecover
                    ? "recovering"
                    : "closed"
              }
            />
          </div>

          <div className="decision-grid">
            <div>
              <span>Channel</span>
              <strong>{attempt.decision.channel}</strong>
            </div>

            <div>
              <span>Delay</span>
              <strong>{attempt.decision.delayMinutes} min</strong>
            </div>

            <div>
              <span>Incentive</span>
              <strong>{attempt.decision.incentivePercent}%</strong>
            </div>

            <div>
              <span>Confidence</span>
              <strong>{Math.round(attempt.decision.confidence * 100)}%</strong>
            </div>
          </div>

          <div className="decision-reason">
            <span>Reason</span>
            <p>{attempt.decision.reason}</p>
          </div>
          {attempt.razorpayPaymentLinkUrl && (
            <a
              href={attempt.razorpayPaymentLinkUrl}
              target="_blank"
              rel="noreferrer"
              className="button button-outline"
            >
              Open recovery payment link
              <ArrowUpRight size={14} />
            </a>
          )}
        </section>
      )}
      <section className="panel audit-panel animate-rise-in animate-delay-2"><div className="panel-head"><div><div className="eyebrow">Immutable record</div><h2>Audit trail</h2></div><button data-testid="button-copy-attempt-id" className="button button-quiet" onClick={() => void navigator.clipboard?.writeText(attempt.id)}><Copy size={14} /> Copy ID</button></div><div className="audit-list">{audit.length ? audit.map((event, index) => { const Icon = toneIcon(event.type); return <div key={event.id} className="audit-event"><div className={`audit-icon audit-${event.type.includes("fail") ? "danger" : event.type.includes("recover") ? "success" : "neutral"}`}><Icon size={15} /></div><div className="audit-line" /><div className="audit-body"><div className="audit-title-row"><strong>{event.title}</strong><span className="audit-time">{shortDate(event.timestamp)}</span></div><p>{event.description}</p><div className="audit-meta"><span>{event.actor}</span>{event.meta && <><span className="meta-rule" /><span className="mono">{event.meta}</span></>}</div></div></div> }) : <div className="empty-audit"><ShieldCheck size={21} /><p>No audit events recorded yet.</p></div>}</div></section>
    </div><aside className="detail-side"><section className="side-card animate-rise-in animate-delay-2"><div className="side-card-title"><UserRound size={15} /> Customer</div><div className="side-person"><div className="large-avatar">{attempt.customer.slice(0, 1)}</div><div><strong>{attempt.customer}</strong><span>{attempt.email}</span></div></div><div className="side-details"><div><span>Payment method</span><strong><CreditCard size={13} /> {attempt.paymentMethod}</strong></div><div><span>Last action</span><strong>{attempt.lastAction}</strong><small>{shortDate(attempt.lastActionAt)}</small></div></div><button data-testid="button-contact-customer" className="button button-outline w-full" onClick={() => window.location.href = `mailto:${attempt.email}`}><Mail size={14} /> Contact customer</button></section><section className="bounded-note animate-rise-in animate-delay-3"><div className="bounded-note-icon"><ShieldCheck size={18} /></div><div><strong>Bounded by guardrails</strong><p>This attempt can run {Math.max(0, attempt.maxAttempts - attempt.attempts)} more time{attempt.maxAttempts - attempt.attempts === 1 ? "" : "s"}. Every action is logged.</p><Link href="/settings" data-testid="link-view-guardrails" className="text-button">View policy <ArrowUpRight size={13} /></Link></div></section></aside></div></>}</QueryState>
  </div></AppShell>;
}