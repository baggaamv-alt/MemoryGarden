import { PeopleManager } from "@/components/caregiver/PeopleManager";
import { pageCaregiverFor } from "@/lib/auth/session";
import { listPeople } from "@/lib/services/caregiver";

export default async function PeoplePage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = await params;
  await pageCaregiverFor(pid);
  const people = await listPeople(pid, {});
  return <PeopleManager patientId={pid} initial={people} />;
}
