// Shared data for the prototype. Exported to window for cross-file access.

export const FILE_TREE = [
  {
    id: 'root',
    type: 'folder',
    name: '项目合同',
    children: [
      {
        id: 'folder-contracts',
        type: 'folder',
        name: '01 合同',
        children: [
          { id: 'doc-contract-main', type: 'file', kind: 'pdf', name: '双方合同《福朗电子》.pdf', starred: true, issues: 9, pages: 15 },
          { id: 'doc-nda', type: 'file', kind: 'pdf', name: '保密协议 NDA v3.pdf', issues: 2, pages: 4 },
          { id: 'doc-addendum', type: 'file', kind: 'word', name: '补充协议.docx', issues: 1, pages: 3 },
        ],
      },
      {
        id: 'folder-financial',
        type: 'folder',
        name: '02 财务与报价',
        children: [
          { id: 'doc-quote', type: 'file', kind: 'excel', name: '报价清单 Q2.xlsx', issues: 3 },
          { id: 'doc-budget', type: 'file', kind: 'excel', name: '预算拆分.xlsx' },
        ],
      },
      {
        id: 'folder-spec',
        type: 'folder',
        name: '03 需求与设计',
        children: [
          { id: 'doc-srs', type: 'file', kind: 'word', name: '需求规格说明书.docx', issues: 2 },
          { id: 'doc-intro', type: 'file', kind: 'ppt', name: '项目启动会 v2.pptx' },
          { id: 'doc-arch', type: 'file', kind: 'image', name: '系统架构图.png' },
        ],
      },
      {
        id: 'folder-archive',
        type: 'folder',
        name: '04 往期归档',
        children: [
          { id: 'doc-old-1', type: 'file', kind: 'pdf', name: '2024 框架协议.pdf' },
          { id: 'doc-old-2', type: 'file', kind: 'pdf', name: '验收单.pdf' },
        ],
      },
    ],
  },
];

// Contract issues — inline citations target anchor ids rendered on PDF page.
export const CONTRACT_ISSUES = [
  {
    id: 'i-1',
    severity: 'high',
    category: '完整性',
    loc: { docId: 'doc-contract-main', page: 1, anchor: 'a-parties' },
    locLabel: '第 1 页',
    quote: '第8条仅就「许可软件」约定知识产权归乙方所有，但定义 2.6「定制软件」（由乙方根据本合同及本合同项目研制所得的软件）的知识产权归属完全未约定。',
    body: '本合同为定制开发服务合同，核心交付物是应用软件（2.6 条定义），而第 8 条仅处理了许可软件的知识产权，对甲方支付 79 万元委托开发的应用软件的著作权、派生代码以及字体、字库，属于必备条款缺失。',
    recommendation: '在第 8 条中明确约定定制软件的著作权归属、派生部分交付后使用授权范围，建议定制软件开发成果归甲方所有或双方共有。至少应明确甲方享有永久使用及修改权。',
  },
  {
    id: 'i-2',
    severity: 'med',
    category: '一致性',
    loc: { docId: 'doc-contract-main', page: 3, anchor: 'a-acceptance' },
    locLabel: '第 3 页',
    quote: '5.3 ... 系统正式上线运行 1 个月，若甲方未签字验收或未书面提出整改意见，视为已通过验收。附件三 3.、甲方应在 15 天内书面向乙方提出，逾期未提出异议视为定稿合格。',
    body: '主合同 5.3 条款定系统上线运行 1 个月后未签字验收视为合格，而附件三 3 条规定甲方仅 15 天内未书面异议即视为验收合格，两处关于「视为验收合格」的时限存在直接矛盾，直接影响验收判定。',
    recommendation: '统一主合同与附件中视为验收合格的时限，建议以 1 个月书面确认为准；或删除重复冲突条款。',
  },
  {
    id: 'i-3',
    severity: 'high',
    category: '风险',
    loc: { docId: 'doc-contract-main', page: 1, anchor: 'a-signdate' },
    locLabel: '第 1 页',
    quote: '签订时间：____年____月____日',
    body: '合同签订日期为必备要素，直接影响合同生效时间、建设期起算（3 个月内完成验收）及付款节点（生效后 5 个工作日内首期），当前日期完全空缺，可能导致执行节点无法起算。',
    recommendation: '补齐签订日期；若尚未最终确定，建议在正式盖章版本上由双方当面填写并各持一份。',
  },
  {
    id: 'i-4',
    severity: 'med',
    category: '风险',
    loc: { docId: 'doc-contract-main', page: 2, anchor: 'a-payment' },
    locLabel: '第 2 页',
    quote: '合同金额合计：柒拾玖万元整（¥790,000.00）分三期支付...',
    body: '付款节点描述与总金额核对：三期付款之和需等于合同总金额 79 万元，且与附件一报价单最终合计一致，当前存在 1 元尾差。',
    recommendation: '核对报价单第 12 行「集成服务」金额；调整为 60,001 元或修改总额。',
  },
  {
    id: 'i-5',
    severity: 'low',
    category: '表述',
    loc: { docId: 'doc-contract-main', page: 2, anchor: 'a-terms' },
    locLabel: '第 2 页',
    quote: '...双方因本合同引起的任何争议...',
    body: '争议解决条款未指定具体仲裁委员会或管辖法院，使用了「任何争议」这一宽泛表述。',
    recommendation: '建议明确约定由甲方所在地（厦门市）有管辖权的人民法院管辖，或指定厦门仲裁委员会仲裁。',
  },
  {
    id: 'i-6',
    severity: 'high',
    category: '完整性',
    loc: { docId: 'doc-contract-main', page: 4, anchor: 'a-liability' },
    locLabel: '第 4 页',
    quote: '任何一方违反本合同约定...',
    body: '违约责任条款仅原则性描述，未约定违约金比例或上限；在乙方延期交付、质量不达标等常见情形下缺乏可执行的赔付标准。',
    recommendation: '建议增加违约金按合同总额 0.5%/日计算、累计不超过合同总额 20% 的条款。',
  },
  {
    id: 'i-7',
    severity: 'med',
    category: '一致性',
    loc: { docId: 'doc-contract-main', page: 3, anchor: 'a-deliverables' },
    locLabel: '第 3 页',
    quote: '乙方应交付源代码、部署文档、用户手册...',
    body: '第 6 条交付清单与附件二《交付物明细》在「测试报告」一项上不一致——附件二要求提供第三方测试报告，主条款未提及。',
    recommendation: '在第 6 条补充第三方测试报告，或在附件二删除该项，以两份文件保持一致。',
  },
  {
    id: 'i-8',
    severity: 'low',
    category: '表述',
    loc: { docId: 'doc-contract-main', page: 5, anchor: 'a-force' },
    locLabel: '第 5 页',
    quote: '不可抗力包括但不限于...',
    body: '不可抗力列举中未包含「重大公共卫生事件」，近年合同建议补充。',
    recommendation: '在列举项中添加「重大公共卫生事件及政府管控措施」。',
  },
  {
    id: 'i-9',
    severity: 'high',
    category: '风险',
    loc: { docId: 'doc-contract-main', page: 5, anchor: 'a-termination' },
    locLabel: '第 5 页',
    quote: '任何一方均有权解除本合同...',
    body: '解除条款未区分根本违约与一般违约，任一方均可随时解除将给项目带来极大不确定性。',
    recommendation: '建议限定为对方发生根本违约、且在收到书面催告 15 日内仍未改正时方可解除。',
  },
];

// Initial chat for the agent conversation tab.
export const INITIAL_CHAT = [
  {
    id: 'm0',
    role: 'assistant',
    content: [
      { t: '我已经完成了对「双方合同《福朗电子》.pdf」的首轮审阅，共发现 ' },
      { cite: 'i-1', label: '9 处' },
      { t: ' 需要关注的问题，其中 ' },
      { cite: 'i-1', label: '5 处高风险' },
      { t: '。建议优先处理 ' },
      { cite: 'i-3', label: '签订日期缺失' },
      { t: ' 与 ' },
      { cite: 'i-2', label: '验收时限冲突' },
      { t: ' 两项，这会直接影响合同执行节点。' },
    ],
  },
  {
    id: 'm1',
    role: 'user',
    content: [{ t: '验收时限冲突具体是什么问题？' }],
  },
  {
    id: 'm2',
    role: 'assistant',
    content: [
      { t: '主合同 ' },
      { cite: 'i-2', label: '5.3 条' },
      { t: ' 规定系统上线运行「1 个月」未签字即视为合格，而附件三 3 条写的是「15 天内」未提异议即视为合格。两个时限直接矛盾，发生争议时乙方可能主张按更短的 15 天计算，对甲方不利。我建议统一为 1 个月书面确认。' },
    ],
  },
];

export const KIND_META = {
  pdf:   { label: 'PDF',   color: 'var(--pdf)' },
  word:  { label: 'DOCX',  color: 'var(--word)' },
  excel: { label: 'XLSX',  color: 'var(--excel)' },
  ppt:   { label: 'PPTX',  color: 'var(--ppt)' },
  image: { label: 'PNG',   color: 'var(--img)' },
  folder:{ label: 'Folder',color: 'var(--ink-3)' },
};
