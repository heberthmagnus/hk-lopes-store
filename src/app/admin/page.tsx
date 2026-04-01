import { AdminDashboard } from "@/components/admin-dashboard";
import { requireAuthenticatedUser } from "@/lib/auth";
import { getAdminStorePayload } from "@/lib/store-data";

export default async function AdminPage() {
  const user = await requireAuthenticatedUser();
  const payload = await getAdminStorePayload();

  return <AdminDashboard initialPayload={payload} userEmail={user.email} />;
}
