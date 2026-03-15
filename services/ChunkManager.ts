export interface TextChunk {
  originalText: string;
  isComplete: boolean;
}

export class ChunkManager {
  /**
   * Splits a large text into smaller chunks based on sentence terminators.
   * Ensures that reassembling the chunks exactly matches the original string.
   */
  static splitIntoBlocks(text: string): TextChunk[] {
    if (!text) return [];
    
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      currentChunk += char;
      
      // If we hit a sentence terminator or a newline
      if (['.', '?', '!', '\n'].includes(char)) {
        // Group all subsequent spaces and newlines into this chunk so we don't sever punctuation from spacing
        while (i + 1 < text.length && [' ', '\t', '\r', '\n'].includes(text[i + 1])) {
          i++;
          currentChunk += text[i];
        }
        chunks.push({
          originalText: currentChunk,
          isComplete: true
        });
        currentChunk = '';
      }
    }
    
    // Any remaining text is a partial chunk
    if (currentChunk.length > 0) {
      chunks.push({
        originalText: currentChunk,
        isComplete: false
      });
    }
    
    return chunks;
  }
}
