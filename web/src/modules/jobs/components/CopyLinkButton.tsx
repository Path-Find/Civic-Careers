import { Link } from 'lucide-react';
import { useState } from 'react';

export function CopyLinkButton({ label = 'Copy link' }: { label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    window.setTimeout(() => setStatus('idle'), 2500);
  };

  return <button type="button" className="copy-link-button" onClick={copy}>
    <Link size={13} /> {status === 'copied' ? 'Link copied' : status === 'failed' ? 'Copy failed' : label}
  </button>;
}
