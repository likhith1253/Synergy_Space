import jwt from 'jsonwebtoken';
import { config } from '../config';
import { TokenPayload } from '@packages/types';

export const verifyAccessToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as TokenPayload;
    } catch (error) {
        return null;
    }
};
