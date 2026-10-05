import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

function StatusPage({ code, title, description }: { code: string; title: string; description: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-primary">{code}</p>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button asChild className="mt-2">
        <Link to="/">Ke Dashboard</Link>
      </Button>
    </div>
  );
}

export function NotFoundPage() {
  return <StatusPage code="404" title="Halaman tidak ditemukan" description="Halaman yang Anda cari tidak tersedia." />;
}

export function ForbiddenPage() {
  return <StatusPage code="403" title="Akses ditolak" description="Role Anda tidak memiliki akses ke halaman ini." />;
}
