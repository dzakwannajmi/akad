'use client';

import { useEffect, useState } from 'react';

// Cycles the visible word every `interval`ms with a short fade-and-rise
// transition (see `akd-word-in` in globals.css). Used for the "Swap
// {word}." heading in the keunggulan section. The invisible duplicate of
// the longest word reserves layout width via CSS grid stacking, so the
// heading doesn't reflow as the loop swaps words.
export function LoopingWord({
  words,
  interval = 2200,
  className = '',
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words, interval]);

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));

  return (
    <span className="inline-grid align-bottom">
      <span key={index} className={`col-start-1 row-start-1 animate-akd-word-in ${className}`}>
        {words[index]}
      </span>
      <span aria-hidden="true" className={`invisible col-start-1 row-start-1 ${className}`}>
        {longest}
      </span>
    </span>
  );
}
