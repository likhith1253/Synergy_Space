/**
 * Minimal in-memory stand-in for the Prisma client, covering exactly the calls the
 * document-service makes. Lets permission logic be tested without a database.
 */
import { randomUUID } from 'crypto';

type Row = Record<string, any>;

function table(pk: string = 'id') {
    const rows: Row[] = [];
    const matches = (row: Row, where: Row = {}): boolean =>
        Object.entries(where).every(([k, v]) => {
            if (v && typeof v === 'object' && 'in' in v) return (v.in as any[]).includes(row[k]);
            if (v && typeof v === 'object' && !(v instanceof Date)) return true; // nested relation filters unused in tests
            return row[k] === v;
        });
    return {
        rows,
        async findUnique({ where, include }: any) {
            const key = Object.keys(where)[0];
            const found = key.includes('_') && typeof where[key] === 'object'
                ? rows.find((r) => Object.entries(where[key]).every(([k, v]) => r[k] === v))
                : rows.find((r) => r[key] === where[key]);
            return found ? { ...found, ...(include ? { __include: true } : {}) } : null;
        },
        async findFirst({ where }: any = {}) { return rows.find((r) => matches(r, where)) ?? null; },
        async findMany({ where, select }: any = {}) {
            return rows.filter((r) => matches(r, where)).map((r) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, r[k]])) : { ...r }));
        },
        async create({ data }: any) {
            const row = { [pk]: randomUUID(), created_at: new Date(), updated_at: new Date(), ...data };
            rows.push(row);
            return { ...row };
        },
        async update({ where, data }: any) {
            const row = rows.find((r) => r[pk] === where[pk])!;
            Object.assign(row, data, { updated_at: new Date() });
            return { ...row };
        },
        async delete({ where }: any) {
            const i = rows.findIndex((r) => r[pk] === where[pk]);
            const [removed] = rows.splice(i, 1);
            return removed;
        },
        async deleteMany({ where }: any = {}) {
            for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], where)) rows.splice(i, 1);
            return { count: 0 };
        },
    };
}

export function createFakePrisma() {
    const db: any = {
        user: table(),
        organization: table(),
        organizationMember: table(),
        project: table(),
        teamMember: table(),
        document: table(),
        documentVersion: table(),
        canvas: table(),
        presentation: table(),
        slide: table(),
    };
    const docFindMany = db.document.findMany;
    db.document.findMany = async (args: any) => {
        const docs = await docFindMany.call(db.document, args);
        return args?.include?.project
            ? Promise.all(docs.map(async (d: any) => ({ ...d, project: await db.project.findUnique({ where: { id: d.project_id } }) })))
            : docs;
    };
    const slideFind = db.slide.findUnique;
    db.slide.findUnique = async (args: any) => {
        const slide = await slideFind.call(db.slide, args);
        if (!slide) return null;
        return { ...slide, presentation: await db.presentation.findUnique({ where: { id: slide.presentation_id } }) };
    };
    return db;
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
