import * as React from 'react';
import { Ic } from './icons';

export function Tweaks({ open, onClose, state, setState }) {
  if (!open) return null;
  const set = (k, v) => {
    const next = { ...state, [k]: v };
    setState(next);
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  return (
    <div className="tweaks-panel">
      <div className="th">
        <Ic.sliders/>
        <span className="title">Tweaks</span>
        <div style={{ flex: 1 }}/>
        <button className="icon-btn" onClick={onClose}><Ic.close/></button>
      </div>
      <div className="body">
        <div className="grp">
          <div className="lbl">Density</div>
          <div className="seg">
            {['compact', 'comfortable', 'spacious'].map(v => (
              <button key={v} className={state.density === v ? 'on' : ''} onClick={() => set('density', v)}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grp">
          <div className="lbl">Accent</div>
          <div className="swatches">
            {[
              { id: 'blue',   c: 'oklch(0.58 0.14 255)' },
              { id: 'teal',   c: 'oklch(0.58 0.13 200)' },
              { id: 'violet', c: 'oklch(0.58 0.15 295)' },
              { id: 'slate',  c: 'oklch(0.42 0.02 260)' },
              { id: 'rust',   c: 'oklch(0.58 0.14 45)'  },
            ].map(s => (
              <div key={s.id}
                className={`sw-chip ${state.accent === s.id ? 'on' : ''}`}
                style={{ background: s.c }}
                onClick={() => set('accent', s.id)}
                title={s.id}/>
            ))}
          </div>
        </div>

        <div className="grp">
          <div className={`toggle ${state.showSeverityStripes ? 'on' : ''}`}
            onClick={() => set('showSeverityStripes', !state.showSeverityStripes)}>
            <span className="lbl2">显示问题严重度色条</span>
            <span className="sw"/>
          </div>
        </div>

        <div className="grp">
          <div className={`toggle ${state.animateJump ? 'on' : ''}`}
            onClick={() => set('animateJump', !state.animateJump)}>
            <span className="lbl2">引用跳转高亮动画</span>
            <span className="sw"/>
          </div>
        </div>

        <div className="grp">
          <div className={`toggle ${state.chatAvatar ? 'on' : ''}`}
            onClick={() => set('chatAvatar', !state.chatAvatar)}>
            <span className="lbl2">对话显示头像</span>
            <span className="sw"/>
          </div>
        </div>
      </div>
    </div>
  );
}

// Apply tweaks to DOM
export function applyTweaks(state) {
  document.body.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
  document.body.classList.add('density-' + state.density);

  const accents = {
    blue:   { a: 'oklch(0.58 0.14 255)', ai: 'oklch(0.38 0.13 255)', soft: 'oklch(0.95 0.03 255)', softer: 'oklch(0.97 0.02 255)' },
    teal:   { a: 'oklch(0.58 0.13 200)', ai: 'oklch(0.38 0.12 200)', soft: 'oklch(0.95 0.03 200)', softer: 'oklch(0.97 0.02 200)' },
    violet: { a: 'oklch(0.58 0.15 295)', ai: 'oklch(0.38 0.13 295)', soft: 'oklch(0.95 0.03 295)', softer: 'oklch(0.97 0.02 295)' },
    slate:  { a: 'oklch(0.42 0.02 260)', ai: 'oklch(0.28 0.02 260)', soft: 'oklch(0.93 0.005 260)', softer: 'oklch(0.96 0.004 260)' },
    rust:   { a: 'oklch(0.58 0.14 45)',  ai: 'oklch(0.38 0.13 45)',  soft: 'oklch(0.95 0.03 45)',  softer: 'oklch(0.97 0.02 45)' },
  };
  const a = accents[state.accent] || accents.blue;
  const r = document.documentElement.style;
  r.setProperty('--accent', a.a);
  r.setProperty('--accent-ink', a.ai);
  r.setProperty('--accent-soft', a.soft);
  r.setProperty('--accent-softer', a.softer);

  document.body.classList.toggle('no-severity-stripes', !state.showSeverityStripes);
  document.body.classList.toggle('no-chat-avatar', !state.chatAvatar);
  document.body.classList.toggle('no-jump-anim', !state.animateJump);
}
