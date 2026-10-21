import { createFakePrisma } from './fake-prisma';

/** Single shared fake used by the jest.mock factory in each test file. */
export const db = createFakePrisma();
