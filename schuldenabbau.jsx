import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "schuldenabbau-data";
const initialData = { debts: [], payments: [] };

function formatCurrency(n) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}
function formatDate(s) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function todayISO() { return new Date().toISOString().split("T")[0]; }
let _uid = Date.now();
function uid() { return (++_uid).toString(36); }

const Icon = {
  Plus:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Trash:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Chart:  () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Card:   () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  Clock:  () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  X:      () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Target: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Back:   () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Edit:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
};

function ProgressBar({ value, max, color = "#4ade80", height = 10 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: "#1e293b", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99,
        transition: "width 0.7s cubic-bezier(.4,0,.2,1)", boxShadow: `0 0 10px ${color}66` }} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(5px)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:"#0f172a",border:"1px solid #1e293b",borderRadius:22,padding:28,
        width:"100%",maxWidth:460,boxShadow:"0 30px 70px rgba(0,0,0,0.85)",animation:"fadeUp .22s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22 }}>
          <h2 style={{ margin:0,fontSize:17,fontWeight:700,color:"#f1f5f9" }}>{title}</h2>
          <button onClick={onClose} style={S.iconBtn}><Icon.X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:15 }}>
      <label style={{ display:"block",fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6,
        textTransform:"uppercase",letterSpacing:"0.07em" }}>{label}</label>
      {children}
    </div>
  );
}

const S = {
  input: { width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,
    padding:"10px 14px",color:"#f1f5f9",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit" },
  btn: { display:"inline-flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:10,border:"none",
    cursor:"pointer",fontWeight:600,fontSize:13,transition:"opacity 0.15s,transform 0.1s",fontFamily:"inherit" },
  iconBtn: { background:"transparent",border:"none",cursor:"pointer",color:"#64748b",
    display:"flex",alignItems:"center",padding:4,borderRadius:6 },
  card: { background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:20 },
  row: { background:"#1e293b",border:"1px solid #334155",borderRadius:14,
    padding:"14px 16px",marginBottom:10,transition:"border-color 0.2s" },
  tab: active => ({ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:10,
    border:"none",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"inherit",transition:"all 0.2s",
    background: active ? "#3b82f6":"transparent",color: active ? "#fff":"#64748b" }),
  sectionLabel: { fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",
    letterSpacing:"0.07em",marginBottom:10 },
};

const COLORS = ["#3b82f6","#ef4444","#f59e0b","#10b981","#8b5cf6","#ec4899","#06b6d4","#f97316"];

export default function App() {
  const [data, setData]                 = useState(initialData);
  const [tab, setTab]                   = useState("dashboard");
  const [detailDebtId, setDetailDebtId] = useState(null);
  const [showAddDebt, setShowAddDebt]   = useState(false);
  const [showAddPay, setShowAddPay]     = useState(false);
  const [preselDebt, setPreselDebt]     = useState(null);
  const [editDebt, setEditDebt]         = useState(null);

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(STORAGE_KEY); if (r?.value) setData(JSON.parse(r.value)); } catch(_){}
    })();
  }, []);

  const save = useCallback(async nd => {
    setData(nd);
    try { await window.storage.set(STORAGE_KEY, JSON.stringify(nd)); } catch(_){}
  }, []);

  const paidFor = id => data.payments.filter(p => p.debtId===id).reduce((s,p)=>s+p.amount,0);

  const totalDebt = data.debts.reduce((s,d)=>s+d.amount,0);
  const totalPaid = data.payments.reduce((s,p)=>s+p.amount,0);
  const remaining = Math.max(0, totalDebt - totalPaid);
  const progress  = totalDebt>0 ? Math.min(100,(totalPaid/totalDebt)*100) : 0;

  // ── Modals ──────────────────────────────────────────────────────────────────
  function DebtModal({ existing, onClose }) {
    const [form, setForm] = useState(existing
      ? { name:existing.name,creditor:existing.creditor||"",amount:existing.amount,dueDate:existing.dueDate||"",note:existing.note||"",color:existing.color }
      : { name:"",creditor:"",amount:"",dueDate:"",note:"",color:COLORS[0] });
    const set = (k,v) => setForm(f=>({...f,[k]:v}));
    const submit = () => {
      if (!form.name || !form.amount) return;
      if (existing) {
        save({ ...data, debts: data.debts.map(d => d.id===existing.id ? {...d,...form,amount:parseFloat(form.amount)} : d) });
      } else {
        save({ ...data, debts:[...data.debts,{id:uid(),createdAt:todayISO(),...form,amount:parseFloat(form.amount)}] });
      }
      onClose();
    };
    return (
      <Modal title={existing ? "Schuld bearbeiten" : "Neue Schuld"} onClose={onClose}>
        <Field label="Bezeichnung *"><input style={S.input} placeholder="z.B. Kreditkarte" value={form.name} onChange={e=>set("name",e.target.value)}/></Field>
        <Field label="Gläubiger"><input style={S.input} placeholder="z.B. Sparkasse" value={form.creditor} onChange={e=>set("creditor",e.target.value)}/></Field>
        <Field label="Gesamtbetrag (€) *"><input style={S.input} type="number" placeholder="0,00" value={form.amount} onChange={e=>set("amount",e.target.value)}/></Field>
        <Field label="Fälligkeitsdatum"><input style={S.input} type="date" value={form.dueDate} onChange={e=>set("dueDate",e.target.value)}/></Field>
        <Field label="Notiz"><input style={S.input} placeholder="Optional…" value={form.note} onChange={e=>set("note",e.target.value)}/></Field>
        <Field label="Farbe">
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {COLORS.map(c=><button key={c} onClick={()=>set("color",c)}
              style={{ width:26,height:26,borderRadius:99,background:c,border:form.color===c?"3px solid #fff":"3px solid transparent",cursor:"pointer" }}/>)}
          </div>
        </Field>
        <div style={{ display:"flex",gap:10,marginTop:6 }}>
          <button style={{...S.btn,background:"#1e293b",color:"#94a3b8",flex:1}} onClick={onClose}>Abbrechen</button>
          <button style={{...S.btn,background:"#3b82f6",color:"#fff",flex:1}} onClick={submit}>{existing?"Speichern":"Hinzufügen"}</button>
        </div>
      </Modal>
    );
  }

  function PayModal({ presel, onClose }) {
    const [form, setForm] = useState({ debtId:presel||(data.debts[0]?.id??""),amount:"",date:todayISO(),note:"" });
    const set = (k,v) => setForm(f=>({...f,[k]:v}));
    if (!data.debts.length) return (
      <Modal title="Zahlung eintragen" onClose={onClose}>
        <p style={{ color:"#94a3b8",textAlign:"center" }}>Bitte zuerst eine Schuld anlegen.</p>
      </Modal>
    );
    const submit = () => {
      if (!form.debtId||!form.amount) return;
      save({...data, payments:[...data.payments,{id:uid(),...form,amount:parseFloat(form.amount)}]});
      onClose();
    };
    return (
      <Modal title="Zahlung eintragen" onClose={onClose}>
        <Field label="Schuld">
          <select style={S.input} value={form.debtId} onChange={e=>set("debtId",e.target.value)}>
            {data.debts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Betrag (€) *"><input style={S.input} type="number" placeholder="0,00" value={form.amount} onChange={e=>set("amount",e.target.value)}/></Field>
        <Field label="Datum"><input style={S.input} type="date" value={form.date} onChange={e=>set("date",e.target.value)}/></Field>
        <Field label="Notiz"><input style={S.input} placeholder="Optional…" value={form.note} onChange={e=>set("note",e.target.value)}/></Field>
        <div style={{ display:"flex",gap:10,marginTop:6 }}>
          <button style={{...S.btn,background:"#1e293b",color:"#94a3b8",flex:1}} onClick={onClose}>Abbrechen</button>
          <button style={{...S.btn,background:"#10b981",color:"#fff",flex:1}} onClick={submit}>Eintragen</button>
        </div>
      </Modal>
    );
  }

  // ── Debt Detail ─────────────────────────────────────────────────────────────
  function DebtDetail({ debtId }) {
    const debt = data.debts.find(d=>d.id===debtId);
    if (!debt) return null;
    const payments = [...data.payments.filter(p=>p.debtId===debtId)].sort((a,b)=>b.date.localeCompare(a.date));
    const paid = payments.reduce((s,p)=>s+p.amount,0);
    const rest = Math.max(0, debt.amount - paid);
    const pct  = debt.amount>0 ? Math.min(100,(paid/debt.amount)*100) : 0;
    const done = rest===0 && debt.amount>0;

    const monthly = {};
    payments.forEach(p=>{ const m=p.date.slice(0,7); monthly[m]=(monthly[m]||0)+p.amount; });
    const months = Object.keys(monthly).sort().slice(-6);
    const maxM = Math.max(...months.map(m=>monthly[m]),1);

    const delPay = id => save({...data, payments:data.payments.filter(p=>p.id!==id)});

    return (
      <div style={{ animation:"fadeUp .2s ease" }}>
        {/* Breadcrumb / back */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:22,flexWrap:"wrap" }}>
          <button style={{...S.btn,background:"#1e293b",color:"#94a3b8",padding:"8px 14px"}}
            onClick={()=>setDetailDebtId(null)}>
            <Icon.Back /> Alle Schulden
          </button>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
              <div style={{ width:12,height:12,borderRadius:99,background:debt.color,flexShrink:0 }}/>
              <span style={{ fontSize:18,fontWeight:800,color:"#f1f5f9" }}>{debt.name}</span>
              {done && <span style={{ fontSize:10,background:"#10b981",color:"#fff",borderRadius:99,padding:"2px 10px",fontWeight:700 }}>✓ Abbezahlt</span>}
            </div>
            {debt.creditor && <div style={{ fontSize:12,color:"#64748b",paddingLeft:22 }}>{debt.creditor}</div>}
          </div>
          <div style={{ display:"flex",gap:6 }}>
            <button style={{...S.iconBtn,color:"#94a3b8"}} title="Bearbeiten" onClick={()=>setEditDebt(debt)}><Icon.Edit /></button>
            <button style={{...S.btn,background:"#10b981",color:"#fff",padding:"8px 14px"}}
              onClick={()=>{ setPreselDebt(debtId); setShowAddPay(true); }}>
              <Icon.Plus /> Zahlung
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16 }}>
          {[
            { label:"Gesamtschuld", value:formatCurrency(debt.amount), color:"#ef4444" },
            { label:"Bezahlt",      value:formatCurrency(paid),         color:"#10b981" },
            { label:"Offen",        value:formatCurrency(rest),         color:"#f59e0b" },
          ].map(c=>(
            <div key={c.label} style={{...S.card,borderLeft:`3px solid ${c.color}`,padding:"12px 14px"}}>
              <div style={{ fontSize:9,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:17,fontWeight:800,color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div style={{...S.card,marginBottom:16}}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
            <span style={{ fontWeight:700,color:"#f1f5f9" }}>Fortschritt</span>
            <span style={{ color:debt.color,fontWeight:800,fontSize:16 }}>{pct.toFixed(1)}%</span>
          </div>
          <ProgressBar value={paid} max={debt.amount} color={debt.color} height={14}/>
          <div style={{ display:"flex",gap:16,marginTop:10,flexWrap:"wrap" }}>
            {debt.dueDate && <div style={{ fontSize:12,color:"#64748b" }}>📅 Fällig: {formatDate(debt.dueDate)}</div>}
            {debt.note    && <div style={{ fontSize:12,color:"#64748b",fontStyle:"italic" }}>📝 {debt.note}</div>}
            <div style={{ fontSize:12,color:"#64748b" }}>📌 Erstellt: {formatDate(debt.createdAt)}</div>
          </div>
        </div>

        {/* Monthly chart */}
        {months.length > 0 && (
          <div style={{...S.card,marginBottom:16}}>
            <h3 style={{ margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#f1f5f9" }}>Monatliche Zahlungen</h3>
            <div style={{ display:"flex",alignItems:"flex-end",gap:8,height:100 }}>
              {months.map(m=>{
                const h=Math.max(10,(monthly[m]/maxM)*82);
                const label=new Date(m+"-01").toLocaleDateString("de-DE",{month:"short",year:"2-digit"});
                return (
                  <div key={m} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
                    <div style={{ fontSize:9,color:"#94a3b8",fontWeight:600 }}>{formatCurrency(monthly[m]).replace("€","").trim()}€</div>
                    <div style={{ width:"100%",height:h,background:`linear-gradient(to top,${debt.color},${debt.color}88)`,
                      borderRadius:"5px 5px 0 0",boxShadow:`0 0 10px ${debt.color}55` }}/>
                    <div style={{ fontSize:9,color:"#64748b" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment history */}
        <div style={{...S.card}}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <h3 style={{ margin:0,fontSize:14,fontWeight:700,color:"#f1f5f9" }}>
              Zahlungshistorie ({payments.length})
            </h3>
            {payments.length>0 && (
              <span style={{ fontSize:13,color:"#10b981",fontWeight:700 }}>{formatCurrency(paid)} gesamt</span>
            )}
          </div>
          {payments.length===0 ? (
            <div style={{ textAlign:"center",padding:"24px 0",color:"#475569",fontSize:13 }}>
              Noch keine Zahlungen für diese Schuld.
            </div>
          ) : payments.map((p,i)=>(
            <div key={p.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"11px 0",borderBottom: i<payments.length-1?"1px solid #1e293b":"none" }}>
              <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                <div style={{ width:3,borderRadius:99,background:debt.color,alignSelf:"stretch",minHeight:32,flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:15,fontWeight:700,color:"#10b981" }}>+{formatCurrency(p.amount)}</div>
                  <div style={{ fontSize:11,color:"#64748b" }}>{formatDate(p.date)}{p.note?` · ${p.note}`:""}</div>
                </div>
              </div>
              <button style={{...S.iconBtn,color:"#ef4444"}} onClick={()=>delPay(p.id)}><Icon.Trash /></button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  function Dashboard() {
    const recent = [...data.payments].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
    return (
      <div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18 }}>
          {[
            { label:"Gesamtschulden", value:formatCurrency(totalDebt), color:"#ef4444" },
            { label:"Bezahlt",        value:formatCurrency(totalPaid), color:"#10b981" },
            { label:"Verbleibend",    value:formatCurrency(remaining), color:"#f59e0b" },
            { label:"Fortschritt",    value:`${progress.toFixed(1)}%`, color:"#3b82f6" },
          ].map(c=>(
            <div key={c.label} style={{...S.card,borderLeft:`3px solid ${c.color}`,padding:"12px 14px"}}>
              <div style={{ fontSize:9,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:19,fontWeight:800,color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{...S.card,marginBottom:16}}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
            <span style={{ fontWeight:700,color:"#f1f5f9" }}>Gesamtfortschritt</span>
            <span style={{ color:"#10b981",fontWeight:700 }}>{progress.toFixed(1)}%</span>
          </div>
          <ProgressBar value={totalPaid} max={totalDebt} color="#10b981" height={12}/>
          <div style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11,color:"#64748b" }}>
            <span>{formatCurrency(totalPaid)} bezahlt</span>
            <span>{formatCurrency(remaining)} offen</span>
          </div>
        </div>

        {/* Per-debt quick view — click → detail */}
        <div style={{...S.card,marginBottom:16}}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <h3 style={{ margin:0,fontSize:14,fontWeight:700,color:"#f1f5f9" }}>Schulden auf einen Blick</h3>
            <button style={{...S.btn,background:"#3b82f6",color:"#fff",padding:"6px 12px",fontSize:12}}
              onClick={()=>setShowAddDebt(true)}><Icon.Plus /> Neu</button>
          </div>
          {data.debts.length===0 ? (
            <p style={{ color:"#475569",textAlign:"center",fontSize:13,padding:"12px 0" }}>Noch keine Schulden angelegt.</p>
          ) : data.debts.map(d=>{
            const paid=paidFor(d.id), pct=d.amount>0?Math.min(100,(paid/d.amount)*100):0, done=paid>=d.amount&&d.amount>0;
            return (
              <div key={d.id} onClick={()=>{ setDetailDebtId(d.id); setTab("debts"); }}
                style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",
                  borderBottom:"1px solid #1e293b",cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
                onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                <div style={{ width:10,height:10,borderRadius:99,background:d.color,flexShrink:0 }}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <span style={{ fontSize:13,fontWeight:600,color:"#f1f5f9" }}>{d.name}</span>
                    <span style={{ fontSize:12,color:done?"#10b981":d.color,fontWeight:700 }}>{done?"✓":pct.toFixed(0)+"%"}</span>
                  </div>
                  <ProgressBar value={paid} max={d.amount} color={d.color} height={6}/>
                  <div style={{ fontSize:10,color:"#64748b",marginTop:3 }}>{formatCurrency(paid)} / {formatCurrency(d.amount)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{...S.card}}>
          <h3 style={{ margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#f1f5f9" }}>Letzte Zahlungen</h3>
          {recent.length===0 ? (
            <p style={{ color:"#475569",textAlign:"center",fontSize:13 }}>Noch keine Zahlungen.</p>
          ) : recent.map(p=>{
            const debt=data.debts.find(d=>d.id===p.debtId);
            return (
              <div key={p.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"9px 0",borderBottom:"1px solid #1e293b" }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:"#f1f5f9" }}>{debt?.name??"–"}</div>
                  <div style={{ fontSize:11,color:"#64748b" }}>{formatDate(p.date)}{p.note?` · ${p.note}`:""}</div>
                </div>
                <div style={{ fontWeight:700,color:"#10b981",fontSize:13 }}>+{formatCurrency(p.amount)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Debts List ──────────────────────────────────────────────────────────────
  function DebtsView() {
    const delDebt = id => save({ debts:data.debts.filter(d=>d.id!==id), payments:data.payments.filter(p=>p.debtId!==id) });
    const open = data.debts.filter(d => { const p=paidFor(d.id); return p<d.amount||d.amount===0; });
    const done = data.debts.filter(d => paidFor(d.id)>=d.amount && d.amount>0);

    const DebtCard = ({ debt }) => {
      const paid=paidFor(debt.id), rest=Math.max(0,debt.amount-paid);
      const pct=debt.amount>0?Math.min(100,(paid/debt.amount)*100):0, isDone=rest===0&&debt.amount>0;
      return (
        <div style={{...S.row,borderLeft:`4px solid ${debt.color}`,opacity:isDone?0.8:1}}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
            <div style={{ cursor:"pointer",flex:1 }} onClick={()=>setDetailDebtId(debt.id)}>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ fontSize:15,fontWeight:700,color:"#f1f5f9" }}>{debt.name}</span>
                {isDone && <span style={{ fontSize:10,background:"#10b981",color:"#fff",borderRadius:99,padding:"2px 8px",fontWeight:700 }}>✓</span>}
              </div>
              {debt.creditor && <div style={{ fontSize:11,color:"#64748b" }}>{debt.creditor}</div>}
              {debt.dueDate  && <div style={{ fontSize:11,color:"#94a3b8" }}>Fällig: {formatDate(debt.dueDate)}</div>}
            </div>
            <div style={{ display:"flex",gap:6 }}>
              <button style={{...S.btn,background:"#10b981",color:"#fff",padding:"6px 10px"}}
                onClick={()=>{ setPreselDebt(debt.id); setShowAddPay(true); }}><Icon.Plus /></button>
              <button style={{...S.iconBtn,color:"#94a3b8"}} onClick={()=>setEditDebt(debt)}><Icon.Edit /></button>
              <button style={{...S.iconBtn,color:"#ef4444"}} onClick={()=>delDebt(debt.id)}><Icon.Trash /></button>
            </div>
          </div>
          <ProgressBar value={paid} max={debt.amount} color={debt.color}/>
          <div style={{ display:"flex",justifyContent:"space-between",marginTop:7,fontSize:12 }}>
            <span style={{ color:"#10b981" }}>{formatCurrency(paid)} bezahlt</span>
            <span style={{ color:"#94a3b8" }}>{formatCurrency(rest)} offen</span>
            <span style={{ color:debt.color,fontWeight:700 }}>{pct.toFixed(0)}%</span>
          </div>
          <div style={{ fontSize:11,color:"#3b82f6",marginTop:7,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4 }}
            onClick={()=>setDetailDebtId(debt.id)}>
            Details & Zahlungshistorie →
          </div>
        </div>
      );
    };

    return (
      <div>
        <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:16 }}>
          <button style={{...S.btn,background:"#3b82f6",color:"#fff"}} onClick={()=>setShowAddDebt(true)}>
            <Icon.Plus /> Schuld hinzufügen
          </button>
        </div>

        {data.debts.length===0 && (
          <div style={{...S.card,textAlign:"center",padding:48,color:"#475569"}}>
            <div style={{ fontSize:36,marginBottom:10 }}>💳</div>
            Noch keine Schulden angelegt.
          </div>
        )}

        {open.length>0 && <>
          <div style={S.sectionLabel}>Offene Schulden ({open.length})</div>
          {open.map(d=><DebtCard key={d.id} debt={d}/>)}
        </>}

        {done.length>0 && <>
          <div style={{...S.sectionLabel,marginTop:24}}>Abbezahlt ({done.length}) ✓</div>
          {done.map(d=><DebtCard key={d.id} debt={d}/>)}
        </>}
      </div>
    );
  }

  // ── Payments View ───────────────────────────────────────────────────────────
  function PaymentsView() {
    const [filterDebt, setFilterDebt] = useState("all");
    const delPay = id => save({...data, payments:data.payments.filter(p=>p.id!==id)});
    const filtered = [...data.payments]
      .filter(p=>filterDebt==="all"||p.debtId===filterDebt)
      .sort((a,b)=>b.date.localeCompare(a.date));
    const filtTotal = filtered.reduce((s,p)=>s+p.amount,0);

    return (
      <div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10 }}>
          <select style={{...S.input,width:"auto",minWidth:160}} value={filterDebt} onChange={e=>setFilterDebt(e.target.value)}>
            <option value="all">Alle Schulden</option>
            {data.debts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button style={{...S.btn,background:"#10b981",color:"#fff"}} onClick={()=>setShowAddPay(true)}>
            <Icon.Plus /> Zahlung eintragen
          </button>
        </div>

        {filtered.length>0 && (
          <div style={{...S.card,marginBottom:12,padding:"10px 16px",display:"flex",justifyContent:"space-between"}}>
            <span style={{ fontSize:12,color:"#94a3b8" }}>{filtered.length} Einträge</span>
            <span style={{ fontSize:13,fontWeight:700,color:"#10b981" }}>{formatCurrency(filtTotal)}</span>
          </div>
        )}

        {filtered.length===0 ? (
          <div style={{...S.card,textAlign:"center",padding:48,color:"#475569"}}>
            <div style={{ fontSize:36,marginBottom:10 }}>🧾</div>
            Keine Zahlungen gefunden.
          </div>
        ) : filtered.map(p=>{
          const debt=data.debts.find(d=>d.id===p.debtId);
          return (
            <div key={p.id} style={{...S.row}}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                  {debt && <div style={{ width:3,borderRadius:99,background:debt.color,alignSelf:"stretch",minHeight:30,flexShrink:0 }}/>}
                  <div>
                    <div style={{ fontSize:15,fontWeight:700,color:"#10b981" }}>+{formatCurrency(p.amount)}</div>
                    <div style={{ fontSize:11,color:"#94a3b8" }}>
                      {debt?<span style={{ color:debt.color,fontWeight:600 }}>{debt.name}</span>:"–"}
                      {" · "}{formatDate(p.date)}
                    </div>
                    {p.note&&<div style={{ fontSize:11,color:"#64748b",fontStyle:"italic" }}>{p.note}</div>}
                  </div>
                </div>
                <button style={{...S.iconBtn,color:"#ef4444"}} onClick={()=>delPay(p.id)}><Icon.Trash /></button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Stats View ──────────────────────────────────────────────────────────────
  function StatsView() {
    const monthly={};
    data.payments.forEach(p=>{ const m=p.date.slice(0,7); monthly[m]=(monthly[m]||0)+p.amount; });
    const months=Object.keys(monthly).sort().slice(-6);
    const maxM=Math.max(...months.map(m=>monthly[m]),1);
    return (
      <div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
          <div style={{...S.card}}>
            <div style={{ fontSize:9,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:4 }}>Schulden gesamt</div>
            <div style={{ fontSize:24,fontWeight:800,color:"#ef4444" }}>{data.debts.length}</div>
            <div style={{ fontSize:11,color:"#64748b" }}>{data.debts.filter(d=>paidFor(d.id)>=d.amount&&d.amount>0).length} abbezahlt</div>
          </div>
          <div style={{...S.card}}>
            <div style={{ fontSize:9,color:"#64748b",fontWeight:700,textTransform:"uppercase",marginBottom:4 }}>Zahlungen</div>
            <div style={{ fontSize:24,fontWeight:800,color:"#10b981" }}>{data.payments.length}</div>
            <div style={{ fontSize:11,color:"#64748b" }}>Einträge gesamt</div>
          </div>
        </div>

        <div style={{...S.card,marginBottom:16}}>
          <h3 style={{ margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#f1f5f9" }}>Pro Schuld</h3>
          {data.debts.length===0 ? <p style={{ color:"#475569",textAlign:"center" }}>Keine Daten.</p>
            : data.debts.map(d=>{
              const paid=paidFor(d.id), pct=d.amount>0?Math.min(100,(paid/d.amount)*100):0;
              return (
                <div key={d.id} style={{ marginBottom:14,cursor:"pointer" }}
                  onClick={()=>{ setDetailDebtId(d.id); setTab("debts"); }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                      <div style={{ width:8,height:8,borderRadius:99,background:d.color }}/>
                      <span style={{ fontSize:13,fontWeight:600,color:"#f1f5f9" }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize:12,color:d.color,fontWeight:700 }}>{pct.toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={paid} max={d.amount} color={d.color} height={8}/>
                  <div style={{ fontSize:10,color:"#64748b",marginTop:3 }}>{formatCurrency(paid)} / {formatCurrency(d.amount)}</div>
                </div>
              );
            })}
        </div>

        <div style={{...S.card}}>
          <h3 style={{ margin:"0 0 14px",fontSize:14,fontWeight:700,color:"#f1f5f9" }}>Monatliche Zahlungen</h3>
          {months.length===0 ? <p style={{ color:"#475569",textAlign:"center" }}>Noch keine Zahlungen.</p>
            : (
              <div style={{ display:"flex",alignItems:"flex-end",gap:10,height:130 }}>
                {months.map(m=>{
                  const h=Math.max(12,(monthly[m]/maxM)*108);
                  const label=new Date(m+"-01").toLocaleDateString("de-DE",{month:"short",year:"2-digit"});
                  return (
                    <div key={m} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
                      <div style={{ fontSize:9,color:"#94a3b8",fontWeight:600 }}>{formatCurrency(monthly[m]).replace("€","").trim()}€</div>
                      <div style={{ width:"100%",height:h,background:"linear-gradient(to top,#3b82f6,#60a5fa)",
                        borderRadius:"5px 5px 0 0",boxShadow:"0 0 12px #3b82f666" }}/>
                      <div style={{ fontSize:9,color:"#64748b" }}>{label}</div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>
    );
  }

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box}
        body{margin:0;background:#020817;font-family:'Sora',sans-serif}
        input,select,button{font-family:'Sora',sans-serif}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0f172a}::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
      `}</style>

      <div style={{ minHeight:"100vh",background:"#020817",color:"#f1f5f9" }}>
        <div style={{ background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",borderBottom:"1px solid #1e293b",padding:"14px 18px" }}>
          <div style={{ maxWidth:720,margin:"0 auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:19,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.02em" }}>Schuldenabbau</div>
                <div style={{ fontSize:11,color:"#64748b" }}>Dein persönlicher Finanztracker</div>
              </div>
              <button style={{...S.btn,background:"#10b981",color:"#fff",padding:"8px 14px"}}
                onClick={()=>setShowAddPay(true)}>
                <Icon.Plus /> Zahlung
              </button>
            </div>
            <div style={{ display:"flex",gap:4,marginTop:14,flexWrap:"wrap" }}>
              {[
                { id:"dashboard", label:"Dashboard",   icon:<Icon.Target/> },
                { id:"debts",     label:"Schulden",    icon:<Icon.Card/>   },
                { id:"payments",  label:"Zahlungen",   icon:<Icon.Clock/>  },
                { id:"stats",     label:"Statistiken", icon:<Icon.Chart/>  },
              ].map(t=>(
                <button key={t.id} style={S.tab(tab===t.id)} onClick={()=>{ setTab(t.id); if(t.id!=="debts") setDetailDebtId(null); }}>
                  {t.icon} <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth:720,margin:"0 auto",padding:"20px 14px" }}>
          {tab==="dashboard" && <Dashboard />}
          {tab==="debts"     && (detailDebtId ? <DebtDetail debtId={detailDebtId}/> : <DebtsView />)}
          {tab==="payments"  && <PaymentsView />}
          {tab==="stats"     && <StatsView />}
        </div>
      </div>

      {showAddDebt && <DebtModal onClose={()=>setShowAddDebt(false)}/>}
      {editDebt    && <DebtModal existing={editDebt} onClose={()=>setEditDebt(null)}/>}
      {showAddPay  && <PayModal presel={preselDebt} onClose={()=>{ setShowAddPay(false); setPreselDebt(null); }}/>}
    </>
  );
}
