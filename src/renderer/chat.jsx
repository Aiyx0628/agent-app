import * as React from 'react';
import { Ic } from './icons';

// ── helpers ──────────────────────────────────────────────────────────────────

function contentToText(content) {
  return content.map(c => c.t ?? c.label ?? '').join('');
}

function toApiMessages(msgs) {
  return msgs.map(m => ({ role: m.role, content: contentToText(m.content) }));
}

// ── AI Settings panel ─────────────────────────────────────────────────────────

function AiSettings({ onClose }) {
  const [cfg, setCfg] = React.useState({ baseUrl: '', apiKey: '', model: '' });
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    window.api?.ai?.getConfig().then(c => setCfg(c));
  }, []);

  const save = async () => {
    await window.api?.ai?.setConfig(cfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="ai-settings">
      <div className="ai-settings-header">
        <span>AI 模型配置</span>
        <button className="icon-btn" onClick={onClose}><Ic.close/></button>
      </div>
      <label>
        <span>Base URL</span>
        <input type="text" value={cfg.baseUrl} placeholder="https://api.openai.com/v1"
          onChange={e => setCfg(c => ({ ...c, baseUrl: e.target.value }))}/>
      </label>
      <label>
        <span>API Key</span>
        <input type="password" value={cfg.apiKey} placeholder="sk-..."
          onChange={e => setCfg(c => ({ ...c, apiKey: e.target.value }))}/>
      </label>
      <label>
        <span>Model</span>
        <input type="text" value={cfg.model} placeholder="gpt-4o"
          onChange={e => setCfg(c => ({ ...c, model: e.target.value }))}/>
      </label>
      <button className="ai-settings-save" onClick={save}>
        {saved ? '已保存 ✓' : '保存'}
      </button>
    </div>
  );
}

// ── Analyzing placeholder ─────────────────────────────────────────────────────

function AnalyzingPlaceholder() {
  return (
    <div className="analyzing">
      <div className="analyzing-spinner"/>
      <div>正在审阅合同，请稍候…</div>
    </div>
  );
}

// ── Issue card ────────────────────────────────────────────────────────────────

function IssueCard({ it, isActive, onJump }) {
  const sevCls = it.severity === 'high' ? '' : it.severity === 'med' ? 'sev-med' : 'sev-low';
  const chipCls = it.severity === 'high' ? '' : it.severity === 'med' ? 'med' : 'low';
  const sevLabel = { high: '高', med: '中', low: '低' }[it.severity] || it.severity;

  return (
    <div className={`issue-card ${sevCls} ${isActive ? 'active' : ''}`} onClick={() => onJump(it)}>
      <div className="issue-head">
        <Ic.alert color={
          it.severity === 'high' ? 'var(--sev-high)' :
          it.severity === 'med' ? 'oklch(0.6 0.12 60)' : 'var(--sev-low)'
        }/>
        <span className={`sev-chip ${chipCls}`}>{sevLabel}</span>
        <span className="cat-chip">{it.category}</span>
        <button className="loc-chip-btn" onClick={e => { e.stopPropagation(); onJump(it); }}>
          <Ic.mapPin/> 定位
        </button>
      </div>

      <div className="issue-section">
        <div className="sec-label"><span className="sec-dot s-quote"/>原文</div>
        <div className="sec-body quote">{it.quote}</div>
      </div>

      <div className="issue-section">
        <div className="sec-label"><span className="sec-dot s-issue"/>问题点</div>
        <div className="sec-body">{it.body}</div>
      </div>

      <div className="issue-section">
        <div className="sec-label"><span className="sec-dot s-tip"/>建议</div>
        <div className="sec-body tip">{it.recommendation}</div>
      </div>

      <div className="issue-actions">
        <button className="mini-btn primary" onClick={e => { e.stopPropagation(); onJump(it); }}>
          采纳建议
        </button>
        <button className="mini-btn" onClick={e => e.stopPropagation()}>忽略</button>
      </div>
    </div>
  );
}

// ── Chat component ────────────────────────────────────────────────────────────

export function Chat({
  activeIssue,
  onJumpToIssue,
  issues = [],
  analysisStatus = 'idle',
  analysisError = '',
  onAnalyze,
  hasPdf = false,
}) {
  const [tab, setTab] = React.useState('issues');
  const issueCount = issues.length;
  const [messages, setMessages] = React.useState([]);
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const msgsRef = React.useRef(null);
  const cancelRef = React.useRef(null);

  React.useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, typing, tab]);

  React.useEffect(() => () => cancelRef.current?.(), []);

  const send = () => {
    if (!draft.trim() || typing) return;

    const userMsg = { id: 'u-' + Date.now(), role: 'user', content: [{ t: draft }] };
    const aId = 'a-' + Date.now();
    const pendingMsg = { id: aId, role: 'assistant', content: [{ t: '' }] };
    const apiMessages = [...toApiMessages(messages), { role: 'user', content: draft }];

    setMessages(m => [...m, userMsg, pendingMsg]);
    setDraft('');
    setTyping(true);

    const textAccum = { v: '' };

    cancelRef.current = window.api?.ai?.chat(
      apiMessages,
      chunk => {
        textAccum.v += chunk;
        const snap = textAccum.v;
        setMessages(m => m.map(msg => msg.id === aId ? { ...msg, content: [{ t: snap }] } : msg));
      },
      () => { setTyping(false); cancelRef.current = null; },
      err => {
        setMessages(m => m.map(msg => msg.id === aId ? { ...msg, content: [{ t: '⚠ ' + err }] } : msg));
        setTyping(false);
        cancelRef.current = null;
      },
    );

    if (!window.api?.ai) {
      setTimeout(() => {
        setMessages(m => m.map(msg =>
          msg.id === aId ? { ...msg, content: [{ t: '（未配置 AI 服务，请点击右上角 ⚙ 填写 API Key）' }] } : msg
        ));
        setTyping(false);
      }, 600);
    }
  };

  return (
    <div className="pane right">
      <div className="rp-header">
        <span className="dot"/>
        <span className="title">AI 合同助手</span>
        <div style={{ flex: 1 }}/>
        {analysisStatus === 'done' && (
          <span className="stat">发现 {issueCount} 项问题</span>
        )}
        <button
          className={`icon-btn ${settingsOpen ? 'active' : ''}`}
          title="AI 设置"
          style={{ marginLeft: 6 }}
          onClick={() => setSettingsOpen(o => !o)}
        >
          <Ic.gear/>
        </button>
      </div>

      {settingsOpen && <AiSettings onClose={() => setSettingsOpen(false)}/>}

      <div className="tabs">
        <button className={`tab ${tab === 'convo' ? 'active' : ''}`} onClick={() => setTab('convo')}>
          <Ic.chat/> 对话
        </button>
        <button className={`tab ${tab === 'issues' ? 'active' : ''}`} onClick={() => setTab('issues')}>
          <Ic.list/> 问题清单
          {issueCount > 0 && <span className="n">{issueCount}</span>}
        </button>
        <div className="spacer"/>
        <button className="tab-tool"><Ic.check className="check"/> 已完成</button>
      </div>

      {tab === 'issues' && (
        <div className="issue-list">
          {analysisStatus === 'idle' && (
            <div className="analysis-idle">
              {hasPdf
                ? <button className="analyze-btn" onClick={onAnalyze}>🔍 分析合同</button>
                : <div className="analysis-hint">请通过左侧 + 按钮添加 PDF 合同</div>}
            </div>
          )}
          {analysisStatus === 'analyzing' && <AnalyzingPlaceholder/>}
          {analysisStatus === 'error' && (
            <div className="analysis-error">
              <div>{analysisError}</div>
              <button className="mini-btn" onClick={onAnalyze}>重试</button>
            </div>
          )}
          {analysisStatus === 'done' && issues.map(it => (
            <IssueCard key={it.id} it={it} isActive={activeIssue === it.id} onJump={onJumpToIssue}/>
          ))}
        </div>
      )}

      {tab === 'convo' && (
        <>
          <div className="msgs" ref={msgsRef}>
            {messages.length === 0 && (
              <div className="convo-hint">在下方输入框向 AI 询问合同相关问题</div>
            )}
            {messages.map(m => <Msg key={m.id} m={m}/>)}
            {typing && (
              <div className="msg">
                <div className="av">AI</div>
                <div className="bubble">
                  <div className="typing"><span/><span/><span/></div>
                </div>
              </div>
            )}
          </div>
          <div className="composer">
            <div className="row">
              <textarea
                placeholder="有疑问？在此追问…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
              />
              <div className="bar">
                <button className={`send ${!draft.trim() || typing ? 'disabled' : ''}`} onClick={send}>
                  <Ic.send/>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Msg({ m }) {
  const isUser = m.role === 'user';
  return (
    <div className={`msg ${isUser ? 'user' : ''}`}>
      <div className="av">{isUser ? '我' : 'AI'}</div>
      <div className="bubble">
        {m.content.map((c, i) => (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{c.t ?? c.label ?? ''}</span>
        ))}
      </div>
    </div>
  );
}
