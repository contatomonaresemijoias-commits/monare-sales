import { useEffect, useState } from 'react';

/** Barra fina no topo indicando o quanto da página já foi lida. */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (el.scrollTop / total) * 100 : 0);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      className="fixed left-0 top-0 z-[100] h-[2px] bg-rosa-gradient transition-[width] duration-150 ease-out"
      style={{ width: `${progress}%` }}
    />
  );
}
