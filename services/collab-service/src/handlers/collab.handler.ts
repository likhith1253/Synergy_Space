/**
 * Collaboration Handler
 * Real-time relay for document content, slides, canvas, presence and project chat (Socket.io).
 *
 * Every socket is authenticated by a JWT at handshake time (see index.ts). Authentication
 * alone is NOT enough to enter a room: each join is authorised against the database
 * (project owner / team member), and every broadcast requires that the socket previously
 * joined the room and, for content updates, holds write access (viewers are read-only).
 *
 * Events:
 * - join-document / document-update / canvas-update
 * - join-slide / slide-update
 * - join-organization (presence)
 * - join-chat / leave-chat / chat:send
 *
 * Note: this service relays whole-content updates between clients; it does not run a
 * CRDT (Yjs) merge on the server.
 */

import { Server, Socket } from 'socket.io';
import { logger } from '../logger';
import { DecodedToken } from '../utils/jwt';
import {
    getDocumentRoomAccess,
    getSlideRoomAccess,
    getProjectRoomAccess,
    isOrganizationMember,
} from '../services/access.service';

const MAX_CHAT_LENGTH = 5000;

// ============================================================================
// State Management
// ============================================================================

/** Map socket ID to authenticated user */
const socketUsers: Map<string, DecodedToken> = new Map();
/** Map socket ID to the document/slide room it is in */
const socketRooms: Map<string, string> = new Map();
/** The room (if any) where this socket's user may also send updates (owner/admin/editor) */
const socketWritableRooms: Map<string, string> = new Map();
const socketOrgRooms: Map<string, string> = new Map();
/** socket -> chat rooms it was authorised to join */
const socketChatRooms: Map<string, Set<string>> = new Map();

// ============================================================================
// Helpers
// ============================================================================

const getOrgRoomName = (orgId: string) => `org:${orgId}`;
const getChatRoomName = (projectId: string) => `project:${projectId}:chat`;
const getSlideRoomName = (slideId: string) => `slide:${slideId}`;
const getDocumentRoomName = (documentId: string) => `document:${documentId}`;

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;

function authError(socket: Socket): void {
    socket.emit('error', { code: 'AUTH_ERROR', message: 'Not authenticated' });
}

function invalid(socket: Socket, message: string): void {
    socket.emit('error', { code: 'INVALID_PAYLOAD', message });
}

function deny(socket: Socket, message = 'You do not have access to this resource'): void {
    socket.emit('error', { code: 'FORBIDDEN', message });
}

function uniqueUsers(io: Server, roomName: string, withAvatar: boolean) {
    const users: any[] = [];
    const room = io.sockets.adapter.rooms.get(roomName);
    room?.forEach((socketId) => {
        const u = socketUsers.get(socketId);
        if (u) {
            users.push({
                userId: u.userId,
                email: u.email,
                name: u.name || u.email,
                ...(withAvatar ? { avatar: u.avatar } : {}),
            });
        }
    });
    // Same user may be connected from several tabs
    return Array.from(new Map(users.map((u) => [u.userId, u])).values());
}

function updatedBy(user: DecodedToken) {
    return { userId: user.userId, email: user.email, name: user.name || user.email };
}

// ============================================================================
// Socket Registration
// ============================================================================

/** Register a socket with user data after authentication */
export function registerSocket(socket: Socket, user: DecodedToken): void {
    socketUsers.set(socket.id, user);
}

// ============================================================================
// Organization presence
// ============================================================================

async function handleJoinOrganization(io: Server, socket: Socket, payload: { organizationId: string }): Promise<void> {
    const user = socketUsers.get(socket.id);
    if (!user) return authError(socket);

    const organizationId = payload?.organizationId;
    if (!isId(organizationId)) return invalid(socket, 'organizationId is required');

    if (!(await isOrganizationMember(organizationId, user.userId))) {
        return deny(socket, 'You are not a member of this organization');
    }

    const roomName = getOrgRoomName(organizationId);
    socket.join(roomName);
    socketOrgRooms.set(socket.id, roomName);

    logger.info(`User ${user.email} joined org ${organizationId}`);

    socket.to(roomName).emit('user-online', {
        userId: user.userId,
        email: user.email,
        name: user.name || user.email,
    });

    socket.emit('joined-organization', {
        organizationId,
        roomName,
        onlineUsers: uniqueUsers(io, roomName, false),
    });
}

// ============================================================================
// Chat
// ============================================================================

async function handleJoinChat(socket: Socket, payload: { projectId: string }): Promise<void> {
    const user = socketUsers.get(socket.id);
    if (!user) return authError(socket);

    const projectId = payload?.projectId;
    if (!isId(projectId)) return invalid(socket, 'projectId is required');

    const access = await getProjectRoomAccess(projectId, user.userId);
    if (!access.allowed) return deny(socket, 'You are not a member of this project');

    const roomName = getChatRoomName(projectId);
    socket.join(roomName);

    let chatRooms = socketChatRooms.get(socket.id);
    if (!chatRooms) {
        chatRooms = new Set();
        socketChatRooms.set(socket.id, chatRooms);
    }
    chatRooms.add(roomName);

    logger.info(`User ${user.email} joined chat for project ${projectId}`);
    socket.emit('joined-chat', { projectId, roomName });
}

function handleLeaveChat(socket: Socket, payload: { projectId: string }): void {
    const projectId = payload?.projectId;
    if (!isId(projectId)) return;
    const roomName = getChatRoomName(projectId);
    socket.leave(roomName);
    socketChatRooms.get(socket.id)?.delete(roomName);
}

function handleChatSend(
    io: Server,
    socket: Socket,
    payload: { projectId: string; message: { id: string; content: string; timestamp: string } }
): void {
    const user = socketUsers.get(socket.id);
    if (!user) return authError(socket);

    const { projectId, message } = payload || ({} as any);
    if (!isId(projectId) || !message || typeof message.content !== 'string' || message.content.length > MAX_CHAT_LENGTH) {
        return invalid(socket, 'projectId and a valid message are required');
    }

    const roomName = getChatRoomName(projectId);

    // Only sockets that were authorised to join this project's chat may broadcast into it
    if (!socketChatRooms.get(socket.id)?.has(roomName)) {
        return deny(socket, 'Join the project chat before sending messages');
    }

    // Sender identity comes from the verified token, never from the payload
    io.to(roomName).emit('message:new', {
        id: typeof message.id === 'string' ? message.id.slice(0, 64) : undefined,
        sender: {
            id: user.userId,
            name: user.name || user.email,
            avatar: user.avatar || null,
        },
        content: message.content,
        timestamp: new Date().toISOString(),
    });
}

// ============================================================================
// Documents / canvas
// ============================================================================

async function handleJoinDocument(io: Server, socket: Socket, payload: { documentId: string }): Promise<void> {
    const user = socketUsers.get(socket.id);
    if (!user) return authError(socket);

    const documentId = payload?.documentId;
    if (!isId(documentId)) return invalid(socket, 'documentId is required');

    const access = await getDocumentRoomAccess(documentId, user.userId);
    if (!access.allowed) return deny(socket);

    const roomName = getDocumentRoomName(documentId);

    const previousRoom = socketRooms.get(socket.id);
    if (previousRoom && previousRoom !== roomName) {
        socket.leave(previousRoom);
    }

    socket.join(roomName);
    socketRooms.set(socket.id, roomName);
    if (access.canWrite) socketWritableRooms.set(socket.id, roomName);
    else socketWritableRooms.delete(socket.id);

    logger.info(`User ${user.email} joined document ${documentId} (write: ${access.canWrite})`);

    socket.to(roomName).emit('user-joined-document', {
        userId: user.userId,
        email: user.email,
        name: user.name || user.email,
        avatar: user.avatar,
    });

    socket.emit('joined-document', {
        documentId,
        roomName,
        onlineUsers: uniqueUsers(io, roomName, true),
    });
}

function handleDocumentUpdate(socket: Socket, payload: { documentId: string; content: any }): void {
    const user = socketUsers.get(socket.id);
    if (!user) return authError(socket);

    const { documentId, content } = payload || ({} as any);
    if (!isId(documentId)) return invalid(socket, 'documentId is required');

    const roomName = getDocumentRoomName(documentId);
    if (socketWritableRooms.get(socket.id) !== roomName) {
        return deny(socket, 'You do not have write access to this document');
    }

    socket.to(roomName).emit('document-update', { documentId, content, updatedBy: updatedBy(user) });
}

function handleCanvasUpdate(socket: Socket, payload: { documentId: string; canvasData: string }): void {
    const user = socketUsers.get(socket.id);
    if (!user) return authError(socket);

    const { documentId, canvasData } = payload || ({} as any);
    if (!isId(documentId)) return invalid(socket, 'documentId is required');

    const roomName = getDocumentRoomName(documentId);
    if (socketWritableRooms.get(socket.id) !== roomName) {
        return deny(socket, 'You do not have write access to this canvas');
    }

    socket.to(roomName).emit('canvas-update', { documentId, canvasData, updatedBy: updatedBy(user) });
}

// ============================================================================
// Slides
// ============================================================================

async function handleJoinSlide(socket: Socket, payload: { slideId: string }): Promise<void> {
    const user = socketUsers.get(socket.id);
    if (!user) return authError(socket);

    const slideId = payload?.slideId;
    if (!isId(slideId)) return invalid(socket, 'slideId is required');

    const access = await getSlideRoomAccess(slideId, user.userId);
    if (!access.allowed) return deny(socket);

    const roomName = getSlideRoomName(slideId);
    const previousRoom = socketRooms.get(socket.id);
    if (previousRoom && previousRoom !== roomName) {
        socket.leave(previousRoom);
    }

    socket.join(roomName);
    socketRooms.set(socket.id, roomName);
    if (access.canWrite) socketWritableRooms.set(socket.id, roomName);
    else socketWritableRooms.delete(socket.id);

    logger.info(`User ${user.email} joined slide ${slideId} (write: ${access.canWrite})`);
    socket.emit('joined-slide', { slideId, roomName });
}

function handleSlideUpdate(socket: Socket, payload: { slideId: string; title?: string; content?: string }): void {
    const user = socketUsers.get(socket.id);
    if (!user) return authError(socket);

    const { slideId, title, content } = payload || ({} as any);
    if (!isId(slideId)) return invalid(socket, 'slideId is required');

    const roomName = getSlideRoomName(slideId);
    if (socketWritableRooms.get(socket.id) !== roomName) {
        return deny(socket, 'You do not have write access to this slide');
    }

    socket.to(roomName).emit('slide-update', { slideId, title, content, updatedBy: updatedBy(user) });
}

// ============================================================================
// Disconnect
// ============================================================================

function handleDisconnect(socket: Socket): void {
    const user = socketUsers.get(socket.id);
    const roomName = socketRooms.get(socket.id);
    const orgRoomName = socketOrgRooms.get(socket.id);

    if (roomName && roomName.startsWith('document:')) {
        socket.to(roomName).emit('user-left-document', { userId: user?.userId });
    }

    if (orgRoomName && user) {
        socket.to(orgRoomName).emit('user-offline', { userId: user.userId });
    }

    socketUsers.delete(socket.id);
    socketRooms.delete(socket.id);
    socketWritableRooms.delete(socket.id);
    socketOrgRooms.delete(socket.id);
    socketChatRooms.delete(socket.id);

    logger.info(`User ${user?.email || 'unknown'} disconnected`);
}

// ============================================================================
// Main Socket Handler Setup
// ============================================================================

export function setupSocketHandlers(io: Server, socket: Socket): void {
    // Join handlers hit the database; a failure must never crash the process
    const guard = (fn: () => Promise<void>) => {
        fn().catch((err) => {
            logger.error(`Socket handler error (${socket.id}):`, err);
            socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Request failed' });
        });
    };

    socket.on('join-document', (payload) => guard(() => handleJoinDocument(io, socket, payload)));
    socket.on('document-update', (payload) => handleDocumentUpdate(socket, payload));
    socket.on('join-slide', (payload) => guard(() => handleJoinSlide(socket, payload)));
    socket.on('slide-update', (payload) => handleSlideUpdate(socket, payload));
    socket.on('canvas-update', (payload) => handleCanvasUpdate(socket, payload));
    socket.on('join-organization', (payload) => guard(() => handleJoinOrganization(io, socket, payload)));
    socket.on('join-chat', (payload) => guard(() => handleJoinChat(socket, payload)));
    socket.on('leave-chat', (payload) => handleLeaveChat(socket, payload));
    socket.on('chat:send', (payload) => handleChatSend(io, socket, payload));
    socket.on('disconnect', () => handleDisconnect(socket));
}

// ============================================================================
// Shutdown
// ============================================================================

/** Graceful shutdown - drop in-memory connection state */
export async function shutdown(): Promise<void> {
    logger.info('Shutting down collab handler...');
    socketUsers.clear();
    socketRooms.clear();
    socketWritableRooms.clear();
    socketOrgRooms.clear();
    socketChatRooms.clear();
    logger.info('Collab handler shutdown complete');
}
