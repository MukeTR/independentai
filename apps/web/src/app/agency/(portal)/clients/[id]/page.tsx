import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requirePageActor, hasAgencyRole } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { listClientCards } from '@/server/agency';
import { ClientDetail, type AssignedMember } from '@/components/agency/client-detail';

export const metadata = { title: 'Müşteri detayı — Independent AI' };

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageActor();
  const agency = actor.agency!;
  const canManage = hasAgencyRole(actor, 'ADMIN');

  // Erişim: listClientCards zaten allClients/WorkspaceAccess filtresi uygular → dışında kalan 404.
  const cards = await listClientCards(agency, { includeArchived: true });
  const card = cards.find((c) => c.workspaceId === id);
  if (!card) notFound();

  const memberships = await prisma.agencyMembership.findMany({
    where: {
      agencyId: agency.id,
      status: 'ACTIVE',
      OR: [{ allClients: true }, { access: { some: { workspaceId: id } } }],
    },
    include: {
      user: { select: { email: true, name: true } },
      access: { where: { workspaceId: id }, select: { roleOverride: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const assigned: AssignedMember[] = memberships.map((m) => ({
    membershipId: m.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    viaAllClients: m.allClients,
    roleOverride: m.access[0]?.roleOverride ?? null,
  }));
  const memberOptions = canManage
    ? (
        await prisma.agencyMembership.findMany({
          where: { agencyId: agency.id, status: 'ACTIVE' },
          include: { user: { select: { email: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        })
      ).map((m) => ({
        id: m.id,
        email: m.user.email,
        name: m.user.name,
      }))
    : [];

  return (
    <div>
      <Link
        href="/agency/clients"
        className="text-[12.5px] text-ink-muted hover:text-ink inline-flex items-center gap-1 mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Müşteriler
      </Link>
      <div className="eyebrow">Müşteri</div>
      <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-1 mb-6">{card.name}</h1>
      <ClientDetail card={card} assigned={assigned} memberOptions={memberOptions} canManage={canManage} />
    </div>
  );
}
