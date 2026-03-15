import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const EMAIL_GREETINGS = [
  'bonjour', 'salut', 'hello', 'cher', 'chère', 'coucou'
];

export const EMAIL_CLOSINGS = [
  'cordialement', 'bien à vous', 'sincèrement', 'cdt', 'merci', 'à bientôt', 'bonne journée', 'bonne soirée', 'a\\+'
];

export function formatEmailText(text: string): string {
  if (!text) return text;
  
  const trimmedText = text.trim();
  if (!trimmedText) return text;

  let newText = text;

  const greetingRegex = new RegExp(`^(${EMAIL_GREETINGS.join('|')})\\b`, 'i');
  if (!greetingRegex.test(trimmedText)) {
    // Determine how many newlines to prepend so that we end up with 2 blank lines (3 newlines total) 
    // between "Bonjour," and the start of the content.
    const leadingMatch = newText.match(/^\n*/);
    const leadingNewlines = leadingMatch ? leadingMatch[0].length : 0;
    
    let prefix = "Bonjour,";
    if (leadingNewlines === 0) {
      prefix += "\n\n\n";
    } else if (leadingNewlines === 1) {
      prefix += "\n\n";
    } else if (leadingNewlines === 2) {
      prefix += "\n";
    }
    
    newText = prefix + newText;
  }

  const closingRegex = new RegExp(`(${EMAIL_CLOSINGS.join('|')})[\\s\\p{P}]*$`, 'iu');
  if (!closingRegex.test(trimmedText)) {
    const trailingMatch = newText.match(/\n*$/);
    const trailingNewlines = trailingMatch ? trailingMatch[0].length : 0;
    
    // Similarly, we want 2 blank lines (3 newlines total) before "Cordialement,"
    if (trailingNewlines === 0) {
      newText += "\n\n\n";
    } else if (trailingNewlines === 1) {
      newText += "\n\n";
    } else if (trailingNewlines === 2) {
      newText += "\n";
    }
    
    newText += "Cordialement,";
  }

  return newText;
}
