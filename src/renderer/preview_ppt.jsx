import * as React from 'react';

export function PptPreview({ file }) {
  return (
    <div className="preview-unsupported">
      <div>PPT 预览暂未实现</div>
      <div className="unsupported-sub">{file.name}</div>
    </div>
  );
}
