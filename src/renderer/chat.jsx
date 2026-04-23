import * as React from 'react';
import { CONTRACT_ISSUES, INITIAL_CHAT } from './data';
import { Ic } from './icons';

export function Chat({ activeIssue, onJumpToIssue, issues: propIssues }) {
  const [tab, setTab] = React.useState('issues');
  const issues = propIssues ?? CONTRACT_ISSUES;
  const issueCount = issues.length;
  const [messages, setMessages] = React.useState(INITIAL_CHAT);
  const [draft, setDraft] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const msgsRef = React.useRef(null);

  React.useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages, typing, tab]);

  const send = () => {
    if (!draft.trim()) return;
    const userMsg = { id: 'u-' + Date.now(), role: 'user', content: [{ t: draft }] };
    setMessages(m => [...m, userMsg]);
    setDraft('');
    setTyping(true);
    setTimeout(() => {
      const reply = {
        id: 'a-' + Date.now(),
        role: 'assistant',
        content: [
          { t: '好的，我将针对 ' },
          { cite: 'i-3', label: '签订日期' },
          { t: ' 与 ' },
          { cite: 'i-4', label: '付款尾差' },
          { t: ' 两项为您展开解读。点击引用可直接跳转到原文位置。' },
        ],
      };
      setMessages(m => [...m, reply]);
      setTyping(false);
    }, 1100);
  };

  const severityLabel = (s) => ({ high: '高', med: '中', low: '低' }[s] || s);

  return (
    <div className="pane right">
      <div className="rp-header">
        <span className="dot"/>
        <span className="title">AI 合同助手</span>
        <div style={{ flex: 1 }}/>
        <span className="stat">发现 {issueCount} 项问题</span>
      </div>
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
                <button className={`send ${!draft.trim() ? 'disabled' : ''}`} onClick={send}>
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
          return <span key={i}>{c.t}</span>;
        })}
      </div>
    </div>
  );
}

function hl(text) {
  // highlight <mark>...</mark> markers where we want emphasis
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
