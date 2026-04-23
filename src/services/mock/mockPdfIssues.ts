import type { DocumentAnalysisResult, IssueItem } from '../../renderer/types';

// 预设 mock 问题（坐标为 A4 纸 595×842 点常见文本区域估算，仅作演示）
const MOCK_ISSUES_TEMPLATE: Array<Omit<IssueItem, 'loc'> & { pageIndex: number; rects: Array<{ x: number; y: number; width: number; height: number }> }> = [
  {
    id: 'mock-i-1',
    severity: 'high',
    category: '条款缺失',
    quote: '第一条……定义部分存在表述歧义',
    body: '合同核心术语定义不明确，可能导致执行争议。',
    recommendation: '建议增加"定制软件"知识产权归属条款，明确著作权归属方。',
    pageIndex: 0,
    rects: [{ x: 72, y: 720, width: 300, height: 16 }],
  },
  {
    id: 'mock-i-2',
    severity: 'med',
    category: '金额风险',
    quote: '合同金额……分三期支付',
    body: '支付节点与验收标准未强绑定，存在提前付款风险。',
    recommendation: '建议将第二、三期付款与书面验收报告签署挂钩。',
    pageIndex: 0,
    rects: [{ x: 72, y: 680, width: 200, height: 14 }],
  },
  {
    id: 'mock-i-3',
    severity: 'low',
    category: '格式问题',
    quote: '签订时间：年　月　日',
    body: '签订日期为空白，合同生效时间不明。',
    recommendation: '签署前应填写具体日期，避免产生法律效力争议。',
    pageIndex: 0,
    rects: [{ x: 72, y: 640, width: 180, height: 14 }],
  },
];

export function analyzePdf(docId: string): DocumentAnalysisResult {
  const issues: IssueItem[] = MOCK_ISSUES_TEMPLATE.map(({ pageIndex, rects, ...base }) => ({
    ...base,
    loc: { docId, pageIndex, rects },
  }));
  return { docId, issues };
}
