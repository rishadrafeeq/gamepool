import { SportRepository } from "@/features/sports/repositories/sport.repository";

export class SportService {
  constructor(private readonly sports = new SportRepository()) {}

  list() {
    return this.sports.listActive();
  }
}
