import * as React from 'react';

export function WordPreview() {
  return (
    <div className="word-page">
      <h1 className="word-title">需求规格说明书</h1>
      <div className="word-subtitle">SRS · v1.3 · 2026-03-20 · 已评审</div>
      <div className="word-h">1. 项目概述</div>
      <p className="word-p">本项目旨在为甲方搭建一套面向内部业务团队的审批与协同平台，核心目标是替换现有分散的 Excel + 邮件审批流程，提供统一的发起、流转、归档体验。</p>
      <div className="word-h">2. 核心用户角色</div>
      <p className="word-p">发起人（业务人员）、审批人（部门主管）、财务复核、系统管理员，共四类角色。权限矩阵详见附录 A。</p>
      <div className="word-h">3. 功能清单</div>
      <p className="word-p">3.1 单据模板中心：支持 8 类常用单据，包括出差、采购、合同、报销、用印、用车、招聘、行政。</p>
      <p className="word-p">3.2 流程引擎：支持串签、并签、条件路由、超时升级、催办。</p>
      <p className="word-p quote">注：流程引擎需满足三级审批的 P95 响应时间 ≤ 400ms，并发 500 单据/分钟。</p>
      <div className="word-h">4. 非功能需求</div>
      <p className="word-p">可用性 99.5%，数据保留 7 年，支持国密 SM2/SM3 电子签章。</p>
    </div>
  );
}
