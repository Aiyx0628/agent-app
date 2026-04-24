import * as React from 'react';
import { FileKindIcon, Ic } from './icons';

function TreeNode({ node, depth, expanded, onToggle, activeId, onSelect }) {
  const isFolder = node.type === 'folder';
  const isOpen = expanded[node.id] ?? node.id.startsWith('local-');
  const isActive = activeId === node.id;

  return (
    <div>
      <div
        className={`tree-node ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: 6 + depth * 12 }}
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node.id)}
      >
        <span className={`chev ${isFolder ? '' : 'hidden'} ${isOpen ? 'open' : ''}`}>
          <Ic.chev/>
        </span>
        <span className="ft-icon">
          {isFolder
            ? (isOpen ? <Ic.folderOpen/> : <Ic.folder/>)
            : <FileKindIcon kind={node.kind}/>}
        </span>
        {node.starred && <span className="tn-star"><Ic.star/></span>}
        <span className="tn-name">{node.name}</span>
        {node.issues > 0 && !isFolder && (
          <span className="tn-badge">{node.issues}</span>
        )}
      </div>
      {isFolder && isOpen && node.children && (
        <div className="tree-children">
          {node.children.map(c => (
            <TreeNode key={c.id} node={c} depth={depth + 1}
              expanded={expanded} onToggle={onToggle}
              activeId={activeId} onSelect={onSelect}/>
          ))}
        </div>
      )}
    </div>
  );
}

function walk(nodes, out = []) {
  for (const n of nodes) {
    out.push(n);
    if (n.children) walk(n.children, out);
  }
  return out;
}

function countFiles(nodes) {
  return walk(nodes).filter(n => n.type === 'file').length;
}

export function FileTree({ activeId, onSelect, tree, onAddFile }) {
  const [expanded, setExpanded] = React.useState({
    'root': true,
    'folder-contracts': true,
    'folder-financial': false,
    'folder-spec': false,
    'folder-archive': false,
  });
  const [query, setQuery] = React.useState('');

  const toggle = (id) => setExpanded(s => ({ ...s, [id]: !s[id] }));

  const filterTree = (nodes) => {
    if (!query.trim()) return nodes;
    const q = query.toLowerCase();
    return nodes.map(n => {
      if (n.type === 'file') {
        return n.name.toLowerCase().includes(q) ? n : null;
      }
      const filtered = filterTree(n.children || []).filter(Boolean);
      if (filtered.length || n.name.toLowerCase().includes(q)) {
        return { ...n, children: filtered };
      }
      return null;
    }).filter(Boolean);
  };

  const effectiveExpanded = query.trim()
    ? Object.fromEntries(walk(tree).map(n => [n.id, true]))
    : expanded;

  const trees = filterTree(tree);
  const totalFiles = countFiles(tree);

  return (
    <div className="pane left">
      <div className="lp-header">
        <span className="title">文件</span>
        <span className="count">[{totalFiles}]</span>
        <div className="spacer"/>
        <button className="icon-btn" title="打开文件" onClick={onAddFile}><Ic.plus/></button>
      </div>
      <div className="lp-search">
        <div className="field">
          <Ic.search/>
          <input placeholder="搜索文件 / 文件夹" value={query} onChange={e=>setQuery(e.target.value)}/>
          {query && <button className="icon-btn" onClick={()=>setQuery('')}><Ic.close/></button>}
        </div>
      </div>
      <div className="lp-tree">
        {trees.length === 0 && (
          <div style={{ padding: '20px 12px', color: 'var(--ink-4)', fontSize: 12 }}>
            没有匹配的文件
          </div>
        )}
        {trees.map(n => (
          <TreeNode key={n.id} node={n} depth={0}
            expanded={effectiveExpanded} onToggle={toggle}
            activeId={activeId} onSelect={onSelect}/>
        ))}
      </div>
    </div>
  );
}
