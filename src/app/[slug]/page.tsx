import { redirect } from 'next/navigation';

export default async function SlugIndexPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    // We cannot reliably check localStorage on the server, so we redirect to a client component that does the routing, 
    // or just redirect to login and let login handle the "already logged in" bounce.
    redirect(`/${slug}/login`);
}
