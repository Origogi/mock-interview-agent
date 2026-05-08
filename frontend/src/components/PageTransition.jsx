import { useEffect, useState } from 'react';

export default function PageTransition({ pageKey, children }) {
  const [shown, setShown] = useState(pageKey);
  const [phase, setPhase] = useState('in');
  const [pendingChildren, setPendingChildren] = useState(children);

  useEffect(() => {
    if (pageKey === shown) {
      setPendingChildren(children);
      return;
    }
    setPhase('out');
    const t = setTimeout(() => {
      setShown(pageKey);
      setPendingChildren(children);
      setPhase('in');
    }, 280);
    return () => clearTimeout(t);
  }, [pageKey, children, shown]);

  return (
    <div className={`page-transition is-${phase}`} key={shown}>
      {pendingChildren}
    </div>
  );
}
