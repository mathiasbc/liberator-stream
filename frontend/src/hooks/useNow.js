import { useEffect, useState } from 'react';

// Re-renders the calling component every `intervalMs` with the current time.
// Keep it in leaf components (clocks, countdowns) so the chart doesn't
// re-render every second.
const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

export default useNow;
