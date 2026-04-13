/** Public tenant row for login/branding — one row per call (no extra egress vs direct Supabase .single()). */
export async function fetchPublicBusiness(opts: { slug?: string; id?: string }) {
    const q = opts.slug
        ? `slug=${encodeURIComponent(opts.slug)}`
        : `id=${encodeURIComponent(opts.id!)}`;
    const res = await fetch(`/api/public/business?${q}`, { method: 'GET' });
    if (!res.ok) return null;
    return res.json() as Promise<Record<string, unknown>>;
}
