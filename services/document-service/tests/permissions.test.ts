import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

jest.mock('@collab/database', () => {
    const actual = jest.requireActual('@collab/database');
    const { db } = require('./helpers/db');
    return { ...actual, getPrismaClient: () => db, PrismaClient: function () { return db; } };
});

import routes from '../src/routes';
import { errorHandler } from '../src/middleware/error.middleware';
import { db } from './helpers/db';

const SECRET = process.env.JWT_SECRET as string;

const app = express();
app.use(express.json());
app.use('/', routes);
app.use(errorHandler);

const ids = {
    org: randomUUID(),
    otherOrg: randomUUID(),
    owner: randomUUID(),
    admin: randomUUID(),
    editor: randomUUID(),
    viewer: randomUUID(),
    outsider: randomUUID(),
    project: randomUUID(),
    document: randomUUID(),
    canvas: randomUUID(),
    presentation: randomUUID(),
    slide: randomUUID(),
};

const tokenFor = (userId: string, opts: jwt.SignOptions = {}) =>
    jwt.sign({ userId, email: `${userId}@example.com`, role: 'member', organizationId: ids.org }, SECRET, {
        algorithm: 'HS256',
        expiresIn: '15m',
        ...opts,
    });
const as = (userId: string) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

beforeEach(() => {
    for (const t of Object.values(db) as any[]) t.rows.length = 0;
    const now = new Date();
    db.organization.rows.push({ id: ids.org, name: 'Org', slug: 'org' }, { id: ids.otherOrg, name: 'Other', slug: 'other' });
    for (const [name, id] of [['owner', ids.owner], ['admin', ids.admin], ['editor', ids.editor], ['viewer', ids.viewer], ['outsider', ids.outsider]] as const) {
        db.user.rows.push({ id, email: `${id}@example.com`, full_name: name, organization_id: ids.org });
    }
    db.organizationMember.rows.push({ id: randomUUID(), organization_id: ids.org, user_id: ids.owner });
    db.project.rows.push({ id: ids.project, name: 'P', description: null, organization_id: ids.org, created_by: ids.owner, owner_id: ids.owner, created_at: now, updated_at: now });
    db.teamMember.rows.push(
        { id: randomUUID(), project_id: ids.project, user_id: ids.admin, role: 'admin' },
        { id: randomUUID(), project_id: ids.project, user_id: ids.editor, role: 'editor' },
        { id: randomUUID(), project_id: ids.project, user_id: ids.viewer, role: 'viewer' }
    );
    db.document.rows.push({ id: ids.document, title: 'Doc', project_id: ids.project, owner_id: ids.owner, yjs_binary_state: Buffer.from('hello'), created_at: now, updated_at: now });
    db.canvas.rows.push({ id: ids.canvas, project_id: ids.project, data: {}, name: 'c', created_at: now, updated_at: now });
    db.presentation.rows.push({ id: ids.presentation, project_id: ids.project, title: 'Deck', created_at: now, updated_at: now });
    db.slide.rows.push({ id: ids.slide, presentation_id: ids.presentation, title: 's', content: 'c', order: 1, created_at: now, updated_at: now });
});

describe('authentication', () => {
    it('rejects requests without a token', async () => {
        await request(app).get(`/documents/${ids.document}`).expect(401);
    });

    it('rejects a token signed with the wrong secret', async () => {
        const bad = jwt.sign({ userId: ids.owner }, 'some-other-secret', { algorithm: 'HS256' });
        await request(app).get(`/documents/${ids.document}`).set('Authorization', `Bearer ${bad}`).expect(401);
    });

    it('rejects an expired token', async () => {
        const expired = tokenFor(ids.owner, { expiresIn: -10 });
        await request(app).get(`/documents/${ids.document}`).set('Authorization', `Bearer ${expired}`).expect(401);
    });

    it('rejects a token using a non-pinned algorithm (HS512 with the right secret)', async () => {
        const hs512 = jwt.sign({ userId: ids.owner }, SECRET, { algorithm: 'HS512', expiresIn: '5m' });
        await request(app).get(`/documents/${ids.document}`).set('Authorization', `Bearer ${hs512}`).expect(401);
    });

    it('rejects an unsigned (alg=none) token', async () => {
        const none = [
            Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
            Buffer.from(JSON.stringify({ userId: ids.owner })).toString('base64url'),
            '',
        ].join('.');
        await request(app).get(`/documents/${ids.document}`).set('Authorization', `Bearer ${none}`).expect(401);
    });
});

describe('documents: resource ownership', () => {
    it('lets the owner and every team role read a document', async () => {
        for (const u of [ids.owner, ids.admin, ids.editor, ids.viewer]) {
            const res = await request(app).get(`/documents/${ids.document}`).set(as(u)).expect(200);
            expect(res.body.title).toBe('Doc');
        }
    });

    it('hides the document from a user with no role on its project (404, not 403)', async () => {
        await request(app).get(`/documents/${ids.document}`).set(as(ids.outsider)).expect(404);
    });

    it('does not let an outsider modify, delete, version or list a document', async () => {
        const h = as(ids.outsider);
        await request(app).patch(`/documents/${ids.document}`).set(h).send({ title: 'pwned' }).expect(404);
        await request(app).delete(`/documents/${ids.document}`).set(h).expect(404);
        await request(app).post(`/documents/${ids.document}/versions`).set(h).send({ name: 'v' }).expect(404);
        await request(app).get(`/documents/${ids.document}/versions`).set(h).expect(404);
        await request(app).get(`/projects/${ids.project}/documents`).set(h).expect(404);
        expect(db.document.rows[0].title).toBe('Doc');
    });

    it('does not let an outsider create a document in another users project', async () => {
        await request(app).post(`/projects/${ids.project}/documents`).set(as(ids.outsider)).send({ title: 'x' }).expect(404);
        await request(app).post('/documents').set(as(ids.outsider)).send({ title: 'x', project_id: ids.project }).expect(404);
        expect(db.document.rows).toHaveLength(1);
    });

    it('treats malformed ids as not found rather than erroring', async () => {
        await request(app).get('/documents/not-a-uuid').set(as(ids.owner)).expect(404);
    });

    it('lists only documents from projects the caller can access', async () => {
        const res = await request(app).get('/documents').set(as(ids.outsider)).expect(200);
        expect(res.body).toEqual([]);
        const own = await request(app).get('/documents').set(as(ids.viewer)).expect(200);
        expect(own.body).toHaveLength(1);
    });
});

describe('documents: role enforcement', () => {
    it('viewer can read but cannot edit, version or delete', async () => {
        const h = as(ids.viewer);
        await request(app).get(`/documents/${ids.document}`).set(h).expect(200);
        await request(app).patch(`/documents/${ids.document}`).set(h).send({ title: 'x' }).expect(403);
        await request(app).put(`/documents/${ids.document}`).set(h).send({ content: 'x' }).expect(403);
        await request(app).post(`/documents/${ids.document}/versions`).set(h).send({ name: 'v' }).expect(403);
        await request(app).delete(`/documents/${ids.document}`).set(h).expect(403);
        expect(db.document.rows[0].title).toBe('Doc');
    });

    it('editor can edit and snapshot but cannot delete', async () => {
        const h = as(ids.editor);
        await request(app).patch(`/documents/${ids.document}`).set(h).send({ title: 'edited' }).expect(200);
        await request(app).post(`/documents/${ids.document}/versions`).set(h).send({ name: 'v1' }).expect(201);
        await request(app).delete(`/documents/${ids.document}`).set(h).expect(403);
        expect(db.document.rows[0].title).toBe('edited');
    });

    it('admin can delete', async () => {
        await request(app).delete(`/documents/${ids.document}`).set(as(ids.admin)).expect(200);
        expect(db.document.rows).toHaveLength(0);
    });
});

describe('projects, team and tenancy', () => {
    it('hides a project from outsiders but shows it to members', async () => {
        await request(app).get(`/projects/${ids.project}`).set(as(ids.outsider)).expect(404);
        await request(app).get(`/projects/${ids.project}`).set(as(ids.viewer)).expect(200);
    });

    it('only the owner can delete a project', async () => {
        await request(app).delete(`/projects/${ids.project}`).set(as(ids.admin)).expect(403);
        await request(app).delete(`/projects/${ids.project}`).set(as(ids.outsider)).expect(404);
        await request(app).delete(`/projects/${ids.project}`).set(as(ids.owner)).expect(200);
    });

    it('refuses to create a project in an organization the caller does not belong to', async () => {
        await request(app).post('/projects').set(as(ids.owner)).send({ name: 'x', organization_id: ids.otherOrg }).expect(403);
        expect(db.project.rows).toHaveLength(1);
        await request(app).post('/projects').set(as(ids.owner)).send({ name: 'ok', organization_id: ids.org }).expect(201);
    });

    it('team roster is member-only; only the owner can add members; roles are validated', async () => {
        await request(app).get(`/projects/${ids.project}/team`).set(as(ids.outsider)).expect(404);
        await request(app).post(`/projects/${ids.project}/team`).set(as(ids.editor)).send({ email: 'a@b.c', role: 'admin' }).expect(403);
        const target = db.user.rows.find((u: any) => u.id === ids.outsider);
        await request(app).post(`/projects/${ids.project}/team`).set(as(ids.owner)).send({ email: target.email, role: 'superuser' }).expect(400);
    });

    it('invite creation validates the role and is owner-only', async () => {
        await request(app).post(`/projects/${ids.project}/invite`).set(as(ids.editor)).send({ email: 'x@example.com', role: 'viewer' }).expect(403);
        await request(app).post(`/projects/${ids.project}/invite`).set(as(ids.owner)).send({ email: 'x@example.com', role: 'owner' }).expect(400);
    });
});

describe('canvas, presentations and slides', () => {
    it('outsiders cannot read or write any of them', async () => {
        const h = as(ids.outsider);
        await request(app).get(`/canvas/${ids.canvas}`).set(h).expect(404);
        await request(app).put(`/canvas/${ids.canvas}`).set(h).send({ data: { x: 1 } }).expect(404);
        await request(app).get(`/projects/${ids.project}/canvases`).set(h).expect(404);
        await request(app).get(`/presentations/${ids.presentation}`).set(h).expect(404);
        await request(app).get(`/presentations/${ids.presentation}/slides`).set(h).expect(404);
        await request(app).get(`/slides/${ids.slide}`).set(h).expect(404);
        await request(app).put(`/slides/${ids.slide}`).set(h).send({ title: 'pwned' }).expect(404);
        await request(app).delete(`/slides/${ids.slide}`).set(h).expect(404);
        expect(db.slide.rows[0].title).toBe('s');
    });

    it('viewers can read slides and canvas but not change or delete them', async () => {
        const h = as(ids.viewer);
        await request(app).get(`/slides/${ids.slide}`).set(h).expect(200);
        await request(app).get(`/canvas/${ids.canvas}`).set(h).expect(200);
        await request(app).put(`/slides/${ids.slide}`).set(h).send({ title: 'x' }).expect(403);
        await request(app).delete(`/slides/${ids.slide}`).set(h).expect(403);
        await request(app).put(`/canvas/${ids.canvas}`).set(h).send({ name: 'x' }).expect(403);
        await request(app).post(`/presentations/${ids.presentation}/slides`).set(h).send({ title: 't', content: 'c' }).expect(403);
        expect(db.slide.rows).toHaveLength(1);
    });

    it('editors can update slides', async () => {
        await request(app).put(`/slides/${ids.slide}`).set(as(ids.editor)).send({ title: 'new' }).expect(200);
        expect(db.slide.rows[0].title).toBe('new');
    });
});
