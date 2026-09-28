import { patientRef } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { journeyState } from "@/lib/services/play";

export const GET = route(async () => json(await journeyState(await patientRef())));
