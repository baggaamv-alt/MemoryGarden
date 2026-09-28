export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-7xl" aria-hidden="true">☁️</span>
      <h1 className="text-3xl font-extrabold">We&apos;re offline for a moment</h1>
      <p className="max-w-md text-xl text-ink-soft">Everything is saved. Memory Garden will be ready again when the internet comes back.</p>
      <p className="max-w-md text-xl text-ink-soft" lang="te">ఇంటర్నెట్ తిరిగి వచ్చాక మెమరీ గార్డెన్ మళ్ళీ సిద్ధంగా ఉంటుంది.</p>
    </main>
  );
}
