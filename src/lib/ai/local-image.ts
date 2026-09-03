import { ImageProvider, ProviderHealth } from './provider';

export class LocalImageProvider implements ImageProvider {
  id = 'local-image';
  name = 'Local Image Provider';
  type = 'local';
  capabilities = {
    generate: true,
    edit: true,
  };

  private baseUrl: string;
  private editModel: string;

  constructor() {
    this.baseUrl = process.env.IMAGE_PROVIDER_URL || 'http://127.0.0.1:8000';
    this.editModel = process.env.IMAGE_EDIT_MODEL || 'stable-diffusion-xl-instruct';
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!process.env.IMAGE_PROVIDER_URL) {
      return { status: 'NOT CONFIGURED', error: 'IMAGE_PROVIDER_URL not set' };
    }
    try {
      const start = Date.now();
      const res = await fetch(`${this.baseUrl}/health`);
      const latency = Date.now() - start;
      if (res.ok) {
        return { status: 'CONNECTED', latency };
      }
      return { status: 'UNAVAILABLE', error: res.statusText };
    } catch (e: any) {
      return { status: 'UNAVAILABLE', error: e.message };
    }
  }

  async generateImage(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.editModel,
        prompt: prompt,
      }),
    });

    if (!res.ok) {
      throw new Error(`Local image generation error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.image; // Assume it returns base64
  }

  async editImage(imageBase64: string, prompt: string): Promise<string> {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const res = await fetch(`${this.baseUrl}/api/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.editModel,
        prompt: prompt,
        image: base64Data
      }),
    });

    if (!res.ok) {
      throw new Error(`Local image editing error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.image; // Assume it returns base64
  }
}
