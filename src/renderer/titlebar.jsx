import * as React from "react";
import { Ic } from "./icons";

export function Titlebar({ documentName, onReview, onExport }) {
  const title = documentName || "合同审核";

  return (
    <div className="titlebar">
      <div className="mac-window-spacer" aria-hidden="true" />
      <div className="titlebar-title" title={title}>
        {title}
      </div>
      <div className="spacer" />
      <div className="actions">
        <button className="tb-btn primary" onClick={onReview}>
          <Ic.refresh /> 重新审阅
        </button>
        <button className="tb-btn ghost-outline" onClick={onExport}>
          <Ic.download /> 导出
        </button>
      </div>
    </div>
  );
}
