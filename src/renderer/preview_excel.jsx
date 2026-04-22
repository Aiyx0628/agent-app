import * as React from 'react';

export function ExcelPreview() {
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
