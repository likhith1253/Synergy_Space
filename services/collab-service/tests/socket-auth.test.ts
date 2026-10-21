import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { io as connect, Socket } from 'socket.io-client';

// Authorization decisions are table-driven here; the handler logic around them is the real code.
const DOC_EDIT = '22222222-2222-4222-8222-222222222222';
const DOC_PRIVATE = '33333333-3333-4333-8333-333333333333';
const PROJECT = '44444444-4444-4444-8444-444444444444';
const ORG = '55555555-5555-4555-8555-555555555555';

jest.mock('../src/services/access.service', () => ({
    getDocumentRoomAccess: jest.fn(async (docId: string, userId: string) => {
        if (docId === '33333333-3333-4333-8333-333333333333') return { allowed: false, canWrite: false };
        const canWrite = userId !== 'viewer';
        return { allowed: true, canWrite };
    }),
    getSlideRoomAccess: jest.fn(async () => ({ allowed: false, canWrite: false })),
    getProjectRoomAccess: jest.fn(async (_p: string, userId: string) => ({ allowed: userId !== 'outsider', canWrite: userId !== 'outsider' })),
    isOrganizationMember: jest.fn(async (_o: string, userId: string) => userId !== 'outsider'),
}));

import { createCollabServer } from '../src/server';

const SECRET = process.env.JWT_SECRET as string;
const tokenFor = (userId: string, opts: jwt.SignOptions = {}) =>
    jwt.sign({ userId, email: `${userId}@example.com`, role: 'member', organizationId: ORG }, SECRET, { algorithm: 'HS256', expiresIn: '5m', ...opts });

let server: ReturnType<typeof createCollabServer>['server'];
let ioServer: ReturnType<typeof createCollabServer>['io'];
let url: string;
const open: Socket[] = [];

beforeAll(async () => {
    const created = createCollabServer();
    server = created.server;
    ioServer = created.io;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => {
    while (open.length) open.pop()!.disconnect();
});

afterAll(async () => {
    ioServer.close();
    await new Promise((r) => server.close(r));
});

function client(token?: string): Socket {
    const s = connect(url, { transports: ['websocket'], auth: token ? { token } : {}, reconnection: false, forceNew: true });
    open.push(s);
    return s;
}

const once = <T = any>(s: Socket, event: string, timeoutMs = 1500) =>
    new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
        s.once(event, (d: T) => { clearTimeout(t); resolve(d); });
    });

const connected = (s: Socket) => once(s, 'connect');
const silent = (s: Socket, event: string, ms = 300) =>
    new Promise<boolean>((resolve) => {
        let got = false;
        s.once(event, () => { got = true; });
        setTimeout(() => resolve(!got), ms);
    });

describe('handshake authentication', () => {
    it('rejects a connection without a token', async () => {
        const s = client();
        const err = await once<Error>(s, 'connect_error');
        expect(err.message).toMatch(/Authentication required/);
    });

    it('rejects a forged token', async () => {
        const s = client(jwt.sign({ userId: 'x' }, 'wrong-secret', { algorithm: 'HS256' }));
        await once(s, 'connect_error');
    });

    it('rejects an HS512 token even if signed with the right secret (algorithm is pinned)', async () => {
        const s = client(jwt.sign({ userId: 'x' }, SECRET, { algorithm: 'HS512' }));
        await once(s, 'connect_error');
    });

    it('rejects an expired token', async () => {
        const s = client(tokenFor('editor', { expiresIn: -5 }));
        await once(s, 'connect_error');
    });

    it('accepts a valid token', async () => {
        const s = client(tokenFor('editor'));
        await connected(s);
    });
});

describe('room authorization', () => {
    it('does not let an authenticated user join a document they have no access to', async () => {
        const s = client(tokenFor('editor'));
        await connected(s);
        const denied = once(s, 'error');
        s.emit('join-document', { documentId: DOC_PRIVATE });
        expect((await denied).code).toBe('FORBIDDEN');
        expect(await silent(s, 'joined-document')).toBe(true);
    });

    it('does not let an outsider into a project chat or an organization room', async () => {
        const s = client(tokenFor('outsider'));
        await connected(s);
        let denied = once(s, 'error');
        s.emit('join-chat', { projectId: PROJECT });
        expect((await denied).code).toBe('FORBIDDEN');
        denied = once(s, 'error');
        s.emit('join-organization', { organizationId: ORG });
        expect((await denied).code).toBe('FORBIDDEN');
    });

    it('rejects malformed room ids', async () => {
        const s = client(tokenFor('editor'));
        await connected(s);
        const err = once(s, 'error');
        s.emit('join-document', { documentId: { $ne: null } });
        expect((await err).code).toBe('INVALID_PAYLOAD');
    });
});

describe('write permissions', () => {
    async function pair() {
        const editor = client(tokenFor('editor'));
        const viewer = client(tokenFor('viewer'));
        await Promise.all([connected(editor), connected(viewer)]);
        const j1 = once(editor, 'joined-document');
        editor.emit('join-document', { documentId: DOC_EDIT });
        await j1;
        const j2 = once(viewer, 'joined-document');
        viewer.emit('join-document', { documentId: DOC_EDIT });
        await j2;
        return { editor, viewer };
    }

    it('relays an editor update to other members of the room', async () => {
        const { editor, viewer } = await pair();
        const received = once(viewer, 'document-update');
        editor.emit('document-update', { documentId: DOC_EDIT, content: 'hello' });
        const msg = await received;
        expect(msg.content).toBe('hello');
        expect(msg.updatedBy.userId).toBe('editor');
    });

    it('drops updates from a read-only viewer and tells them why', async () => {
        const { editor, viewer } = await pair();
        const denied = once(viewer, 'error');
        const leaked = silent(editor, 'document-update');
        viewer.emit('document-update', { documentId: DOC_EDIT, content: 'tampered' });
        expect((await denied).code).toBe('FORBIDDEN');
        expect(await leaked).toBe(true);
    });

    it('drops updates aimed at a room the socket never joined', async () => {
        const { editor } = await pair();
        const attacker = client(tokenFor('editor2'));
        await connected(attacker);
        const denied = once(attacker, 'error');
        const leaked = silent(editor, 'document-update');
        attacker.emit('document-update', { documentId: DOC_EDIT, content: 'tampered' });
        expect((await denied).code).toBe('FORBIDDEN');
        expect(await leaked).toBe(true);
    });

    it('drops canvas updates from a viewer', async () => {
        const { editor, viewer } = await pair();
        const leaked = silent(editor, 'canvas-update');
        viewer.emit('canvas-update', { documentId: DOC_EDIT, canvasData: '{}' });
        expect(await leaked).toBe(true);
    });
});

describe('chat', () => {
    it('refuses chat:send until the socket has joined the project chat, and stamps the verified sender', async () => {
        const a = client(tokenFor('editor'));
        const b = client(tokenFor('editor2'));
        await Promise.all([connected(a), connected(b)]);

        const denied = once(a, 'error');
        a.emit('chat:send', { projectId: PROJECT, message: { id: 'm0', content: 'sneaky' } });
        expect((await denied).code).toBe('FORBIDDEN');

        const ja = once(a, 'joined-chat');
        const jb = once(b, 'joined-chat');
        a.emit('join-chat', { projectId: PROJECT });
        b.emit('join-chat', { projectId: PROJECT });
        await Promise.all([ja, jb]);

        const incoming = once(b, 'message:new');
        a.emit('chat:send', { projectId: PROJECT, sender: { id: 'spoofed' }, message: { id: 'm1', content: 'hi' } });
        const msg = await incoming;
        expect(msg.content).toBe('hi');
        expect(msg.sender.id).toBe('editor');
    });
});
