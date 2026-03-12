export class SpellcheckService {
  /**
   * Mock spellcheck function that simply returns the original text.
   * Later to be replaced by actual logic.
   */
  public async checkText(text: string): Promise<string> {
    // Fictional response time simulation
    await new Promise((resolve) => setTimeout(resolve, 500));
    return text;
  }
}
