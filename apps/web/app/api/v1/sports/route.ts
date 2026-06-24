import { SportService } from "@/features/sports/services/sport.service";
import { jsonSuccess } from "@/server/errors/api-error";

const service = new SportService();

export async function GET() {
  const sports = await service.list();
  return jsonSuccess(sports);
}
