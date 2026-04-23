import * as React from 'react';
import { CONTRACT_ISSUES, INITIAL_CHAT } from './data';
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
        <input
          type="text"
          value={cfg.baseUrl}
          placeholder="https://api.openai.com/v1"
          onChange={e => setCfg(c => ({ ...c, baseUrl: e.target.value }))}
        />
      </label>
      <label>
        <span>API Key</span>
        <input
          type="password"
          value={cfg.apiKey}
          placeholder="sk-..."
          onChange={e => setCfg(c => ({ ...c, apiKey: e.target.value }))}
        />
      </label>
      <label>
        <span>Model</span>
        <input
          type="text"
          value={cfg.model}
          placeholder="gpt-4o"
          onChange={e => setCfg(c => ({ ...c, model: e.target.value }))}
        />
      </label>
      <button className="ai-settings-save" onClick={save}>
        {saved ? '已保存 ✓' : '保存'}
      </button>
    </div>
  );
}

// ── Chat component ────────────────────────────────────────────────────────────

export function Chat({ activeIssue, onJumpToIssue, issues: propIssues }) {
  const [tab, setTab] = React.useState('issues');
  const issues = propIssues ?? CONTRACT_ISSUES;
  const issueCount = issues.length;
  const [messages, setMessages] = React.useState(INITIAL_CHAT);
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const msgsRef = React.useRef(null);
  const cancelRef = React.useRef(null);

  React.useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, typing, tab]);

  // Cancel in-flight request when unmounting
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
      (chunk) => {
        textAccum.v += chunk;
        const snap = textAccum.v;
        setMessages(m => m.map(msg =>
          msg.id === aId ? { ...msg, content: [{ t: snap }] } : msg
        ));
      },
      () => {
        setTyping(false);
        cancelRef.current = null;
      },
      (err) => {
        setMessages(m => m.map(msg =>
          msg.id === aId ? { ...msg, content: [{ t: '⚠ ' + err }] } : msg
        ));
        setTyping(false);
        cancelRef.current = null;
      },
    );

    // Fallback: if api not available (no main process), show placeholder
    if (!window.api?.ai) {
      setTimeout(() => {
        setMessages(m => m.map(msg =>
          msg.id === aId ? { ...msg, content: [{ t: '（未配置 AI 服务，请在设置中填写 API Key）' }] } : msg
        ));
        setTyping(false);
      }, 600);
    }
  };

  const severityLabel = (s) => ({ high: '高', med: '中', low: '低' }[s] || s);

  return (
    <div className="pane right">
      <div className="rp-header">
        <span className="dot"/>
        <span className="title">AI 合同助手</span>
        <div style={{ flex: 1 }}/>
        <span className="stat">发现 {issueCount} 项问题</span>
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
          <Ic.list/> 问题清单 <span className="n">{issueCount}</span>
        </button>
        <div className="spacer"/>
        <button className="tab-tool"><Ic.check className="check"/> 已完成</button>
      </div>

      {tab === 'issues' && (
        <div className="issue-list">
          {issues.map((it) => {
            const sevCls = it.severity === 'high' ? '' : it.severity === 'med' ? 'sev-med' : 'sev-low';
            const chipCls = it.severity === 'high' ? '' : it.severity === 'med' ? 'med' : 'low';
            const isActive = activeIssue === it.id;
            return (
              <div key={it.id}
                className={`issue-card ${sevCls} ${isActive ? 'active' : ''}`}
                onClick={() => onJumpToIssue(it)}>
                <div className="issue-head">
                  <Ic.alert color={
                    it.severity === 'high' ? 'var(--sev-high)' :
                    it.severity === 'med' ? 'oklch(0.6 0.12 60)' : 'var(--sev-low)'
                  }/>
                  <span className={`sev-chip ${chipCls}`}>{severityLabel(it.severity)}</span>
                  <span className="cat-chip">{it.category}</span>
                  <button className="loc-chip-btn" onClick={(e) => { e.stopPropagation(); onJumpToIssue(it); }}>
                    <Ic.mapPin/> 定位
                  </button>
                </div>

                <div className="issue-section">
                  <div className="sec-label"><span className="sec-dot s-quote"/>原文</div>
                  <div className="sec-body quote" dangerouslySetInnerHTML={{ __html: hl(it.quote) }}/>
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
                  <button className="mini-btn primary" onClick={(e) => { e.stopPropagation(); onJumpToIssue(it); }}>
                    采纳建议
                  </button>
                  <button className="mini-btn" onClick={(e) => e.stopPropagation()}>
                    忽略
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'convo' && (
        <>
          <div className="msgs" ref={msgsRef}>
            {messages.map(m => <Msg key={m.id} m={m} onCite={(cid) => {
              const it = issues.find(x => x.id === cid);
              if (it) onJumpToIssue(it);
            }}/>)}
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
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={1}
              />
              <div className="bar">
                <span className="tag"><Ic.paperclip/> 双方合同《福朗电子》.pdf</span>
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

function Msg({ m, onCite }) {
  const isUser = m.role === 'user';
  return (
    <div className={`msg ${isUser ? 'user' : ''}`}>
      <div className="av">{isUser ? '我' : 'AI'}</div>
      <div className="bubble">
        {m.content.map((c, i) => {
          if (c.cite) {
            return (
              <span key={i} className="cite" onClick={() => onCite(c.cite)}>
                <Ic.mapPin/> {c.label}
              </span>
            );
          }
          return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{c.t}</span>;
        })}
      </div>
    </div>
  );
}

function hl(text) {
  return text
    .replace(/知识产权/g, '<mark>知识产权</mark>')
    .replace(/1 个月/g, '<mark>1 个月</mark>')
    .replace(/15 天内/g, '<mark>15 天内</mark>')
    .replace(/年\s+月\s+日/g, '<mark>年 月 日</mark>')
    .replace(/签订时间：/g, '签订时间：<mark>年月日</mark>　')
    .replace(/¥790,000\.00/g, '<mark>¥790,000.00</mark>')
    .replace(/任何争议/g, '<mark>任何争议</mark>')
    .replace(/违约责任|违约金/g, '<mark>$&</mark>')
    .replace(/测试报告/g, '<mark>测试报告</mark>')
    .replace(/不可抗力/g, '<mark>不可抗力</mark>')
    .replace(/解除本合同/g, '<mark>解除本合同</mark>');
}
