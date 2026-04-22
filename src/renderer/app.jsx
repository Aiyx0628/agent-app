// Root app
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Chat } from './chat';
import { FILE_TREE } from './data';
import { FileTree } from './filetree';
import { Preview } from './preview';
import { Titlebar } from './titlebar';
import { applyTweaks, Tweaks } from './tweaks';

const DEFAULT_TWEAKS = {
  density: 'comfortable',
  accent: 'blue',
  showSeverityStripes: true,
  chatAvatar: true,
  animateJump: true,
};

function findFile(id, nodes = FILE_TREE) {
  for (const n of nodes) {
    if (n.id === id && n.type === 'file') return n;
    if (n.children) {
      const r = findFile(id, n.children);
      if (r) return r;
    }
  }
  return null;
}

function App() {
  const [activeId, setActiveId] = React.useState('doc-contract-main');
  const [activeIssue, setActiveIssue] = React.useState(null);
  const [leftW, setLeftW] = React.useState(260);
  const [rightW, setRightW] = React.useState(410);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [tweaks, setTweaks] = React.useState(window.__TWEAKS__ || DEFAULT_TWEAKS);

  const scrollRef = React.useRef(null);

  // Apply tweaks
  React.useEffect(() => { applyTweaks(tweaks); }, [tweaks]);

  // Edit-mode wiring
  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const file = findFile(activeId) || {
    id: activeId, type: 'file', kind: 'pdf', name: 'Unknown', pages: 1,
  };

  // Reset active issue when switching files
  React.useEffect(() => { setActiveIssue(null); }, [activeId]);

  const onJumpToIssue = (it) => {
    setActiveIssue(it.id);
    // If the issue is in a different file, switch first
    if (it.loc.docId && it.loc.docId !== activeId) {
      setActiveId(it.loc.docId);
      setTimeout(() => {
        scrollRef.current?.scrollToAnchor(it.loc.anchor);
      }, 150);
    } else {
      scrollRef.current?.scrollToAnchor(it.loc.anchor);
    }
  };

  // resizers
  const dragRef = React.useRef(null);
  const onDragStart = (side) => (e) => {
    e.preventDefault();
    dragRef.current = { side, startX: e.clientX, startLeft: leftW, startRight: rightW };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (me) => {
      const d = dragRef.current; if (!d) return;
      const dx = me.clientX - d.startX;
      if (d.side === 'left') setLeftW(Math.max(180, Math.min(420, d.startLeft + dx)));
      else setRightW(Math.max(300, Math.min(560, d.startRight - dx)));
    };
    const up = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  return (
    <>
      <Titlebar/>
      <div className="main" style={{ '--left-w': leftW + 'px', '--right-w': rightW + 'px' }}>
        <div style={{ position: 'relative', minWidth: 0, minHeight: 0, display: 'flex' }}>
          <FileTree activeId={activeId} onSelect={setActiveId}/>
          <div className="resizer r-left" onMouseDown={onDragStart('left')}/>
        </div>

        <Preview file={file} scrollToRef={scrollRef}/>

        <div style={{ position: 'relative', minWidth: 0, minHeight: 0, display: 'flex' }}>
          <div className="resizer r-right" onMouseDown={onDragStart('right')}/>
          <Chat activeIssue={activeIssue} onJumpToIssue={onJumpToIssue}/>
        </div>
      </div>

      <Tweaks open={tweaksOpen} onClose={() => setTweaksOpen(false)}
        state={tweaks} setState={setTweaks}/>
    </>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App/>);
