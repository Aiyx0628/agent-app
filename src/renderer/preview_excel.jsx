import * as React from 'react';

export function ExcelPreview({ file }) {
  return (
    <div className="preview-unsupported">
      <div>Excel 预览暂未实现</div>
      <div className="unsupported-sub">{file.name}</div>
    </div>
  );
}
