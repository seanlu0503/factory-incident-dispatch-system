import { useEffect, useMemo, useState } from "react";

const statusFlow = ["待確認", "已派工", "處理中", "待料", "已排除", "待驗收", "已結案"];
const STORAGE_KEY = "factory-incident-dispatch-system:v4";

const severityMeta = {
  一般: { tone: "slate", score: 1, slaMinutes: 480 },
  急件: { tone: "amber", score: 2, slaMinutes: 120 },
  停線: { tone: "red", score: 3, slaMinutes: 60 },
  安全風險: { tone: "violet", score: 4, slaMinutes: 30 },
};

const statusTone = {
  待確認: "slate",
  已派工: "blue",
  處理中: "cyan",
  待料: "amber",
  已排除: "green",
  待驗收: "blue",
  已結案: "green",
};

const ownerOptions = ["未指派", "林維修", "曾工程師", "黃品管", "陳生管", "吳班長"];
const improvementOptions = ["待改善", "改善中", "待稽核", "已改善"];

const processSteps = [
  { status: "待確認", owner: "現場主管", detail: "確認影響範圍與嚴重程度" },
  { status: "已派工", owner: "主管", detail: "指派維修、生管或品管處理" },
  { status: "處理中", owner: "責任人員", detail: "排除異常並回填處置方式" },
  { status: "待料", owner: "生管/採購", detail: "追蹤備品、物料或替代方案" },
  { status: "已排除", owner: "責任人員", detail: "異常暫時排除，等待確認" },
  { status: "待驗收", owner: "主管", detail: "檢查 RCA 與預防再發紀錄" },
  { status: "已結案", owner: "主管", detail: "完成驗收並追蹤改善落地" },
];

const initialIncidents = [
  {
    id: "INC-260711-001",
    time: "08:18",
    line: "A 線",
    machine: "CNC-03",
    workOrder: "MO-260711-014",
    type: "設備故障",
    severity: "急件",
    status: "處理中",
    reporter: "林班長",
    owner: "曾工程師",
    downtime: 42,
    description: "主軸出現異音，產出尺寸偏差，已暫停該機台等待維修確認。",
    cause: "主軸軸承磨耗，切削負載升高。",
    action: "暫停 CNC-03，改由 CNC-05 接續急件工單，維修確認備品。",
    prevention: "新增主軸振動點檢週期，連續兩次異常需提前保養。",
    reviewNote: "",
    improvementStatus: "改善中",
  },
  {
    id: "INC-260711-002",
    time: "09:05",
    line: "B 線",
    machine: "LASER-01",
    workOrder: "MO-260711-020",
    type: "換線延遲",
    severity: "一般",
    status: "已派工",
    reporter: "吳技術員",
    owner: "陳生管",
    downtime: 18,
    description: "模具更換時間超過標準，影響下一張工單開工時間。",
    cause: "換線治具未提前備妥。",
    action: "調整工單順序，先安排相同治具產品。",
    prevention: "換線前 30 分鐘由生管確認治具與刀具備料。",
    reviewNote: "",
    improvementStatus: "待稽核",
  },
  {
    id: "INC-260711-003",
    time: "10:22",
    line: "C 線",
    machine: "PRESS-04",
    workOrder: "MO-260711-026",
    type: "設備故障",
    severity: "停線",
    status: "待料",
    reporter: "許組長",
    owner: "林維修",
    downtime: 76,
    description: "油壓異常警報，產線暫停，已通知維修工程師。",
    cause: "油壓閥回壓不穩，需更換密封件。",
    action: "等待備品到料，暫以 B 線支援部分產能。",
    prevention: "建立油壓閥備品安全庫存，低於 2 組自動提醒。",
    reviewNote: "",
    improvementStatus: "待改善",
  },
  {
    id: "INC-260711-004",
    time: "11:10",
    line: "A 線",
    machine: "QC-02",
    workOrder: "MO-260711-017",
    type: "品質異常",
    severity: "急件",
    status: "待驗收",
    reporter: "黃品管",
    owner: "黃品管",
    downtime: 25,
    description: "連續三件孔位偏移，暫停出貨抽驗並回查製程參數。",
    cause: "定位銷鬆動造成夾治具偏移。",
    action: "重新鎖固定位銷，補做首件確認與抽驗。",
    prevention: "品檢異常回饋加工站，首件檢查增加治具定位確認。",
    reviewNote: "已完成首件確認，抽驗結果正常，待主管簽核結案。",
    improvementStatus: "待稽核",
  },
  {
    id: "INC-260711-005",
    time: "13:35",
    line: "B 線",
    machine: "MAT-02",
    workOrder: "MO-260711-031",
    type: "缺料",
    severity: "一般",
    status: "待確認",
    reporter: "陳生管",
    owner: "未指派",
    downtime: 0,
    description: "鋁材批號未到齊，下一批工單可能延後開工。",
    cause: "",
    action: "",
    prevention: "",
    reviewNote: "",
    improvementStatus: "待改善",
  },
  {
    id: "INC-260711-006",
    time: "14:08",
    line: "C 線",
    machine: "PKG-05",
    workOrder: "MO-260711-036",
    type: "安全風險",
    severity: "安全風險",
    status: "處理中",
    reporter: "曾工程師",
    owner: "吳班長",
    downtime: 12,
    description: "包裝區棧板通道堆放異常，影響人員與搬運車動線。",
    cause: "暫存區標示不足，晚班交接未確認。",
    action: "立即清空通道，重新標示暫存區與搬運路線。",
    prevention: "班前點檢新增通道淨空確認，異常拍照回報。",
    reviewNote: "",
    improvementStatus: "改善中",
  },
];

const emptyDraft = {
  line: "A 線",
  machine: "CNC-03",
  workOrder: "MO-260711-040",
  type: "設備故障",
  severity: "急件",
  reporter: "現場人員",
  description: "",
};

function Pill({ children, tone = "slate" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function ProgressBar({ value, tone = "blue" }) {
  return (
    <div className="progress" aria-label={`比例 ${value}%`}>
      <span className={`progress-fill ${tone}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function nextStatus(current) {
  const index = statusFlow.indexOf(current);
  return statusFlow[Math.min(index + 1, statusFlow.length - 1)];
}

function timeToMinutes(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function getElapsedMinutes(incident) {
  const currentDemoTime = 16 * 60 + 20;
  return Math.max(currentDemoTime - timeToMinutes(incident.time), 0);
}

function getSlaInfo(incident) {
  const limit = severityMeta[incident.severity].slaMinutes;
  const elapsed = getElapsedMinutes(incident);
  const remaining = limit - elapsed;

  if (incident.status === "已結案") {
    return {
      label: "已結案",
      tone: "green",
      detail: "主管已完成驗收，不列入逾時追蹤。",
      progress: 100,
    };
  }

  if (remaining <= 0) {
    return {
      label: "已逾時",
      tone: "red",
      detail: `已超過 SLA ${minutesLabel(Math.abs(remaining))}，需優先追蹤。`,
      progress: 100,
    };
  }

  if (remaining <= Math.max(30, limit * 0.25)) {
    return {
      label: "即將逾時",
      tone: "amber",
      detail: `剩餘 ${minutesLabel(remaining)}，建議主管確認處理進度。`,
      progress: Math.round((elapsed / limit) * 100),
    };
  }

  return {
    label: "SLA 正常",
    tone: "blue",
    detail: `剩餘 ${minutesLabel(remaining)}，標準處理時限 ${minutesLabel(limit)}。`,
    progress: Math.round((elapsed / limit) * 100),
  };
}

function minutesLabel(minutes) {
  if (minutes === 0) return "未停機";
  if (minutes < 60) return `${minutes} 分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小時 ${rest} 分` : `${hours} 小時`;
}

function nowLabel() {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function createHistory({ action, actor, status, note }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: nowLabel(),
    action,
    actor,
    status,
    note,
  };
}

function ensureHistory(incident) {
  const normalized = {
    reviewNote: "",
    improvementStatus: "待改善",
    closure: null,
    ...incident,
  };

  if (Array.isArray(normalized.history) && normalized.history.length > 0) {
    return normalized;
  }

  return {
    ...normalized,
    history: [
      {
        id: `${normalized.id}-created`,
        time: normalized.time,
        action: "建立異常回報",
        actor: normalized.reporter,
        status: "待確認",
        note: normalized.description,
      },
      ...(normalized.owner !== "未指派"
        ? [
            {
              id: `${normalized.id}-assigned`,
              time: normalized.time,
              action: "指派處理人員",
              actor: "主管",
              status: normalized.status,
              note: `指派給 ${normalized.owner}`,
            },
          ]
        : []),
    ],
  };
}

function getClosureChecks(incident) {
  return [
    { label: "已進入待驗收", complete: incident.status === "待驗收" || incident.status === "已結案" },
    { label: "根本原因已填寫", complete: Boolean(incident.cause?.trim()) },
    { label: "處置方式已填寫", complete: Boolean(incident.action?.trim()) },
    { label: "預防再發已填寫", complete: Boolean(incident.prevention?.trim()) },
    { label: "主管驗收備註已填寫", complete: Boolean(incident.reviewNote?.trim()) },
  ];
}

function loadIncidents() {
  if (typeof window === "undefined") {
    return initialIncidents.map(ensureHistory);
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialIncidents.map(ensureHistory);
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return initialIncidents.map(ensureHistory);
    }
    return parsed.map(ensureHistory);
  } catch {
    return initialIncidents.map(ensureHistory);
  }
}

export function App() {
  const [incidents, setIncidents] = useState(loadIncidents);
  const [selectedId, setSelectedId] = useState(initialIncidents[0].id);
  const [lineFilter, setLineFilter] = useState("全部產線");
  const [statusFilter, setStatusFilter] = useState("全部狀態");
  const [severityFilter, setSeverityFilter] = useState("全部等級");
  const [draft, setDraft] = useState(emptyDraft);

  const selected = incidents.find((item) => item.id === selectedId) ?? incidents[0];

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((item) => lineFilter === "全部產線" || item.line === lineFilter)
      .filter((item) => statusFilter === "全部狀態" || item.status === statusFilter)
      .filter((item) => severityFilter === "全部等級" || item.severity === severityFilter)
      .sort((a, b) => severityMeta[b.severity].score - severityMeta[a.severity].score);
  }, [incidents, lineFilter, severityFilter, statusFilter]);

  const metrics = useMemo(() => {
    const open = incidents.filter((item) => item.status !== "已結案").length;
    const stopLine = incidents.filter((item) => item.severity === "停線").length;
    const safety = incidents.filter((item) => item.severity === "安全風險").length;
    const totalDowntime = incidents.reduce((sum, item) => sum + item.downtime, 0);
    const avg = Math.round(totalDowntime / incidents.length);
    return { open, stopLine, safety, avg, totalDowntime };
  }, [incidents]);

  const typeStats = useMemo(() => {
    const totals = incidents.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [incidents]);

  const machineStats = useMemo(() => {
    const totals = incidents.reduce((acc, item) => {
      acc[item.machine] = (acc[item.machine] ?? 0) + item.downtime;
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [incidents]);

  const slaStats = useMemo(() => {
    return incidents.reduce(
      (acc, item) => {
        const sla = getSlaInfo(item);
        if (sla.label === "已逾時") acc.overdue += 1;
        if (sla.label === "即將逾時") acc.warning += 1;
        return acc;
      },
      { overdue: 0, warning: 0 },
    );
  }, [incidents]);

  const improvementStats = useMemo(() => {
    return incidents.reduce((acc, item) => {
      acc[item.improvementStatus] = (acc[item.improvementStatus] ?? 0) + 1;
      return acc;
    }, {});
  }, [incidents]);

  function updateSelected(patch) {
    setIncidents((current) =>
      current.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)),
    );
  }

  function appendHistory(incident, entry) {
    return {
      ...incident,
      history: [...(incident.history ?? []), entry],
    };
  }

  function assignOwner(owner) {
    setIncidents((current) =>
      current.map((item) => {
        if (item.id !== selected.id) return item;
        const status = item.status === "待確認" ? "已派工" : item.status;
        return appendHistory(
          { ...item, owner, status },
          createHistory({
            action: "指派處理人員",
            actor: "主管",
            status,
            note: `處理人員：${owner}`,
          }),
        );
      }),
    );
  }

  function advanceIncident(id) {
    setIncidents((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const status = nextStatus(item.status);
        const owner = item.owner === "未指派" ? "林維修" : item.owner;
        return appendHistory(
          { ...item, status, owner },
          createHistory({
            action: "推進處理狀態",
            actor: owner,
            status,
            note: `狀態由「${item.status}」更新為「${status}」`,
          }),
        );
      }),
    );
  }

  function closeIncident() {
    const checks = getClosureChecks(selected);
    if (checks.some((check) => !check.complete)) return;

    setIncidents((current) =>
      current.map((item) => {
        if (item.id !== selected.id) return item;
        const closedAt = nowLabel();
        const note = item.reviewNote;
        return appendHistory(
          {
            ...item,
            status: "已結案",
            closure: {
              result: "驗收通過，異常已排除",
              closedAt,
            },
          },
          createHistory({
            action: "主管驗收結案",
            actor: "主管",
            status: "已結案",
            note,
          }),
        );
      }),
    );
  }

  function recordRcaUpdate() {
    setIncidents((current) =>
      current.map((item) =>
        item.id === selected.id
          ? appendHistory(
              item,
              createHistory({
                action: "更新 RCA 紀錄",
                actor: item.owner === "未指派" ? "主管" : item.owner,
                status: item.status,
                note: "已更新原因、處理方式或預防再發措施。",
              }),
            )
          : item,
      ),
    );
  }

  function updateImprovementStatus(status) {
    setIncidents((current) =>
      current.map((item) =>
        item.id === selected.id
          ? appendHistory(
              { ...item, improvementStatus: status },
              createHistory({
                action: "更新改善追蹤",
                actor: "主管",
                status: item.status,
                note: `改善狀態由「${item.improvementStatus}」更新為「${status}」。`,
              }),
            )
          : item,
      ),
    );
  }

  function resetDemo() {
    const restored = initialIncidents.map(ensureHistory);
    setIncidents(restored);
    setSelectedId(restored[0].id);
    setLineFilter("全部產線");
    setStatusFilter("全部狀態");
    setSeverityFilter("全部等級");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function createIncident(event) {
    event.preventDefault();
    const nextNumber = String(incidents.length + 1).padStart(3, "0");
    const incident = {
      id: `INC-260711-${nextNumber}`,
      time: "15:20",
      status: "待確認",
      owner: "未指派",
      downtime: 0,
      cause: "",
      action: "",
      prevention: "",
      reviewNote: "",
      improvementStatus: "待改善",
      ...draft,
      description: draft.description || "現場回報異常，等待主管確認影響範圍。",
    };
    incident.history = [
      createHistory({
        action: "建立異常回報",
        actor: incident.reporter,
        status: incident.status,
        note: incident.description,
      }),
    ];
    setIncidents((current) => [incident, ...current]);
    setSelectedId(incident.id);
    setDraft(emptyDraft);
  }

  const maxType = Math.max(...typeStats.map((item) => item.value), 1);
  const maxMachine = Math.max(...machineStats.map((item) => item.value), 1);
  const selectedSla = getSlaInfo(selected);
  const closureChecks = getClosureChecks(selected);
  const canClose = closureChecks.every((check) => check.complete) && selected.status !== "已結案";
  const remainingChecks = closureChecks.filter((check) => !check.complete);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">I</span>
          <div>
            <strong>Incident Dispatch</strong>
            <small>Factory Portfolio System</small>
          </div>
        </div>
        <nav className="nav-list" aria-label="系統導覽">
          <a href="#overview" className="active">異常總覽</a>
          <a href="#new-report">新增回報</a>
          <a href="#dispatch">派工看板</a>
          <a href="#rules">流程規則</a>
          <a href="#review">主管驗收</a>
          <a href="#improvement">改善追蹤</a>
          <a href="#rca">RCA 紀錄</a>
          <a href="#analytics">異常分析</a>
        </nav>
        <section className="side-note">
          <p className="section-label">AI Collaboration</p>
          <h2>作品定位</h2>
          <p>
            模擬工廠現場從異常發生、主管確認、維修派工到結案改善的流程，作為智慧製造求職作品集的第二個專案。
          </p>
        </section>
      </aside>

      <section className="workspace">
        <header className="hero" id="overview">
          <div>
            <p className="eyebrow">資管夜間部學生｜AI 協作開發｜工廠異常處理流程</p>
            <h1>
              <span>工廠異常回報</span>
              <span>與維修派工系統</span>
            </h1>
            <p>
              將設備故障、品質異常、缺料、停線與安全風險整理成可追蹤的派工流程，讓現場問題能被回報、指派、處理與留下改善紀錄。
            </p>
          </div>
          <div className="hero-actions">
            <a href="#new-report">新增異常</a>
            <a href="#dispatch">查看派工</a>
            <button type="button" onClick={resetDemo}>重設展示</button>
          </div>
        </header>

        <section className="kpi-grid" aria-label="異常 KPI">
          <article>
            <span>未結案案件</span>
            <strong>{metrics.open}</strong>
            <small>需主管或維修追蹤</small>
          </article>
          <article>
            <span>停線事件</span>
            <strong>{metrics.stopLine}</strong>
            <small>優先排除產能影響</small>
          </article>
          <article>
            <span>安全風險</span>
            <strong>{metrics.safety}</strong>
            <small>需立即處置</small>
          </article>
          <article>
            <span>平均停機時間</span>
            <strong>{metrics.avg}分</strong>
            <small>累計 {metrics.totalDowntime} 分鐘</small>
          </article>
          <article>
            <span>SLA 風險</span>
            <strong>{slaStats.overdue}</strong>
            <small>{slaStats.warning} 件即將逾時</small>
          </article>
        </section>

        <section className="two-column">
          <form className="panel report-form" id="new-report" onSubmit={createIncident}>
            <div className="panel-heading">
              <div>
                <p className="section-label">New Report</p>
                <h2>新增異常回報</h2>
              </div>
              <Pill tone="blue">現場端</Pill>
            </div>
            <div className="form-grid">
              <label>
                產線
                <select value={draft.line} onChange={(event) => setDraft({ ...draft, line: event.target.value })}>
                  <option>A 線</option>
                  <option>B 線</option>
                  <option>C 線</option>
                </select>
              </label>
              <label>
                機台
                <input value={draft.machine} onChange={(event) => setDraft({ ...draft, machine: event.target.value })} />
              </label>
              <label>
                工單編號
                <input value={draft.workOrder} onChange={(event) => setDraft({ ...draft, workOrder: event.target.value })} />
              </label>
              <label>
                異常類型
                <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
                  <option>設備故障</option>
                  <option>品質異常</option>
                  <option>缺料</option>
                  <option>換線延遲</option>
                  <option>安全風險</option>
                </select>
              </label>
              <label>
                嚴重程度
                <select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value })}>
                  <option>一般</option>
                  <option>急件</option>
                  <option>停線</option>
                  <option>安全風險</option>
                </select>
              </label>
              <label>
                回報人
                <input value={draft.reporter} onChange={(event) => setDraft({ ...draft, reporter: event.target.value })} />
              </label>
            </div>
            <label className="full-field">
              問題描述
              <textarea
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="例如：機台出現警報、尺寸偏差、缺料或停線狀況..."
              />
            </label>
            <button type="submit" className="primary-button">建立異常單</button>
          </form>

          <section className="panel selected-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Selected Incident</p>
                <h2>{selected.id}</h2>
              </div>
              <Pill tone={severityMeta[selected.severity].tone}>{selected.severity}</Pill>
            </div>
            <div className="incident-summary">
              <div>
                <span>狀態</span>
                <strong>{selected.status}</strong>
              </div>
              <div>
                <span>處理人員</span>
                <strong>{selected.owner}</strong>
              </div>
              <div>
                <span>停機時間</span>
                <strong>{minutesLabel(selected.downtime)}</strong>
              </div>
              <div>
                <span>SLA 狀態</span>
                <strong>{selectedSla.label}</strong>
              </div>
            </div>
            <div className={`sla-card ${selectedSla.tone}`}>
              <div>
                <span>處理時限</span>
                <strong>{selectedSla.detail}</strong>
              </div>
              <ProgressBar value={selectedSla.progress} tone={selectedSla.tone} />
            </div>
            <p className="description">{selected.description}</p>
            <div className="assign-row">
              <label>
                指派人員
                <select value={selected.owner} onChange={(event) => assignOwner(event.target.value)}>
                  {ownerOptions.map((owner) => (
                    <option key={owner}>{owner}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => advanceIncident(selected.id)}>推進狀態</button>
            </div>
            <div className="timeline-preview">
              <div className="timeline-title">
                <span>處理歷程</span>
                <strong>{selected.history?.length ?? 0}</strong>
              </div>
              {(selected.history ?? []).slice(-4).reverse().map((event) => (
                <article key={event.id} className="timeline-item">
                  <time>{event.time}</time>
                  <div>
                    <strong>{event.action}</strong>
                    <small>{event.actor}｜{event.status}</small>
                    <p>{event.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="panel" id="dispatch">
          <div className="panel-heading">
            <div>
              <p className="section-label">Dispatch Board</p>
              <h2>異常派工看板</h2>
            </div>
            <div className="filters">
              <select value={lineFilter} onChange={(event) => setLineFilter(event.target.value)}>
                <option>全部產線</option>
                <option>A 線</option>
                <option>B 線</option>
                <option>C 線</option>
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>全部狀態</option>
                {statusFlow.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
                <option>全部等級</option>
                {Object.keys(severityMeta).map((severity) => (
                  <option key={severity}>{severity}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="status-board">
            {statusFlow.map((status) => {
              const items = filteredIncidents.filter((incident) => incident.status === status);
              return (
                <div className="status-column" key={status}>
                  <div className="column-title">
                    <span>{status}</span>
                    <strong>{items.length}</strong>
                  </div>
                  {items.map((incident) => (
                    <button
                      type="button"
                      className={`incident-card ${selected.id === incident.id ? "selected" : ""}`}
                      key={incident.id}
                      onClick={() => setSelectedId(incident.id)}
                    >
                      <span>{incident.id}</span>
                      <strong>{incident.type}</strong>
                      <small>{incident.line}｜{incident.machine}</small>
                      <div className="card-pills">
                        <Pill tone={severityMeta[incident.severity].tone}>{incident.severity}</Pill>
                        <Pill tone={getSlaInfo(incident).tone}>{getSlaInfo(incident).label}</Pill>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <section className="two-column" id="rules">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">SLA Rules</p>
                <h2>嚴重程度與處理時限</h2>
              </div>
            </div>
            <div className="sla-rule-grid">
              {Object.entries(severityMeta).map(([severity, meta]) => (
                <article key={severity}>
                  <Pill tone={meta.tone}>{severity}</Pill>
                  <strong>{minutesLabel(meta.slaMinutes)}</strong>
                  <small>
                    {severity === "安全風險"
                      ? "立即隔離風險並通知主管"
                      : severity === "停線"
                        ? "優先恢復產線與替代產能"
                        : severity === "急件"
                          ? "當班追蹤，避免影響交期"
                          : "例行追蹤並納入交接"}
                  </small>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Process Map</p>
                <h2>異常處理流程圖</h2>
              </div>
            </div>
            <div className="process-map">
              {processSteps.map((step, index) => (
                <article
                  key={step.status}
                  className={`process-step ${selected.status === step.status ? "active" : ""}`}
                >
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.status}</strong>
                    <small>{step.owner}</small>
                    <p>{step.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="two-column">
          <section className="panel" id="review">
            <div className="panel-heading">
              <div>
                <p className="section-label">Supervisor Review</p>
                <h2>主管驗收與結案</h2>
              </div>
              <Pill tone={statusTone[selected.status]}>{selected.status}</Pill>
            </div>
            <div className="review-checklist">
              <div className={closureChecks[0].complete ? "done" : ""}>
                <span>1</span>
                <strong>案件進入待驗收</strong>
              </div>
              <div className={closureChecks[1].complete ? "done" : ""}>
                <span>2</span>
                <strong>根本原因已填寫</strong>
              </div>
              <div className={closureChecks[2].complete ? "done" : ""}>
                <span>3</span>
                <strong>處置方式已填寫</strong>
              </div>
              <div className={closureChecks[3].complete ? "done" : ""}>
                <span>4</span>
                <strong>預防再發已填寫</strong>
              </div>
              <div className={closureChecks[4].complete ? "done" : ""}>
                <span>5</span>
                <strong>驗收備註已填寫</strong>
              </div>
            </div>
            <label className="full-field">
              主管驗收備註
              <textarea
                value={selected.reviewNote}
                onChange={(event) => updateSelected({ reviewNote: event.target.value })}
                placeholder="例如：確認機台恢復、首件檢查合格、現場安全風險已排除..."
              />
            </label>
            {selected.status === "已結案" ? (
              <div className="closure-status complete">
                <strong>{selected.closure?.result ?? "驗收通過，異常已排除"}</strong>
                <span>結案時間：{selected.closure?.closedAt ?? "已完成記錄"}。改善追蹤會持續保留，確認預防措施是否落地。</span>
              </div>
            ) : (
              <>
                <div className={`closure-status ${canClose ? "ready" : "pending"}`}>
                  <strong>{canClose ? "結案條件已完成" : "尚未符合結案條件"}</strong>
                  <span>
                    {canClose
                      ? "主管確認後可將本案結案，並保留改善追蹤紀錄。"
                      : `尚缺：${remainingChecks.map((check) => check.label).join("、")}`}
                  </span>
                </div>
                <button type="button" className="primary-button" onClick={closeIncident} disabled={!canClose}>
                  主管驗收並結案
                </button>
              </>
            )}
          </section>

          <section className="panel" id="improvement">
            <div className="panel-heading">
              <div>
                <p className="section-label">Improvement Tracking</p>
                <h2>改善追蹤</h2>
              </div>
              <Pill tone="green">{selected.improvementStatus}</Pill>
            </div>
            <div className="improvement-board">
              {improvementOptions.map((status) => (
                <button
                  type="button"
                  key={status}
                  className={selected.improvementStatus === status ? "active" : ""}
                  onClick={() => updateImprovementStatus(status)}
                >
                  <span>{status}</span>
                  <strong>{improvementStats[status] ?? 0}</strong>
                </button>
              ))}
            </div>
            <p className="improvement-note">
              改善追蹤用來確認 RCA 的預防再發措施是否真的落地，例如點檢週期、備品安全庫存、首件確認或現場標示改善。
            </p>
          </section>

          <section className="panel" id="rca">
            <div className="panel-heading">
              <div>
                <p className="section-label">RCA Record</p>
                <h2>原因、處置與預防再發</h2>
              </div>
              <Pill tone={statusTone[selected.status]}>{selected.status}</Pill>
            </div>
            <label className="full-field">
              初步原因 / 根本原因
              <textarea value={selected.cause} onChange={(event) => updateSelected({ cause: event.target.value })} />
            </label>
            <label className="full-field">
              處理方式
              <textarea value={selected.action} onChange={(event) => updateSelected({ action: event.target.value })} />
            </label>
            <label className="full-field">
              預防再發措施
              <textarea value={selected.prevention} onChange={(event) => updateSelected({ prevention: event.target.value })} />
            </label>
            <button type="button" className="secondary-button" onClick={recordRcaUpdate}>
              記錄 RCA 更新
            </button>
          </section>

          <section className="panel" id="analytics">
            <div className="panel-heading">
              <div>
                <p className="section-label">Analytics</p>
                <h2>異常統計分析</h2>
              </div>
            </div>
            <div className="chart-block">
              <h3>異常類型排行</h3>
              {typeStats.map((item) => (
                <div className="bar-row" key={item.label}>
                  <span>{item.label}</span>
                  <ProgressBar value={Math.round((item.value / maxType) * 100)} />
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="chart-block">
              <h3>機台停機時間排行</h3>
              {machineStats.map((item) => (
                <div className="bar-row" key={item.label}>
                  <span>{item.label}</span>
                  <ProgressBar value={Math.round((item.value / maxMachine) * 100)} tone="amber" />
                  <strong>{item.value}分</strong>
                </div>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
