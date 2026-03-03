'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { spellcheckAction } from '@/actions/spellcheck.action';
import styles from './ContentArea.module.css';

export function ContentArea() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const result = await spellcheckAction(text);
      // Wait, the mock service returns the text, we want to prove it round-tripped.
      // But replacing text with identical text is invisible. 
      // I'll just leave it since the requirements only specify calling it and bringing data back.
      setText(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.contentContainer}>
      <Textarea
        placeholder="je tape ici."
        className={styles.textArea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
      />
      <div className={styles.submitContainer}>
        <Button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className={styles.submitButton}
        >
          {loading ? 'Vérification...' : "Vérifier l'orthographe"}
        </Button>
      </div>
    </div>
  );
}
