"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Cpu,
  Database,
  Gauge,
  Layers3,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

type ComponentItem = {
  id: string;
  lot: string;
  parameter: string;
  current: string;
  predicted: string;
  risk: number;
  status: string;
  trend: string;
};

type AIAnalysis = {
  component_id: string;
  lot_id: string;
  parameter: string;
  temperature: number;
  current_value: number;
  predicted_168h: number;
  safety_limit: number;
  early_drift_percent: number;
  total_drift_percent: number;
  lot_deviation_sigma: number;
  anomaly_score: number;
  reliability_risk: number;
  status: string;
  within_current_spec: boolean;
};

type View =
  | "Command Center"
  | "Component Screening"
  | "Production Lots"
  | "Drift Analytics"
  | "AI Explanations"
  | "Reliability Reports"
  | "Audit Trail";

const components: ComponentItem[] = [
  {
    id: "AST-24-00871",
    lot: "LOT-24A",
    parameter: "Leakage Current",
    current: "14.8 μA",
    predicted: "56.2 μA",
    risk: 73,
    status: "Warning",
    trend: "+51.02%",
  },
  {
    id: "AST-24-00318",
    lot: "LOT-24A",
    parameter: "Iddq",
    current: "12.8 μA",
    predicted: "19.7 μA",
    risk: 48,
    status: "Watch",
    trend: "+18.4%",
  },
  {
    id: "AST-25-00142",
    lot: "LOT-25B",
    parameter: "Propagation Delay",
    current: "8.7 ns",
    predicted: "9.1 ns",
    risk: 21,
    status: "Normal",
    trend: "+3.2%",
  },
  {
    id: "AST-25-00491",
    lot: "LOT-25B",
    parameter: "Standby Current",
    current: "11.4 μA",
    predicted: "17.9 μA",
    risk: 67,
    status: "Warning",
    trend: "+29.8%",
  },
  {
    id: "AST-24-00912",
    lot: "LOT-24A",
    parameter: "Leakage Current",
    current: "10.4 μA",
    predicted: "11.2 μA",
    risk: 12,
    status: "Normal",
    trend: "+1.8%",
  },
];

const baseTelemetry = [
  ["13:42:01", "AST-25-00481", "10.2 μA", "NORMAL"],
  ["13:42:02", "AST-25-00482", "10.4 μA", "NORMAL"],
  ["13:42:03", "AST-25-00483", "10.7 μA", "NORMAL"],
  ["13:42:04", "AST-25-00484", "11.1 μA", "WATCH"],
  ["13:42:05", "AST-25-00485", "14.9 μA", "WARNING"],
];

function createDemoAnalysis(component: ComponentItem): AIAnalysis {
  const currentValue = Number.parseFloat(component.current);
  const predictedValue = Number.parseFloat(component.predicted);

  const safetyLimit =
    component.parameter === "Propagation Delay" ? 10.0 : 50.0;

  const earlyDrift = Number.parseFloat(
    component.trend.replace("+", "").replace("%", "")
  );

  const anomalyScore = Math.min(100, Math.max(5, component.risk * 0.82));

  return {
    component_id: component.id,
    lot_id: component.lot,
    parameter: component.parameter,
    temperature: 85,
    current_value: currentValue,
    predicted_168h: predictedValue,
    safety_limit: safetyLimit,
    early_drift_percent: earlyDrift,
    total_drift_percent: earlyDrift * 1.18,
    lot_deviation_sigma: Number((component.risk / 38).toFixed(2)),
    anomaly_score: Number(anomalyScore.toFixed(1)),
    reliability_risk: component.risk,
    status: component.status,
    within_current_spec: currentValue <= safetyLimit,
  };
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    Normal: "status-normal",
    Watch: "status-watch",
    Warning: "status-warning",
    Critical: "status-critical",
  };

  return (
    <span className={`status-badge ${c[status] || "status-watch"}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  change: string;
  icon: ElementType;
  tone?: string;
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <div className="metric-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{change}</small>
      </div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("Command Center");
  const [selected, setSelected] = useState(components[0]);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const [live, setLive] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [alert, setAlert] = useState(false);
  const [search, setSearch] = useState("");
  const [review, setReview] = useState(false);
  const [decision, setDecision] = useState("Pending");
  const [reviewReason, setReviewReason] = useState("");

  const [audit, setAudit] = useState<string[]>([
    "System initialized • AI engine connected • Screening run #BS-2026-104",
  ]);

  function analyze(id: string) {
    setLoading(true);

    const component = components.find((c) => c.id === id);

    if (!component) {
      setLoading(false);
      return;
    }

    window.setTimeout(() => {
      setAnalysis(createDemoAnalysis(component));
      setApiOnline(true);
      setLoading(false);
    }, 350);
  }

  useEffect(() => {
    analyze(components[0].id);
  }, []);

  useEffect(() => {
    if (!live) return;

    const t = window.setInterval(() => {
      setLiveTick((v) => v + 1);
      analyze(selected.id);
    }, 3000);

    return () => window.clearInterval(t);
  }, [live, selected.id]);

  useEffect(() => {
    setAlert(
      Boolean(live && (analysis?.reliability_risk ?? selected.risk) >= 60)
    );
  }, [live, analysis, selected.risk]);

  const risk = analysis?.reliability_risk ?? selected.risk;
  const status = analysis?.status ?? selected.status;

  const filtered = useMemo(
    () =>
      components.filter((c) =>
        `${c.id} ${c.lot} ${c.parameter}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [search]
  );

  function select(c: ComponentItem) {
    setSelected(c);
    analyze(c.id);
  }

  function makeDecision(d: string) {
    const reason =
      reviewReason.trim() ||
      (d === "ESCALATE"
        ? "Predicted trajectory requires engineering review."
        : d === "HOLD"
          ? "Component held for additional screening."
          : "AI recommendation accepted by engineer.");

    setDecision(d);
    setReviewReason("");
    setReview(false);

    setAudit((a) => [
      `${new Date().toLocaleTimeString()} • Engineer decision: ${d} • ${selected.id} • ${reason}`,
      ...a,
    ]);
  }

  const recommendation =
    risk >= 80
      ? "ESCALATE"
      : risk >= 60
        ? "REVIEW"
        : risk >= 30
          ? "MONITOR"
          : "ACCEPT";

  const recommendationText =
    recommendation === "ESCALATE"
      ? "Predicted trajectory indicates a high probability of future specification exceedance."
      : recommendation === "REVIEW"
        ? "Early degradation is visible even though the current measurement may remain within specification."
        : recommendation === "MONITOR"
          ? "The component is trending abnormally and should remain under enhanced observation."
          : "Trajectory remains stable with no immediate reliability concern.";

  const navGroups: {
    label: string;
    items: [View, ElementType][];
  }[] = [
    {
      label: "MONITORING",
      items: [
        ["Command Center", Gauge],
        ["Component Screening", Cpu],
        ["Production Lots", Layers3],
      ],
    },
    {
      label: "INTELLIGENCE",
      items: [
        ["Drift Analytics", TrendingUp],
        ["AI Explanations", Sparkles],
        ["Reliability Reports", BarChart3],
      ],
    },
    {
      label: "SYSTEM",
      items: [["Audit Trail", Database]],
    },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={25} />
          </div>

          <div>
            <h1>
              ASTRA<span>-SHIELD</span>
            </h1>
            <p>RELIABILITY INTELLIGENCE</p>
          </div>
        </div>

        <div className="system-state">
          <span className="pulse" />

          <div>
            <strong>SYSTEM ONLINE</strong>
            <small>AI engine connected</small>
          </div>
        </div>

        <nav className="nav">
          {navGroups.map((g) => (
            <div key={g.label}>
              <p className="nav-label">{g.label}</p>

              {g.items.map(([name, Icon]) => (
                <button
                  key={name}
                  onClick={() => setView(name)}
                  className={`nav-item ${view === name ? "active" : ""}`}
                >
                  <Icon size={18} />
                  {name}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mission-chip">
            <Radio size={15} />

            <div>
              <strong>BURN-IN TEST</strong>
              <span>RUN #BS-2026-104</span>
            </div>
          </div>

          <div className="version">
            ASTRA-SHIELD v1.0.0
            <span>DEMO ENVIRONMENT</span>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              RELIABILITY / <span>{view.toUpperCase()}</span>
            </div>

            <h2>Burn-In Intelligence Console</h2>

            <p>
              AI-driven anomaly detection and early degradation prediction
            </p>
          </div>

          <div className="top-actions">
            <div className="telemetry-status">
              <span className="live-dot" />
              LIVE TELEMETRY
            </div>

            <button
              className={`live-button ${live ? "running" : ""}`}
              onClick={() => {
                setLive((v) => !v);

                if (live) setAlert(false);
              }}
            >
              <Zap size={16} />
              {live ? "SCREENING ACTIVE" : "START LIVE SCREENING"}
            </button>
          </div>
        </header>

        <div className="system-banner">
          <div className="banner-icon">
            <Sparkles size={20} />
          </div>

          <div>
            <strong>AI RELIABILITY ENGINE</strong>
            <p>
              Dynamic outlier detection • trajectory prediction • explainable
              risk scoring
            </p>
          </div>

          <div className="banner-model">
            MODEL
            <strong>ASTRA-RX 1.0</strong>
          </div>
        </div>

        <div className="api-status">
          <span className="api-online-dot" />
          {loading
            ? "AI ANALYSIS IN PROGRESS..."
            : "AI ENGINE CONNECTED • LIVE ANALYSIS"}
        </div>

        {alert && (
          <div
            style={{
              margin: "14px 0",
              padding: "18px 20px",
              border: "1px solid #9b4d3f",
              background:
                "linear-gradient(90deg,rgba(155,77,63,.18),rgba(24,35,57,.8))",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: "#7f3029",
                color: "#fff",
              }}
            >
              <AlertTriangle size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <strong
                style={{
                  display: "block",
                  letterSpacing: ".08em",
                  fontSize: 12,
                  color: "#ff9c85",
                }}
              >
                EARLY DEGRADATION DETECTED
              </strong>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                {selected.id} • Risk {risk}/100
              </div>

              <div
                style={{
                  color: "#aab8cc",
                  fontSize: 13,
                  marginTop: 3,
                }}
              >
                Current trajectory requires engineer review. Predicted
                endpoint: {analysis?.predicted_168h ?? selected.predicted}.
              </div>
            </div>

            <button
              className="analysis-button"
              onClick={() => {
                setReviewReason("");
                setReview(true);
              }}
            >
              REVIEW NOW <ChevronRight size={16} />
            </button>
          </div>
        )}

        {view === "Command Center" && (
          <CommandCenter
            selected={selected}
            analysis={analysis}
            risk={risk}
            status={status}
            filtered={filtered}
            select={select}
            live={live}
            liveTick={liveTick}
            setReview={setReview}
            setReviewReason={setReviewReason}
            recommendation={recommendation}
            recommendationText={recommendationText}
          />
        )}

        {view === "Component Screening" && (
          <Screening
            filtered={filtered}
            search={search}
            setSearch={setSearch}
            selected={selected}
            select={select}
            analysis={analysis}
            loading={loading}
          />
        )}

        {view === "Production Lots" && <Lots components={components} />}

        {view === "Drift Analytics" && (
          <Drift analysis={analysis} selected={selected} />
        )}

        {view === "AI Explanations" && (
          <Explain analysis={analysis} selected={selected} />
        )}

        {view === "Reliability Reports" && (
          <Reports components={components} analysis={analysis} />
        )}

        {view === "Audit Trail" && (
          <Audit
            audit={audit}
            decision={decision}
            setReview={setReview}
            setReviewReason={setReviewReason}
          />
        )}

        <footer className="footer">
          <span>ASTRA-SHIELD • AI-DRIVEN COMPONENT RELIABILITY</span>
          <span>DEMONSTRATION SYSTEM • SYNTHETIC ENGINEERING DATA</span>
        </footer>

        {review && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.72)",
              display: "grid",
              placeItems: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                width: 520,
                maxWidth: "92%",
                background: "#0b1730",
                border: "1px solid #263a5e",
                borderRadius: 18,
                padding: 28,
                color: "#fff",
                boxShadow: "0 30px 80px rgba(0,0,0,.5)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <small style={{ color: "#8ea4c7" }}>
                    ENGINEER REVIEW
                  </small>

                  <h2 style={{ margin: "6px 0" }}>{selected.id}</h2>
                </div>

                <button
                  onClick={() => setReview(false)}
                  style={{
                    background: "none",
                    border: 0,
                    color: "#fff",
                  }}
                >
                  <X />
                </button>
              </div>

              <p style={{ color: "#aab8cf" }}>
                AI recommends review because the component is currently{" "}
                {analysis?.within_current_spec
                  ? "within specification but drifting toward the future safety limit"
                  : "outside the current safety limit"}
                .
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 10,
                  margin: "20px 0",
                }}
              >
                {[
                  ["RISK", `${risk}/100`],
                  [
                    "PREDICTED",
                    `${analysis?.predicted_168h ?? selected.predicted}`,
                  ],
                  ["STATUS", status],
                ].map((x) => (
                  <div
                    key={x[0]}
                    style={{
                      padding: 14,
                      background: "#101f3d",
                      borderRadius: 12,
                    }}
                  >
                    <small>{x[0]}</small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 6,
                      }}
                    >
                      {x[1]}
                    </strong>
                  </div>
                ))}
              </div>

              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  letterSpacing: ".1em",
                  color: "#8ea4c7",
                  marginBottom: 8,
                }}
              >
                ENGINEER JUSTIFICATION
              </label>

              <textarea
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                placeholder="Enter the reason for this engineering decision..."
                style={{
                  width: "100%",
                  minHeight: 90,
                  boxSizing: "border-box",
                  resize: "vertical",
                  background: "#101f3d",
                  border: "1px solid #2a3d60",
                  borderRadius: 12,
                  padding: 12,
                  color: "#fff",
                  outline: "none",
                  marginBottom: 16,
                }}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => makeDecision("ACCEPT")}
                  className="analysis-button"
                >
                  <Check size={16} />
                  ACCEPT
                </button>

                <button
                  onClick={() => makeDecision("ESCALATE")}
                  className="analysis-button"
                >
                  <AlertTriangle size={16} />
                  ESCALATE
                </button>

                <button
                  onClick={() => makeDecision("HOLD")}
                  className="analysis-button"
                >
                  HOLD
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-header">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>

        {children}
      </div>
    </div>
  );
}

function CommandCenter({
  selected,
  analysis,
  risk,
  status,
  filtered,
  select,
  live,
  liveTick,
  setReview,
  setReviewReason,
  recommendation,
  recommendationText,
}: any) {
  return (
    <>
      <section className="metrics-grid">
        <MetricCard
          label="COMPONENTS SCREENED"
          value="1,248"
          change="+84 this cycle"
          icon={Cpu}
        />

        <MetricCard
          label="CLEARED"
          value="1,171"
          change="93.8% of batch"
          icon={CheckCircle2}
          tone="green"
        />

        <MetricCard
          label="WATCHLIST"
          value="63"
          change="+11 since last scan"
          icon={Activity}
          tone="yellow"
        />

        <MetricCard
          label="CRITICAL"
          value="14"
          change="Requires review"
          icon={AlertTriangle}
          tone="red"
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel chart-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">BURN-IN TRAJECTORY</span>
              <h3>Component Degradation Monitor</h3>
            </div>
          </div>

          <div
            style={{
              height: 280,
              position: "relative",
              padding: "25px 20px",
            }}
          >
            <svg
              viewBox="0 0 700 260"
              style={{ width: "100%", height: "100%" }}
              preserveAspectRatio="none"
            >
              <line
                x1="0"
                y1="45"
                x2="700"
                y2="45"
                stroke="#31486c"
                strokeDasharray="5 5"
              />

              <line
                x1="0"
                y1="130"
                x2="700"
                y2="130"
                stroke="#253b5d"
                strokeDasharray="5 5"
              />

              <line
                x1="0"
                y1="215"
                x2="700"
                y2="215"
                stroke="#253b5d"
                strokeDasharray="5 5"
              />

              <line
                x1="0"
                y1="70"
                x2="700"
                y2="70"
                stroke="#d4a84f"
                strokeDasharray="8 6"
              />

              <path
                d="M15 215 C150 210 220 205 310 195 S470 180 685 170"
                fill="none"
                stroke="#6c8ab5"
                strokeWidth="3"
              />

              <path
                d="M15 215 C130 212 205 200 285 175 S430 105 685 18"
                fill="none"
                stroke="#e28a52"
                strokeWidth="4"
              />

              <circle cx="285" cy="175" r="6" fill="#e28a52" />
              <circle cx="685" cy="18" r="7" fill="#ff5f56" />
            </svg>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#7f93b5",
                fontSize: 12,
              }}
            >
              <span>0h</span>
              <span>24h</span>
              <span>96h</span>
              <span>168h</span>
            </div>

            <div
              style={{
                color: "#d4a84f",
                fontSize: 11,
                marginTop: 8,
              }}
            >
              50 μA SAFETY THRESHOLD • PREDICTED TRAJECTORY
            </div>
          </div>
        </div>

        <div className="panel risk-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">SELECTED COMPONENT</span>
              <h3>{selected.id}</h3>
            </div>

            <StatusBadge status={status} />
          </div>

          <div className="risk-score">
            <div className="score-ring">
              <div>
                <strong>{risk}</strong>
                <span>/100</span>
              </div>
            </div>

            <div>
              <span className="score-label">RELIABILITY RISK</span>

              <h4>
                {risk >= 80
                  ? "Critical trajectory"
                  : risk >= 60
                    ? "Elevated trajectory"
                    : risk >= 30
                      ? "Watch trajectory"
                      : "Stable trajectory"}
              </h4>

              <p>
                AI confidence{" "}
                <strong>
                  {analysis
                    ? Math.max(
                        85,
                        100 - analysis.anomaly_score / 2
                      ).toFixed(1)
                    : "91.2"}
                  %
                </strong>
              </p>
            </div>
          </div>

          <div className="risk-factors">
            <div>
              <span>24h drift</span>
              <strong>
                {analysis
                  ? `${analysis.early_drift_percent.toFixed(2)}%`
                  : selected.trend}
              </strong>
            </div>

            <div>
              <span>Lot deviation</span>
              <strong>
                {analysis
                  ? `${analysis.lot_deviation_sigma.toFixed(2)}σ`
                  : "—"}
              </strong>
            </div>

            <div>
              <span>Predicted endpoint</span>
              <strong>
                {analysis?.predicted_168h ?? selected.predicted}
              </strong>
            </div>
          </div>

          <div className="current-spec">
            <span>CURRENT MEASUREMENT</span>

            <strong>
              {analysis?.current_value ?? selected.current}
            </strong>

            <span
              className={
                analysis?.within_current_spec
                  ? "spec-pass"
                  : "spec-fail"
              }
            >
              {analysis?.within_current_spec
                ? "● WITHIN SPECIFICATION"
                : "● LIMIT EXCEEDED"}
            </span>
          </div>

          <button
            className="analysis-button"
            onClick={() => {
              setReviewReason("");
              setReview(true);
            }}
          >
            OPEN ENGINEER REVIEW <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <section
        className="panel"
        style={{
          marginTop: 18,
          border: "1px solid #2a4166",
          background: "linear-gradient(135deg,#0d1b35,#101d35)",
        }}
      >
        <div className="panel-header">
          <div>
            <span className="eyebrow">AI DECISION SUPPORT</span>
            <h3>Reliability Recommendation</h3>
          </div>

          <span
            className={`status-badge ${
              recommendation === "ESCALATE"
                ? "status-critical"
                : recommendation === "REVIEW"
                  ? "status-warning"
                  : recommendation === "MONITOR"
                    ? "status-watch"
                    : "status-normal"
            }`}
          >
            {recommendation}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              padding: 20,
              background: "#101f3d",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#8ea4c7",
                letterSpacing: ".12em",
              }}
            >
              ASTRA-RX 1.0 RECOMMENDATION
            </div>

            <div
              style={{
                fontSize: 25,
                fontWeight: 800,
                marginTop: 8,
              }}
            >
              {recommendation === "ESCALATE"
                ? "Engineer escalation required"
                : recommendation === "REVIEW"
                  ? "Engineer review recommended"
                  : recommendation === "MONITOR"
                    ? "Enhanced monitoring recommended"
                    : "Component can be accepted"}
            </div>

            <p
              style={{
                color: "#aab8cc",
                lineHeight: 1.6,
                marginBottom: 0,
              }}
            >
              {recommendationText}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
            }}
          >
            <div
              style={{
                padding: 16,
                background: "#101f3d",
                borderRadius: 12,
              }}
            >
              <small>RISK</small>
              <strong
                style={{
                  display: "block",
                  fontSize: 24,
                  marginTop: 6,
                }}
              >
                {risk}/100
              </strong>
            </div>

            <div
              style={{
                padding: 16,
                background: "#101f3d",
                borderRadius: 12,
              }}
            >
              <small>168H</small>
              <strong
                style={{
                  display: "block",
                  fontSize: 20,
                  marginTop: 6,
                }}
              >
                {analysis?.predicted_168h ?? selected.predicted}
              </strong>
            </div>

            <div
              style={{
                padding: 16,
                background: "#101f3d",
                borderRadius: 12,
              }}
            >
              <small>LIMIT</small>
              <strong
                style={{
                  display: "block",
                  fontSize: 20,
                  marginTop: 6,
                }}
              >
                {analysis?.safety_limit ?? "—"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="lower-grid">
        <div className="panel table-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">SCREENING QUEUE</span>
              <h3>Component Reliability Status</h3>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>COMPONENT</th>
                  <th>LOT</th>
                  <th>PARAMETER</th>
                  <th>CURRENT</th>
                  <th>RISK</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((c: ComponentItem) => (
                  <tr
                    key={c.id}
                    onClick={() => select(c)}
                    className={
                      selected.id === c.id ? "selected-row" : ""
                    }
                  >
                    <td>
                      <strong>{c.id}</strong>
                    </td>
                    <td>{c.lot}</td>
                    <td>{c.parameter}</td>
                    <td>{c.current}</td>
                    <td>
                      <strong>
                        {selected.id === c.id ? risk : c.risk}
                      </strong>
                    </td>
                    <td>
                      <StatusBadge
                        status={
                          selected.id === c.id ? status : c.status
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel telemetry-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">STREAM</span>
              <h3>Live Telemetry</h3>
            </div>

            <span className="stream-indicator">
              <span />{" "}
              {live ? "LIVE • 1 SEC SAMPLING" : "STANDBY"}
            </span>
          </div>

          {baseTelemetry.map((x, i) => {
            const liveValue = live
              ? (
                  10.2 +
                  ((liveTick + i) % 8) * 0.72 +
                  (i === 4 ? liveTick % 3 : 0)
                ).toFixed(1)
              : x[2].replace(" μA", "");

            const liveStatus =
              live && i === 4
                ? "WARNING"
                : live && i === 3
                  ? "WATCH"
                  : x[3];

            return (
              <div
                className="telemetry-row"
                key={`${x[0]}-${liveTick}`}
              >
                <span>
                  {live
                    ? `13:42:${String(
                        (6 + liveTick + i) % 60
                      ).padStart(2, "0")}`
                    : x[0]}
                </span>

                <span>{x[1]}</span>

                <span>{liveValue} μA</span>

                <span
                  className={`telemetry-status ${liveStatus.toLowerCase()}`}
                >
                  <CircleDot size={10} />
                  {liveStatus}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ai-insight">
        <div className="ai-icon">
          <Sparkles size={21} />
        </div>

        <div className="ai-copy">
          <span>AI SYSTEM INSIGHT</span>

          <h3>
            {analysis?.within_current_spec
              ? "Latent degradation detected before absolute limit violation."
              : "Absolute specification limit exceeded."}
          </h3>

          <p>
            {selected.id} has a{" "}
            <strong>{risk}/100 reliability risk</strong>. Predicted
            endpoint:{" "}
            <strong>
              {analysis?.predicted_168h ?? selected.predicted}
            </strong>{" "}
            against safety limit{" "}
            <strong>{analysis?.safety_limit ?? "—"}</strong>.
          </p>
        </div>

        <button
          className="review-button"
          onClick={() => {
            setReviewReason("");
            setReview(true);
          }}
        >
          OPEN REVIEW <ChevronRight size={16} />
        </button>
      </section>
    </>
  );
}

function Screening({
  filtered,
  search,
  setSearch,
  selected,
  select,
  analysis,
  loading,
}: any) {
  return (
    <>
      <PageTitle eyebrow="MONITORING" title="Component Screening">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Search size={16} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search component / lot..."
            style={{
              background: "#101d35",
              border: "1px solid #2a3d60",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#fff",
            }}
          />
        </div>
      </PageTitle>

      <div className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>COMPONENT</th>
                <th>LOT</th>
                <th>PARAMETER</th>
                <th>RISK</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c: ComponentItem) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.id}</strong>
                  </td>
                  <td>{c.lot}</td>
                  <td>{c.parameter}</td>
                  <td>
                    {c.id === selected.id
                      ? (analysis?.reliability_risk ?? c.risk)
                      : c.risk}
                  </td>
                  <td>
                    <StatusBadge
                      status={
                        c.id === selected.id
                          ? (analysis?.status ?? c.status)
                          : c.status
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => select(c)}
                    >
                      ANALYZE <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <span className="eyebrow">ACTIVE ANALYSIS</span>

        <h3>
          {selected.id} • {selected.parameter}
        </h3>

        <p style={{ color: "#9aabc5" }}>
          {loading
            ? "AI engine calculating trajectory..."
            : `Current ${
                analysis?.current_value ?? selected.current
              } → predicted 168h ${
                analysis?.predicted_168h ?? selected.predicted
              }; risk ${
                analysis?.reliability_risk ?? selected.risk
              }/100.`}
        </p>
      </div>
    </>
  );
}

function Lots({ components }: { components: ComponentItem[] }) {
  const lots = [...new Set(components.map((c) => c.lot))];

  return (
    <>
      <PageTitle eyebrow="MONITORING" title="Production Lots" />

      <section className="metrics-grid">
        {lots.map((l) => {
          const x = components.filter((c) => c.lot === l);
          const avg = Math.round(
            x.reduce((a, b) => a + b.risk, 0) / x.length
          );

          return (
            <div className="metric-card" key={l}>
              <div className="metric-icon">
                <Layers3 size={18} />
              </div>

              <div className="metric-content">
                <span>{l}</span>
                <strong>{avg}/100</strong>
                <small>
                  {x.length} monitored components •{" "}
                  {x.filter((c) => c.risk >= 60).length} elevated
                </small>
              </div>
            </div>
          );
        })}
      </section>

      <div className="panel">
        <span className="eyebrow">LOT INTELLIGENCE</span>

        <h3>Manufacturing-level reliability comparison</h3>

        <p style={{ color: "#9aabc5" }}>
          ASTRA-SHIELD compares components against their production
          lot to detect abnormal behavior even before an absolute
          datasheet limit is crossed.
        </p>
      </div>
    </>
  );
}

function Drift({
  analysis,
  selected,
}: {
  analysis: AIAnalysis | null;
  selected: ComponentItem;
}) {
  const rows = [
    [
      "24h early drift",
      analysis
        ? `${analysis.early_drift_percent.toFixed(2)}%`
        : selected.trend,
    ],
    [
      "Total 0h→168h drift",
      analysis
        ? `${analysis.total_drift_percent.toFixed(2)}%`
        : "—",
    ],
    [
      "Lot deviation",
      analysis
        ? `${analysis.lot_deviation_sigma.toFixed(2)}σ`
        : "—",
    ],
    [
      "Predicted endpoint",
      analysis
        ? `${analysis.predicted_168h}`
        : selected.predicted,
    ],
    [
      "Safety limit",
      analysis ? `${analysis.safety_limit}` : "—",
    ],
  ];

  return (
    <>
      <PageTitle
        eyebrow="INTELLIGENCE"
        title={`Drift Analytics • ${selected.id}`}
      >
        <span className="status-badge status-warning">
          TRAJECTORY MONITOR
        </span>
      </PageTitle>

      <div className="panel">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5,1fr)",
            gap: 12,
          }}
        >
          {rows.map((r) => (
            <div
              key={r[0]}
              style={{
                background: "#101d35",
                padding: 18,
                borderRadius: 12,
              }}
            >
              <small style={{ color: "#8296b6" }}>{r[0]}</small>

              <strong
                style={{
                  display: "block",
                  fontSize: 22,
                  marginTop: 8,
                }}
              >
                {r[1]}
              </strong>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 18,
            borderLeft: "3px solid #e28a52",
            background: "#111f37",
          }}
        >
          <strong>Interpretation</strong>

          <p style={{ color: "#a8b7cc" }}>
            {analysis?.within_current_spec
              ? "The current measurement is still inside the static specification, but the trajectory is moving rapidly enough to warrant early engineering review."
              : "The measured value has crossed the static specification and requires immediate review."}
          </p>
        </div>
      </div>
    </>
  );
}

function Explain({
  analysis,
  selected,
}: {
  analysis: AIAnalysis | null;
  selected: ComponentItem;
}) {
  const vals = analysis
    ? [
        ["Early drift", analysis.early_drift_percent],
        ["Lot deviation", analysis.lot_deviation_sigma * 20],
        [
          "Endpoint pressure",
          (analysis.predicted_168h / analysis.safety_limit) * 100,
        ],
        ["Trajectory anomaly", analysis.anomaly_score],
      ]
    : [
        ["Early drift", 51],
        ["Lot deviation", 20],
        ["Endpoint pressure", 70],
        ["Trajectory anomaly", 25],
      ];

  return (
    <>
      <PageTitle eyebrow="INTELLIGENCE" title="AI Explanations">
        <span style={{ color: "#8ea4c7" }}>
          ASTRA-RX 1.0 • Explainable scoring
        </span>
      </PageTitle>

      <div className="panel">
        <h3>
          Why {selected.id} received risk{" "}
          {analysis?.reliability_risk ?? selected.risk}/100
        </h3>

        {vals.map((v) => (
          <div key={v[0]} style={{ margin: "22px 0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{v[0]}</span>
              <strong>{Number(v[1]).toFixed(1)}</strong>
            </div>

            <div
              style={{
                height: 8,
                background: "#1c2c48",
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              <div
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(5, Number(v[1]))
                  )}%`,
                  height: "100%",
                  background: "#d4a84f",
                  borderRadius: 8,
                }}
              />
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: 24,
            padding: 18,
            background: "#101e36",
            borderRadius: 12,
          }}
        >
          <strong>AI reasoning</strong>

          <p style={{ color: "#aab8cc" }}>
            The engine combines early drift, lot-level deviation,
            future endpoint utilization and trajectory anomaly to
            identify latent degradation instead of waiting for a
            threshold violation.
          </p>
        </div>
      </div>
    </>
  );
}

function Reports({
  components,
  analysis,
}: {
  components: ComponentItem[];
  analysis: AIAnalysis | null;
}) {
  const counts = {
    Normal: 0,
    Watch: 0,
    Warning: 0,
    Critical: 0,
  };

  components.forEach(
    (c) => (counts[c.status as keyof typeof counts]++)
  );

  return (
    <>
      <PageTitle eyebrow="INTELLIGENCE" title="Reliability Reports">
        <span style={{ color: "#8ea4c7" }}>
          RUN #BS-2026-104
        </span>
      </PageTitle>

      <section className="metrics-grid">
        <MetricCard
          label="NORMAL"
          value={`${counts.Normal}`}
          change="Stable"
          icon={CheckCircle2}
          tone="green"
        />

        <MetricCard
          label="WATCH"
          value={`${counts.Watch}`}
          change="Monitor"
          icon={Activity}
          tone="yellow"
        />

        <MetricCard
          label="WARNING"
          value={`${counts.Warning}`}
          change="Engineer review"
          icon={AlertTriangle}
          tone="red"
        />

        <MetricCard
          label="AI ENGINE"
          value="ONLINE"
          change={analysis ? "Live analysis" : "Demo data"}
          icon={Cpu}
        />
      </section>

      <div className="panel">
        <span className="eyebrow">EXECUTIVE SUMMARY</span>

        <h3>Burn-In Screening Report</h3>

        <p style={{ color: "#aab8cc" }}>
          1,248 components screened in the current demonstration
          batch. 93.8% cleared automatically. Elevated cases are
          prioritized using predicted degradation rather than static
          threshold checks alone.
        </p>
      </div>
    </>
  );
}

function Audit({
  audit,
  decision,
  setReview,
  setReviewReason,
}: {
  audit: string[];
  decision: string;
  setReview: (v: boolean) => void;
  setReviewReason: (v: string) => void;
}) {
  return (
    <>
      <PageTitle eyebrow="SYSTEM" title="Audit Trail">
        <button
          className="analysis-button"
          onClick={() => {
            setReviewReason("");
            setReview(true);
          }}
        >
          <ClipboardCheck size={16} />
          NEW ENGINEER DECISION
        </button>
      </PageTitle>

      <div className="panel">
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <Clock3 size={18} />
          <strong>Decision history</strong>
          <span style={{ color: "#8296b6" }}>
            Current: {decision}
          </span>
        </div>

        {audit.map((a, i) => (
          <div
            key={i}
            style={{
              padding: "15px 0",
              borderTop: "1px solid #203451",
              color: i === 0 ? "#fff" : "#91a4c0",
            }}
          >
            {a}
          </div>
        ))}
      </div>
    </>
  );
}