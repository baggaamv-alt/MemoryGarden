import { patientRef } from "@/lib/api/context";
import { json, route } from "@/lib/api/http";
import { homeState } from "@/lib/services/play";

export const GET = route(async () => json(await homeState(await patientRef())));
