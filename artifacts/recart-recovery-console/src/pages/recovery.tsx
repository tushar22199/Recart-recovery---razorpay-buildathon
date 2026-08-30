import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowUpRight, Filter, Plus, RefreshCw, Search, ShieldCheck, TrendingUp } from "lucide-react";
import {
  getGetRecoveryActivityQueryKey,
  getGetRecoveryAttemptsQueryKey,
  getGetRecoveryConfigQueryKey,
  getGetRecoverySummaryQueryKey,
  useGetRecoveryActivity,
  useGetRecoveryAttempts,
  useGetRecoveryConfig,
  useGetRecoverySummary,
  useSimulateRecoveryAttempt,
} from "@workspace/api-client-react";
import { ActivityList, AppShell, AttemptsTable, ConfigSummary, MetricCard, PageIntro, QueryState, formatMoney, relativeTime } from "@/components/recovery-ui";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RecoveryPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const summaryQuery = useGetRecoverySummary();
  const attemptsQuery = useGetRecoveryAttempts();
  const activityQuery = useGetRecoveryActivity();
  const configQuery = useGetRecoveryConfig();
  const simulate = useSimulateRecoveryAttempt();
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const filteredAttempts = useMemo(() => (attemptsQuery.data || []).filter((a) => `${a.customer} ${a.email} ${a.failureReason}`.toLowerCase().includes(search.toLowerCase())), [attemptsQuery.data, search]);
  const attempts = showAll ? filteredAttempts : filteredAttempts.slice(0, 6);
  const summary = summaryQuery.data;
  const error = summaryQuery.isError || attemptsQuery.isError || activityQuery.isError;
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: getGetRecoverySummaryQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetRecoveryAttemptsQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetRecoveryActivityQueryKey() }); void queryClient.invalidateQueries({ queryKey: getGetRecoveryConfigQueryKey() }); };
  const runSimulation = () => simulate.mutate(undefined, { onSuccess: () => refresh() });
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const liveDateTime = currentTime.toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  const openRazorpayRecoveryPayment = async (
    attempt: (typeof filteredAttempts)[number],
  ) => {
    try {
      if (!attempt.razorpayOrderId) {
        throw new Error("No Razorpay recovery order exists for this attempt");
      }

      setRazorpayLoading(true);

      const loaded = await loadRazorpayScript();

      if (!loaded) {
        throw new Error("Could not load Razorpay Checkout");
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/razorpay/recovery-order/${attempt.id}`,
      );

      if (!response.ok) {
        throw new Error("Could not load Razorpay recovery order");
      }

      const order = await response.json();

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "ReCart",
        description: "ReCart Revenue Recovery",
        order_id: order.id,
        prefill: {
          name: attempt.customer,
          email: attempt.email,
        },
        handler: () => {
          setRazorpayLoading(false);
          void refresh();
        },
        modal: {
          ondismiss: () => {
            setRazorpayLoading(false);
          },
        },
        theme: {
          color: "#111827",
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Razorpay recovery checkout failed:", error);
      setRazorpayLoading(false);
    }
  };
  return <AppShell>
    <div className="dashboard-grid grid-wash">
      <PageIntro
        eyebrow={`${liveDateTime} · Live workspace`}title="Revenue, recovered." description="A clear view of every checkout that still has a second chance." action={<div className="intro-actions"><button data-testid="button-refresh-dashboard" className="icon-button bordered" onClick={refresh} title="Refresh data"><RefreshCw size={16} /></button><button data-testid="button-simulate-attempt" className="button button-dark" onClick={runSimulation} disabled={simulate.isPending}><Plus size={15} />{simulate.isPending ? "Adding..." : "Simulate attempt"}</button>
    <button
      data-testid="button-test-razorpay"
      className="button button-primary"
      onClick={() => {
        const attempt = filteredAttempts.find((a) => a.razorpayOrderId);
        if (attempt) {
          void openRazorpayRecoveryPayment(attempt);
        }
      }}
      disabled={razorpayLoading}
    >
      {razorpayLoading ? "Opening..." : "Test Razorpay Payment"}
    </button></div>} />
    {error && <div className="mb-5"><QueryState error onRetry={refresh}>{null}</QueryState></div>}
    <QueryState loading={summaryQuery.isLoading} error={false}><div className="metrics-grid">
      <MetricCard label="Recovered" value={formatMoney(summary?.recovered || 0)} note="this recovery window" accent="saffron" icon={TrendingUp} />
      <MetricCard label="At risk now" value={formatMoney(summary?.atRisk || 0)} note={`${summary?.pendingCount || 0} attempts in motion`} accent="coral" />
      <MetricCard label="Recovery rate" value={`${(summary?.recoveryRate || 0).toFixed(1)}%`} note="vs 31.4% last period" accent="teal" icon={ShieldCheck} />
      <MetricCard label="Total attempts" value={(summary?.totalAttempts || 0).toLocaleString("en-IN")} note={`${summary?.escalatedCount || 0} escalated`} accent="navy" />
    </div></QueryState>
    <div className="content-columns">
      <section className="panel attempts-panel animate-rise-in animate-delay-1"><div className="panel-head"><div><div className="eyebrow">Needs a nudge</div><h2>Recovery attempts</h2></div><div className="panel-head-actions"><div className="search-box"><Search size={15} /><input data-testid="input-search-attempts" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search attempts" /></div><button data-testid="button-filter-attempts" className="icon-button bordered" title="Filter attempts"><Filter size={15} /></button></div></div><div className="table-meta"><span>{filteredAttempts.length} open attempts</span><span className="meta-rule" /><span className="meta-muted">Sorted by risk</span></div><QueryState loading={attemptsQuery.isLoading} error={attemptsQuery.isError} empty={!attemptsQuery.isLoading && !attemptsQuery.isError && attempts.length === 0} onRetry={() => void attemptsQuery.refetch()}><AttemptsTable attempts={attempts} onSelect={(id) => setLocation(`/attempts/${id}`)} /></QueryState><div className="panel-foot"><span className="muted">Showing {attempts.length} of {filteredAttempts.length}</span><button data-testid="button-view-all-attempts" className="text-button" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show less" : "View all attempts"} <ArrowUpRight size={14} /></button></div></section>
      <aside className="right-column"><section className="panel activity-panel animate-rise-in animate-delay-2"><div className="panel-head"><div><div className="eyebrow">System pulse</div><h2>Recent activity</h2></div><span className="live-badge"><span className="live-dot" />Live</span></div><QueryState loading={activityQuery.isLoading} error={activityQuery.isError} empty={!activityQuery.isLoading && !activityQuery.isError && !activityQuery.data?.length} onRetry={() => void activityQuery.refetch()}><ActivityList events={(activityQuery.data || []).slice(0, 6)} /></QueryState><div className="panel-foot"><span className="muted">{activityQuery.data?.length || 0} events today</span><span className="mono text-[10px] opacity-60">{relativeTime(activityQuery.data?.[0]?.timestamp)}</span></div></section><section className="animate-rise-in animate-delay-3"><ConfigSummary config={configQuery.data} onEdit={() => setLocation("/settings")} /></section></aside>
    </div>
  </div></AppShell>;
}