import { CloudinaryStatusCard } from "@/components/caregiver/CloudinaryStatusCard";
import { MD } from "@/lib/cloudinary/metadata";

export default function CloudinaryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Cloudinary media pipeline</h1>
        <p className="text-ink-soft">How Memory Garden stores, organises, finds and transforms family memories.</p>
      </div>
      <CloudinaryStatusCard />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="cg-card p-5 text-sm">
          <h2 className="mb-2 text-lg font-extrabold">Organisation</h2>
          <ul className="list-disc space-y-1 pl-5 text-ink-soft">
            <li>Dynamic folders per person and category, e.g. <code>memory-garden/patients/P001/family</code>.</li>
            <li>Tags for categories and events (family, birthday, festival…), plus <code>patient-p001</code>.</li>
            <li>Contextual metadata for the approved caption and alt text.</li>
            <li>Built-in face detection on upload returns face boxes; caregivers name the people.</li>
          </ul>
        </div>
        <div className="cg-card p-5 text-sm">
          <h2 className="mb-2 text-lg font-extrabold">Structured metadata fields</h2>
          <ul className="grid grid-cols-2 gap-1 font-mono text-xs text-ink-soft">
            {Object.values(MD).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <div className="cg-card p-5 text-sm">
          <h2 className="mb-2 text-lg font-extrabold">Retrieval with the Search API</h2>
          <p className="text-ink-soft">
            Activities retrieve memories with expressions such as <code>metadata.mg_patient_id=&quot;P001&quot; AND metadata.mg_game_eligible=&quot;yes&quot;</code>, and
            Find the Memory searches by tag or category (<code>tags=&quot;birthday&quot;</code>). The database stays authoritative for consent: anything a
            caregiver keeps out never appears, even before Cloudinary&apos;s index updates.
          </p>
        </div>
        <div className="cg-card p-5 text-sm">
          <h2 className="mb-2 text-lg font-extrabold">Transformations as game mechanics</h2>
          <ul className="list-disc space-y-1 pl-5 text-ink-soft">
            <li>Memory Reveal: <code>e_blur:1600 → 800 → 300 → clear</code></li>
            <li>Who Is This?: face crops from confirmed face boxes or <code>c_thumb,g_face</code></li>
            <li>What&apos;s Missing?: <code>e_blur_region</code> over a caregiver-marked object</li>
            <li>Picture Puzzle: <code>c_fill,g_auto</code> then signed <code>c_crop</code> tiles</li>
            <li>Everywhere: <code>f_auto,q_auto</code> (or <code>q_auto:eco</code> on slow connections) with responsive <code>srcset</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
