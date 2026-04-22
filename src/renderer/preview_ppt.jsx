import * as React from 'react';
import { Ic } from './icons';

export const PPT_SLIDES = [
  { type: 'title', eyebrow: 'KICKOFF · 2026 Q2', title: ['定制软件开发', '项目启动会'], sub: '福朗电子 × 中软国际 · 第一次月度同步', meta: ['v2.0 · 2026-04-18'] },
  { type: 'content', h: '项目里程碑', k: 'MILESTONE · 5 PHASES · 12 WEEKS', bullets: [
    ['Week 1–2', '需求澄清 · 接口盘点 · 数据字典'],
    ['Week 3–5', '交互设计 · 技术方案评审 · 原型验收'],
    ['Week 6–9', '前后端并行开发 · 工作流引擎集成'],
    ['Week 10', '系统集成测试 · UAT 入场'],
    ['Week 11', '预上线 · 培训 · 数据迁移演练'],
    ['Week 12', '正式上线 · 一个月稳定期验收'],
  ]},
  { type: 'content', h: '技术栈选型', k: 'TECH STACK · ELECTRON DESKTOP', bullets: [
    ['Shell', 'Electron 28 · Node 20 LTS'],
    ['前端', 'React 18 · TypeScript 5 · Vite'],
    ['后端', 'Java 17 · Spring Boot 3.2'],
    ['数据库', 'PostgreSQL 15 · Redis 7'],
    ['工作流', 'Flowable 7 · BPMN 2.0'],
    ['签章', '国密 SM2/SM3 · 法大大对接'],
  ]},
  { type: 'content', h: '团队与分工', k: 'TEAM · 11 PEOPLE', bullets: [
    ['PM', '王力宏 · 统筹 / 对接'],
    ['架构', '李工 · 方案 / 评审'],
    ['前端', '张、陈、刘 · 3 人'],
    ['后端', '周、吴、郑、孙 · 4 人'],
    ['QA', '赵工 · 测试'],
    ['UI', '林设计师'],
  ]},
  { type: 'content', h: '风险与应对', k: 'RISK · MITIGATION', bullets: [
    ['需求变更', '基线冻结 · 变更评审'],
    ['技术风险', '技术预研 · 备选方案'],
    ['集成延期', '接口优先 · 联调提前'],
    ['资源缺口', '储备 2 人 · 外协预案'],
    ['合规要求', '等保三级 · 国密适配'],
    ['上线风险', '灰度 · 回滚 SOP'],
  ]},
  { type: 'title', eyebrow: 'DEMO · Q&A', title: ['谢谢聆听', '欢迎提问'], sub: '项目交付承诺 · 12 周', meta: ['End'] },
];

function SlideBody({ slide, idx, total }) {
  const s = slide;
  if (s.type === 'title') {
    return (
      <div className="ppt-slide title-slide">
        <div className="eyebrow">{s.eyebrow}</div>
        <h1>{s.title.map((t, i) => <React.Fragment key={i}>{t}{i < s.title.length - 1 && <br/>}</React.Fragment>)}</h1>
        <div className="sub">{s.sub}</div>
        <div className="meta">
          <span>{s.meta[0]}</span>
          <span>{String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="ppt-slide content">
      <h2>{s.h}</h2>
      <div className="sub">{s.k}</div>
      <div className="bullets">
        {s.bullets.map(([k, v], i) => (
          <div className="bullet" key={i}><span className="k">{k}</span>{v}</div>
        ))}
      </div>
      <div className="slide-num">{String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</div>
    </div>
  );
}

const SLIDE_W = 820;
const SLIDE_H = Math.round(SLIDE_W * 9 / 16);

function PptDemoContent({ slideIdx, setSlideIdx }) {
  const total = PPT_SLIDES.length;
  const [dir, setDir] = React.useState(1);
  const [hoverZone, setHoverZone] = React.useState(false);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef(null);
  const stripRef = React.useRef(null);
  const thumbRefs = React.useRef([]);
  const hoverTimer = React.useRef(null);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 24;
      setScale(Math.min(1, w / SLIDE_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = React.useCallback((next) => {
    setSlideIdx(i => {
      const n = typeof next === 'function' ? next(i) : next;
      const clamped = Math.max(0, Math.min(total - 1, n));
      setDir(clamped >= i ? 1 : -1);
      return clamped;
    });
  }, [setSlideIdx, total]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === 'ArrowLeft')  { goTo(i => i - 1); }
      if (e.key === 'ArrowRight') { goTo(i => i + 1); }
      if (e.key === ' ')          { e.preventDefault(); goTo(i => i + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo]);

  React.useEffect(() => {
    if (!hoverZone) return;
    const el = thumbRefs.current[slideIdx];
    const strip = stripRef.current;
    if (!el || !strip) return;
    strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [slideIdx, hoverZone]);

  const onWheel = (e) => {
    const strip = stripRef.current; if (!strip) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      strip.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  const showZone = () => { clearTimeout(hoverTimer.current); setHoverZone(true); };
  const hideZone = () => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setHoverZone(false), 500); };

  return (
    <div className="ppt-wrap">
      <button className="ppt-nav prev" onClick={() => goTo(i => i - 1)} disabled={slideIdx === 0}>
        <Ic.chev style={{ transform: 'rotate(180deg)' }}/>
      </button>
      <button className="ppt-nav next" onClick={() => goTo(i => i + 1)} disabled={slideIdx === total - 1}>
        <Ic.chev/>
      </button>

      <div className="ppt-stage" ref={stageRef}>
        <div className="ppt-slide-scaler" style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}>
          <div className="ppt-slide-anim" key={slideIdx} data-dir={dir}
            style={{ transform: `scale(${scale})`, width: SLIDE_W, height: SLIDE_H }}>
            <SlideBody slide={PPT_SLIDES[slideIdx]} idx={slideIdx} total={total}/>
          </div>
        </div>

        <div className="ppt-thumb-zone" onMouseEnter={showZone} onMouseLeave={hideZone}>
          <div className={`ppt-page-chip ${hoverZone ? 'hide' : ''}`}>
            {String(slideIdx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
          <div className={`ppt-strip-shell ${hoverZone ? 'show' : ''}`} onMouseEnter={showZone} onMouseLeave={hideZone}>
            <button className="strip-arr l" onClick={() => stripRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}>
              <Ic.chev style={{ transform: 'rotate(180deg)' }}/>
            </button>
            <div className="ppt-strip" ref={stripRef} onWheel={onWheel}>
              {PPT_SLIDES.map((sl, i) => (
                <button key={i} ref={el => thumbRefs.current[i] = el}
                  className={`ppt-thumb-mini ${i === slideIdx ? 'on' : ''}`}
                  onClick={() => goTo(i)}>
                  <div className="ppt-thumb-scale">
                    <SlideBody slide={sl} idx={i} total={total}/>
                  </div>
                  <span className="thumb-label">{String(i + 1).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
            <button className="strip-arr r" onClick={() => stripRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}>
              <Ic.chev/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PptSkeletonContent() {
  return (
    <div className="ppt-wrap">
      <button className="ppt-nav prev" disabled><Ic.chev style={{ transform: 'rotate(180deg)' }}/></button>
      <button className="ppt-nav next" disabled><Ic.chev/></button>
      <div className="ppt-stage">
        <div style={{ width: '100%', padding: '12px 12px 0' }}>
          <div className="ppt-slide-skeleton">
            <div className="skeleton sk-eyebrow"/>
            <div className="skeleton sk-slide-h"/>
            <div className="skeleton sk-slide-sub"/>
            <div className="sk-bullets">
              {[0, 1, 2, 3].map(i => <div key={i} className="skeleton sk-bullet"/>)}
            </div>
          </div>
        </div>
        <div className="ppt-thumb-zone">
          <div className="ppt-page-chip">-- / --</div>
        </div>
      </div>
    </div>
  );
}

export function PptPreview({ file, slideIdx, setSlideIdx, onMetaChange }) {
  const [status, setStatus] = React.useState('idle');
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (file.source === 'demo') return;
    setStatus('loading');
    window.api.file.read(file.path)
      .then(({ size, mtime }) => { onMetaChange?.({ size, mtime }); setStatus('loaded'); })
      .catch(err => { setStatus('error'); setError(err.message); });
  }, [file.id]);

  if (file.source === 'demo') return <PptDemoContent slideIdx={slideIdx} setSlideIdx={setSlideIdx}/>;

  if (status === 'idle' || status === 'loading') return <PptSkeletonContent/>;

  if (status === 'error') {
    return (
      <div className="preview-error">
        <div className="err-icon"><Ic.alert/></div>
        <div>无法加载文件</div>
        <div className="err-msg">{error}</div>
        <button className="retry-btn" onClick={() => setStatus('idle')}>重试</button>
      </div>
    );
  }

  return (
    <div className="preview-error">
      <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>文件已加载 · PPT 渲染器待接入</div>
    </div>
  );
}
