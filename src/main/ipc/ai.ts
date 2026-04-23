import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: AiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
};

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

export function registerAiIpcHandlers(): void {
  ipcMain.handle('ai:get-config', () => loadConfig());

  ipcMain.handle('ai:set-config', (_, patch: Partial<AiConfig>) => {
    saveConfig({ ...loadConfig(), ...patch });
  });

  ipcMain.on('ai:chat', async (event, reqId: string, messages: OpenAI.ChatCompletionMessageParam[]) => {
    const config = loadConfig();

    if (!config.apiKey) {
      event.sender.send('ai:error', reqId, '请先在设置中填写 API Key');
      return;
    }

    try {
      const client = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });
      const stream = await client.chat.completions.create({
        model: config.model,
        messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) event.sender.send('ai:chunk', reqId, text);
      }
      event.sender.send('ai:done', reqId);
    } catch (e: any) {
      event.sender.send('ai:error', reqId, e?.message ?? String(e));
    }
  });
}
