import * as React from 'react';

export function WordPreview({ file }) {
  return (
    <div className="preview-unsupported">
      <div>Word 预览暂未实现</div>
      <div className="unsupported-sub">{file.name}</div>
    </div>
  );
}
