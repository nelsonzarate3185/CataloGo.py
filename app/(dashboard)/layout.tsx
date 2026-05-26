import { redirect } from "next/navigation";
import { getServerUser, adminDb, fromDoc } from "@/lib/firebase/admin";
import DashboardNav from "@/components/dashboard/DashboardNav";
import type { Comercio } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const snapshot = await adminDb
    .collection("comercios")
    .where("user_id", "==", user.uid)
    .limit(1)
    .get();

  const comercio = snapshot.empty ? null : fromDoc<Comercio>(snapshot.docs[0]);
  if (!comercio) redirect("/registro");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardNav comercioNombre={comercio.nombre} comercioSlug={comercio.slug} />
      <main className="flex-1 p-6 overflow-auto max-w-5xl">{children}</main>
    </div>
  );
}
