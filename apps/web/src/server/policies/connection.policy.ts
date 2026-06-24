import { prisma } from "@gamepool/database";

export class ConnectionPolicy {
  async areConnected(userA: string, userB: string): Promise<boolean> {
    const connection = await prisma.sportsConnection.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterUserId: userA, recipientUserId: userB },
          { requesterUserId: userB, recipientUserId: userA },
        ],
      },
    });
    return Boolean(connection);
  }

  async getConnectedUserIds(userId: string): Promise<string[]> {
    const connections = await prisma.sportsConnection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterUserId: userId }, { recipientUserId: userId }],
      },
      select: { requesterUserId: true, recipientUserId: true },
    });

    return connections.map((c) =>
      c.requesterUserId === userId ? c.recipientUserId : c.requesterUserId,
    );
  }
}

export const connectionPolicy = new ConnectionPolicy();
