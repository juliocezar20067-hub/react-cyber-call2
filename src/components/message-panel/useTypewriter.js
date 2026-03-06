import { useEffect, useRef } from 'react';

function normalizeBreaks(text) {
  return text.replaceAll('<br><br>', '\n\n');
}

export default function useTypewriter({ text, speed = 30 }) {
  const messageRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const element = messageRef.current;
    if (!element) return;

    const normalizedText = normalizeBreaks(text);

    element.textContent = '';
    let index = 0;

    const typing = setInterval(() => {
      if (index < normalizedText.length) {
        element.textContent += normalizedText.charAt(index);
        index += 1;
        element.scrollTop = element.scrollHeight;
      } else {
        clearInterval(typing);
      }
    }, speed);

    intervalRef.current = typing;

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [speed, text]);

  return messageRef;
}
