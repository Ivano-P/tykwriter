import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
dotenv.config();

export class MistralAiProService {
  private static client = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });

  static async checkSpelling(text: string): Promise<string> {
    try {
      const response = await this.client.agents.complete({
        agentId: 'ag_019cc33e0cd5741080d0523a1dfab603',
        messages: [{ role: 'user', content: text }],
      });

      const result = response.choices?.[0]?.message?.content;
      if (typeof result !== 'string') {
        throw new Error('Invalid response from Mistral AI');
      }
      return result.trim();
    } catch (error) {
      console.error('Mistral AI Pro Service Error:', error);
      throw new Error('Failed to correct spelling with Mistral API.');
    }
  }
}