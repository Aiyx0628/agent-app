import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { ProxyAgent, Agent, setGlobalDispatcher } from 'undici';

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  proxyUrl: string;   // e.g. "http://127.0.0.1:7890"  empty = no proxy
  timeout: number;    // milliseconds, default 60000
}

const DEFAULT_CONFIG: AiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  proxyUrl: '',
  timeout: 60_000,
};

const ANALYZE_SYSTEM_PROMPT = `你是一名专业的中国合同法律顾问，专注于商业合同风险审查。
请审阅以下合同文本，识别所有潜在的法律风险、条款缺失、表述歧义和不公平条款。

输出规则：
1. 仅输出合法 JSON，不输出任何其他内容，不加 markdown 代码块
2. quote 字段必须是合同中的精确原文逐字引用，不超过 80 字，直接从文本中截取，不做任何修改
3. 分析维度：条款完整性、权利义务平衡、表述准确性、违约救济、知识产权归属、争议解决、付款安全

输出格式（严格遵守）：
{"issues":[{"severity":"high","category":"条款缺失","quote":"合同原文","body":"问题分析","recommendation":"修改建议"}]}

severity 只能为 "high"、"med"、"low" 之一
category 只能为以下之一：条款缺失、权利失衡、表述歧义、违约条款、知识产权、争议解决、支付风险、格式问题

合同文本（Markdown 格式，表格以 HTML 呈现）：`;

function configPath(): string {
  return path.join(app.getPath('userData'), 'ai-config.json');
}

function loadConfig(): AiConfig {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config: AiConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf8');
}

let currentProxyUrl = '';

function describeError(e: any): string {
  const parts = [
    e?.message ?? String(e),
    e?.status ? `status=${e.status}` : '',
    e?.code ? `code=${e.code}` : '',
    e?.type ? `type=${e.type}` : '',
  ].filter(Boolean);

  const upstream = e?.error;
  if (typeof upstream === 'string') {
    parts.push(`upstream=${upstream}`);
  } else if (upstream?.message) {
    parts.push(`upstream=${upstream.message}`);
  } else if (upstream) {
    try {
      parts.push(`upstream=${JSON.stringify(upstream)}`);
    } catch {
      parts.push('upstream=[unserializable]');
    }
  }

  const cause = e?.cause;
  if (cause?.message) {
    parts.push(`cause=${cause.message}`);
  }
  if (cause?.cause?.message) {
    parts.push(`rootCause=${cause.cause.message}`);
  }

  return parts.join(' | ');
}

function logAiError(scope: string, e: any): void {
  console.error(`[${scope}] error:`, describeError(e));
  if (e?.headers) {
    const usefulHeaders = {
      'x-request-id': e.headers['x-request-id'],
      'nvidia-request-id': e.headers['nvidia-request-id'],
      'cf-ray': e.headers['cf-ray'],
    };
    console.error(`[${scope}] response headers:`, usefulHeaders);
  }
}

function shouldRetryWithoutResponseFormat(e: any): boolean {
  return (
    e?.status === 400 ||
    e?.status === 422 ||
    e?.code === 'invalid_request_error' ||
    e?.type === 'invalid_request_error'
  );
}

function applyGlobalProxy(proxyUrl: string): void {
  if (proxyUrl === currentProxyUrl) return;
  currentProxyUrl = proxyUrl;
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl) as any);
    console.log('[proxy] global dispatcher set to', proxyUrl);
  } else {
    setGlobalDispatcher(new Agent() as any);
    console.log('[proxy] global dispatcher reset to direct');
  }
}

function makeClient(config: AiConfig): OpenAI {
  applyGlobalProxy(config.proxyUrl ?? '');
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    timeout: config.timeout ?? 60_000,
  });
}

export function registerAiIpcHandlers(): void {
  ipcMain.handle('ai:get-config', () => loadConfig());

  ipcMain.handle('ai:set-config', (_, patch: Partial<AiConfig>) => {
    saveConfig({ ...loadConfig(), ...patch });
  });

  // Streaming chat
  ipcMain.on('ai:chat', async (event, reqId: string, messages: OpenAI.ChatCompletionMessageParam[]) => {
    const config = loadConfig();
    console.log('[ai:chat] baseUrl=%s model=%s proxy=%s', config.baseUrl, config.model, config.proxyUrl || 'none');
    if (!config.apiKey) {
      console.warn('[ai:chat] no apiKey');
      event.sender.send('ai:error', reqId, '请先在设置中填写 API Key');
      return;
    }
    try {
      const stream = await makeClient(config).chat.completions.create({
        model: config.model,
        messages,
        stream: true,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) event.sender.send('ai:chunk', reqId, text);
      }
      event.sender.send('ai:done', reqId);
      console.log('[ai:chat] done');
    } catch (e: any) {
      logAiError('ai:chat', e);
      event.sender.send('ai:error', reqId, describeError(e));
    }
  });

  // One-shot contract analysis
  ipcMain.handle('ai:analyze', async (_, markdown: string): Promise<string> => {
    const config = loadConfig();
    console.log('[ai:analyze] baseUrl=%s model=%s proxy=%s chars=%d', config.baseUrl, config.model, config.proxyUrl || 'none', markdown.length);
    if (!config.apiKey) throw new Error('请先在设置中填写 API Key');

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: markdown },
    ];

    const client = makeClient(config);

    // Try with json_object response_format first, fall back on 400
    try {
      const resp = await client.chat.completions.create({
        model: config.model,
        messages,
        response_format: { type: 'json_object' } as any,
        temperature: 0.2,
      });
      const result = resp.choices[0]?.message?.content ?? '{"issues":[]}';
      console.log('[ai:analyze] done, response length=%d', result.length);
      return result;
    } catch (e: any) {
      console.warn('[ai:analyze] first attempt failed:', describeError(e));
      if (shouldRetryWithoutResponseFormat(e)) {
        console.warn('[ai:analyze] retrying without response_format');
        try {
          const resp = await client.chat.completions.create({
            model: config.model,
            messages,
            temperature: 0.2,
          });
          const result = resp.choices[0]?.message?.content ?? '{"issues":[]}';
          console.log('[ai:analyze] fallback done, response length=%d', result.length);
          return result;
        } catch (fallbackError: any) {
          logAiError('ai:analyze:fallback', fallbackError);
          throw new Error(describeError(fallbackError));
        }
      }
      logAiError('ai:analyze', e);
      throw new Error(describeError(e));
    }
  });
}
