/** jest.fn based stand-in for the Prisma client, covering the calls auth-service makes. */
const model = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
});

export const prisma: Record<string, ReturnType<typeof model>> = {
    user: model(),
    organization: model(),
    organizationMember: model(),
    pendingUser: model(),
    passwordResetToken: model(),
    invitation: model(),
    project: model(),
    teamMember: model(),
    document: model(),
    documentVersion: model(),
    presentation: model(),
    slide: model(),
    canvas: model(),
    message: model(),
};

export function resetPrisma(): void {
    for (const m of Object.values(prisma)) for (const fn of Object.values(m)) fn.mockReset();
}
