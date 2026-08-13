export type PendingDetailAction = {
  href: string;
  label: string;
};

export function pendingDetailAction(detailsUrl: string | null): PendingDetailAction | null {
  if (!detailsUrl) return null;

  try {
    const url = new URL(detailsUrl);
    const peopleSoftJobId = url.hash.match(/^#jobid=([^&]+)$/i)?.[1];
    if (peopleSoftJobId) {
      url.hash = '';
      return {
        href: url.toString(),
        label: `Open official job board and search for job ${decodeURIComponent(peopleSoftJobId)}`,
      };
    }
  } catch {
    // Keep the existing source link for an unexpected but still usable URL.
  }

  return {
    href: detailsUrl,
    label: /\.pdf(?:[?#]|$)/i.test(detailsUrl) ? 'View full posting (PDF)' : 'Open original posting',
  };
}
