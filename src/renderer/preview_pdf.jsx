// PDF preview — demo content preserved, real files show skeleton until parser is integrated
import * as React from 'react';
import { Ic } from './icons';

function PdfPage({ pageNo, children }) {
  return (
    <div className="pdf-page" data-page={pageNo}>
      <div className="page-num">第 {pageNo} 页</div>
      {children}
    </div>
  );
}

function PdfDemoContent() {
  return (
    <>
      <PdfPage pageNo={1}>
        <h1 className="pdf-h1">定制软件开发合同</h1>
        <div className="pdf-field">
          <p>甲方：<span className="u" id="a-parties">厦门市福朗电子有限公司</span></p>
          <p>乙方：<span className="u">中软国际信息技术（厦门）有限公司</span></p>
          <p>合同签订地：<span className="u">福建省厦门市</span></p>
          <p>签订时间：<span className="u cite-anchor" id="a-signdate">　　　年　　　月　　　日</span></p>
        </div>
        <h2 className="pdf-h2">鉴于</h2>
        <p className="pdf-p">甲方拟委托乙方进行企业级应用软件的定制开发，双方经友好协商，就本项目的合作事宜达成如下协议，以资共同遵守。</p>
        <h2 className="pdf-h2">第一条 定义</h2>
        <p className="pdf-p">1.1 "本合同" 指本《定制软件开发合同》及其附件、补充协议。</p>
        <p className="pdf-p">1.2 "许可软件" 指乙方已有并向甲方授权使用的标准软件模块，范围见附件一。</p>
        <p className="pdf-p">1.3 "定制软件" 指由乙方根据本合同及本项目研制所得的软件。</p>
      </PdfPage>

      <PdfPage pageNo={2}>
        <h2 className="pdf-h2">第二条 合同金额与支付方式</h2>
        <p className="pdf-p">合同金额合计：<b className="cite-anchor" id="a-payment">柒拾玖万元整（¥790,000.00）</b>，分三期支付。</p>
        <ol className="pdf-list">
          <li>合同生效后 5 个工作日内，甲方支付合同总额 30% 作为首期款。</li>
          <li>系统上线并通过初步验收后 10 个工作日内，甲方支付合同总额 40%。</li>
          <li>系统最终验收合格并交付全部文档后 10 个工作日内，甲方支付剩余 30%。</li>
        </ol>
        <h2 className="pdf-h2">第三条 争议解决</h2>
        <p className="pdf-p cite-anchor" id="a-terms">双方因本合同引起的任何争议，应首先通过友好协商解决；协商不成的，任一方可以向有管辖权的机关主张权利。</p>
      </PdfPage>

      <PdfPage pageNo={3}>
        <h2 className="pdf-h2">第五条 验收</h2>
        <p className="pdf-p">5.1 乙方应按交付物清单向甲方交付系统及相关文档。</p>
        <p className="pdf-p">5.2 甲方应在交付后 15 个工作日内组织初步验收。</p>
        <p className="pdf-p cite-anchor" id="a-acceptance">5.3 系统正式上线运行 1 个月，若甲方未签字验收或未书面提出整改意见，视为已通过验收。附件三 3、甲方应在 15 天内书面向乙方提出，逾期未提出异议视为定稿合格。</p>
        <h2 className="pdf-h2">第六条 交付物</h2>
        <p className="pdf-p cite-anchor" id="a-deliverables">乙方应交付：源代码、部署文档、用户手册、培训材料。具体明细以附件二为准。</p>
      </PdfPage>

      <PdfPage pageNo={4}>
        <h2 className="pdf-h2">第七条 违约责任</h2>
        <p className="pdf-p cite-anchor" id="a-liability">任何一方违反本合同约定，造成对方损失的，应承担相应的赔偿责任。</p>
        <h2 className="pdf-h2">第八条 知识产权</h2>
        <p className="pdf-p">8.1 许可软件的知识产权归乙方所有。</p>
        <p className="pdf-p">8.2 甲方基于本合同取得的使用权为非独占、不可转让的使用许可。</p>
        <p className="pdf-p">8.3 本合同未提及的其他知识产权归属，按相关法律法规执行。</p>
      </PdfPage>

      <PdfPage pageNo={5}>
        <h2 className="pdf-h2">第九条 不可抗力</h2>
        <p className="pdf-p cite-anchor" id="a-force">不可抗力包括但不限于：地震、台风、洪水、战争、罢工等当事人不能预见、不能避免并不能克服的客观情况。</p>
        <h2 className="pdf-h2">第十条 合同解除</h2>
        <p className="pdf-p cite-anchor" id="a-termination">任何一方均有权解除本合同，但应提前书面通知对方。</p>
        <h2 className="pdf-h2">第十一条 其他</h2>
        <p className="pdf-p">本合同一式两份，双方各执一份，自双方签字盖章之日起生效。</p>
      </PdfPage>
    </>
  );
}

function PdfSkeletonPage() {
  return (
    <div className="pdf-skeleton-page">
      <div className="skeleton sk-title"/>
      <div className="skeleton sk-h2"/>
      {[100, 72, 88, 100, 64].map((w, i) => (
        <div key={i} className="skeleton sk-line" style={{ width: w + '%' }}/>
      ))}
      <div className="skeleton sk-space"/>
      <div className="skeleton sk-h2"/>
      {[100, 82, 100, 70, 58, 100].map((w, i) => (
        <div key={i} className="skeleton sk-line" style={{ width: w + '%' }}/>
      ))}
      <div className="skeleton sk-space"/>
      <div className="skeleton sk-h2"/>
      {[100, 76, 90].map((w, i) => (
        <div key={i} className="skeleton sk-line" style={{ width: w + '%' }}/>
      ))}
    </div>
  );
}

export function PdfPreview({ file, onMetaChange }) {
  const [status, setStatus] = React.useState('idle');
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (file.source === 'demo') return;
    setStatus('loading');
    window.api.file.read(file.path)
      .then(({ size, mtime }) => {
        onMetaChange?.({ size, mtime });
        setStatus('loaded');
      })
      .catch(err => { setStatus('error'); setError(err.message); });
  }, [file.id]);

  if (file.source === 'demo') return <PdfDemoContent/>;

  if (status === 'idle' || status === 'loading') {
    return (
      <>
        <PdfSkeletonPage/>
        <PdfSkeletonPage/>
        <PdfSkeletonPage/>
      </>
    );
  }

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

  // status === 'loaded' — PDF parser integration pending
  return (
    <div className="preview-error">
      <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>文件已加载 · PDF 渲染器待接入</div>
    </div>
  );
}
