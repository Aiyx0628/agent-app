import * as React from 'react';
import { Ic } from './icons';

export function Titlebar({ onReview, onExport }) {
  return (
    <div className="titlebar">
      <div className="traffic">
        <span className="dot"/><span className="dot"/><span className="dot"/>
      </div>
      <button className="back" title="返回"><Ic.back/></button>
      <div className="crumbs">
        <span>合同审核</span>
        <span className="sep">/</span>
        <span className="doc">福朗电子 · 定制软件开发合同</span>
      </div>
      <div className="spacer"/>
      <div className="actions">
        <button className="tb-btn"><Ic.eye/> 视角 · 中文</button>
        <button className="tb-btn primary" onClick={onReview}><Ic.refresh/> 重新审阅</button>
        <button className="tb-btn ghost-outline" onClick={onExport}><Ic.download/> 导出</button>
      </div>
    </div>
  );
}
