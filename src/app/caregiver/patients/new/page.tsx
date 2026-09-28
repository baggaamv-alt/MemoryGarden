import { NewPatientForm } from "@/components/caregiver/NewPatientForm";

export default function NewPatientPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Add a person you care for</h1>
        <p className="text-ink-soft">This creates their Memory Garden. You can change everything later.</p>
      </div>
      <NewPatientForm />
    </div>
  );
}
