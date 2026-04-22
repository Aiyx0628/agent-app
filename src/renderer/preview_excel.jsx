import * as React from 'react';
import { Ic } from './icons';

function ExcelDemoContent() {
  const cols = ['序号', '项目', '规格', '数量', '单价(元)', '小计(元)'];
  const rows = [
    ['01', '需求分析与方案设计',   '人天',    '25',  '2,400',  '60,000'],
    ['02', '原型与交互设计',       '人天',    '12',  '2,200',  '26,400'],
    ['03', '前端开发（Electron）', '人天',    '48',  '2,600',  '124,800'],
    ['04', '后端开发（Java）',     '人天',    '55',  '2,800',  '154,000'],
    ['05', '数据库建模与迁移',     '人天',    '10',  '2,800',  '28,000'],
    ['06', '工作流引擎适配',       '模块',    '1',   '60,000', '60,000'],
    ['07', '电子签章集成',         '模块',    '1',   '45,000', '45,000'],
    ['08', '国密加密模块',         '模块',    '1',   '38,000', '38,000'],
    ['09', '测试（单元+集成）',    '人天',    '22',  '2,200',  '48,400'],
    ['10', 'UAT 支持与培训',       '人天',    '6',   '2,400',  '14,400'],
    ['11', '部署与上线',           '次',      '1',   '30,000', '30,000'],
    ['12', '集成服务',             '项',      '1',   '60,000', '60,001', 'flag'],
    ['13', '项目管理',             '人天',    '30',  '2,000',  '60,000'],
    ['14', '售后维护（12 个月）',  '年',      '1',   '41,000', '41,000'],
  ];

  return (
    <div className="excel-shell">
      <div className="excel-tabbar">
        <div className="excel-tab active">报价明细</div>
        <div className="excel-tab">人员成本</div>
        <div className="excel-tab">付款计划</div>
        <div className="excel-tab">汇总</div>
      </div>
      <div className="excel-grid" style={{ '--cols': cols.length }}>
        <div className="corner"/>
        {cols.map((_, i) => <div key={i} className="col-h">{String.fromCharCode(65 + i)}</div>)}

        <div className="row-h">1</div>
        {cols.map((c, i) => <div key={i} className="cell header">{c}</div>)}

        {rows.map((r, idx) => (
          <React.Fragment key={idx}>
            <div className="row-h">{idx + 2}</div>
            {r.slice(0, 6).map((v, i) => (
              <div key={i}
                className={`cell ${i >= 3 ? 'num' : ''} ${r[6] === 'flag' && i === 5 ? 'flag' : ''}`}>
                {v}
              </div>
            ))}
          </React.Fragment>
        ))}

        <div className="row-h">{rows.length + 2}</div>
        <div className="cell total"/>
        <div className="cell total">合计</div>
        <div className="cell total"/>
        <div className="cell total"/>
        <div className="cell total"/>
        <div className="cell total num">790,001</div>
      </div>
    </div>
  );
}

function ExcelSkeletonContent() {
  const colWidths = [180, 100, 100, 120, 100, 100];
  const rows = Array.from({ length: 8 });
  return (
    <div className="excel-shell">
      <div className="excel-tabbar">
        <div className="excel-tab active">Sheet1</div>
      </div>
      <div className="excel-grid" style={{ '--cols': colWidths.length }}>
        <div className="corner"/>
        {colWidths.map((_, i) => (
          <div key={i} className="col-h">
            <div className="skeleton" style={{ height: 11, borderRadius: 3, width: '60%' }}/>
          </div>
        ))}
        <div className="row-h">1</div>
        {colWidths.map((_, i) => (
          <div key={i} className="cell header">
            <div className="skeleton" style={{ height: 11, borderRadius: 3, width: (40 + i * 8) + '%' }}/>
          </div>
        ))}
        {rows.map((_, r) => (
          <React.Fragment key={r}>
            <div className="row-h">{r + 2}</div>
            {colWidths.map((_, c) => (
              <div key={c} className="cell">
                <div className="skeleton" style={{ height: 11, borderRadius: 3, width: (50 + (r * c * 7) % 40) + '%' }}/>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export function ExcelPreview({ file, onMetaChange }) {
  const [status, setStatus] = React.useState('idle');
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (file.source === 'demo') return;
    setStatus('loading');
    window.api.file.read(file.path)
      .then(({ size, mtime }) => { onMetaChange?.({ size, mtime }); setStatus('loaded'); })
      .catch(err => { setStatus('error'); setError(err.message); });
  }, [file.id]);

  if (file.source === 'demo') return <ExcelDemoContent/>;

  if (status === 'idle' || status === 'loading') return <ExcelSkeletonContent/>;

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
      <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>文件已加载 · Excel 渲染器待接入</div>
    </div>
  );
}
