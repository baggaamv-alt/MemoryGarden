import "server-only";
import dns from "node:dns";

/**
 * Read-only view of the previous Memory Garden backend (Express + MongoDB, `memory-app-backend`).
 * Only the data worth keeping is read: accounts, memories with their Cloudinary photos, people and
 * albums. Scores, stars and difficulty data are intentionally not imported — this app does not
 * use performance-based mechanics.
 */
export type LegacyUser = { id: string; name: string; email: string; passwordHash: string };
export type LegacyPhoto = { id: string; publicId: string; secureUrl: string; format?: string | null };
export type LegacyMemory = {
  id: string;
  title: string;
  description: string;
  year: number | null;
  eventName: string;
  category: string;
  tags: string[];
  albumId: string | null;
  personIds: string[];
  photos: LegacyPhoto[];
};
export type LegacyPerson = { id: string; name: string; relationship: string };
export type LegacyAlbum = { id: string; title: string; description: string };

export interface LegacySource {
  findUserByEmail(email: string): Promise<LegacyUser | null>;
  memories(userId: string): Promise<LegacyMemory[]>;
  people(userId: string): Promise<LegacyPerson[]>;
  albums(userId: string): Promise<LegacyAlbum[]>;
  close(): Promise<void>;
}

export function legacyConfigured() {
  return !!process.env.LEGACY_MONGODB_URI?.trim();
}

type Doc = Record<string, unknown> & { _id: { toString(): string } };
const str = (v: unknown) => (typeof v === "string" ? v : "");
const idOf = (v: unknown) => (v && typeof v === "object" && "toString" in v ? (v as { toString(): string }).toString() : v ? String(v) : "");

export async function openMongoLegacySource(): Promise<LegacySource> {
  const uri = process.env.LEGACY_MONGODB_URI?.trim();
  if (!uri) throw new Error("LEGACY_MONGODB_URI is not set.");
  const servers = process.env.LEGACY_MONGODB_DNS_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (servers?.length) dns.setServers(servers);
  const { MongoClient, ObjectId } = await import("mongodb");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/SSL|tlsv1|timed out|ECONNREFUSED|whitelist/i.test(msg)) {
      throw new Error(
        "Could not reach the previous backend's MongoDB Atlas cluster. In Atlas → Network Access, add this computer's IP address, then try again.",
      );
    }
    if (/bad auth|Authentication failed/i.test(msg)) throw new Error("MongoDB Atlas rejected the database username/password in LEGACY_MONGODB_URI.");
    throw new Error(`Could not connect to the previous backend's database: ${msg}`);
  }
  const db = client.db();
  const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : id);

  return {
    async findUserByEmail(email) {
      const u = (await db.collection("users").findOne({ email: email.trim().toLowerCase() })) as Doc | null;
      if (!u) return null;
      return { id: u._id.toString(), name: str(u.name), email: str(u.email), passwordHash: str(u.passwordHash) };
    },
    async memories(userId) {
      const rows = (await db.collection("memories").find({ user: oid(userId) }).sort({ date: 1, createdAt: 1 }).toArray()) as Doc[];
      return rows.map((m) => ({
        id: m._id.toString(),
        title: str(m.title),
        description: str(m.description),
        year: typeof m.year === "number" ? m.year : null,
        eventName: str(m.eventName),
        category: str(m.category),
        tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
        albumId: m.album ? idOf(m.album) : null,
        personIds: Array.isArray(m.people) ? m.people.map(idOf) : [],
        photos: (Array.isArray(m.photos) ? (m.photos as Doc[]) : []).map((p) => ({
          id: p._id.toString(),
          publicId: str(p.publicId),
          secureUrl: str(p.secureUrl),
          format: str(p.format) || null,
        })),
      }));
    },
    async people(userId) {
      const rows = (await db.collection("people").find({ user: oid(userId) }).toArray()) as Doc[];
      return rows.map((p) => ({ id: p._id.toString(), name: str(p.name), relationship: str(p.relationship) }));
    },
    async albums(userId) {
      const rows = (await db.collection("albums").find({ user: oid(userId) }).toArray()) as Doc[];
      return rows.map((a) => ({ id: a._id.toString(), title: str(a.title), description: str(a.description) }));
    },
    close: () => client.close(),
  };
}
