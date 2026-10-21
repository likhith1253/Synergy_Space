/**
 * Slide Service
 * Business logic for slide management
 */

import { PrismaClient } from '@collab/database';
import { requirePresentationAccess, requireSlideAccess } from './access.service';

const prisma = new PrismaClient();

/**
 * Create a new slide
 */
export async function createSlide(
    presentationId: string,
    title: string,
    content: string,
    userId: string
) {
    await requirePresentationAccess(presentationId, userId, 'write');

    // Get the current max order to append the new slide
    const lastSlide = await prisma.slide.findFirst({
        where: { presentation_id: presentationId },
        orderBy: { order: 'desc' },
        take: 1
    });

    const newOrder = lastSlide ? lastSlide.order + 1 : 1;

    const slide = await prisma.slide.create({
        data: {
            presentation_id: presentationId,
            title,
            content,
            order: newOrder
        }
    });

    return slide;
}

/**
 * List slides for a presentation
 */
export async function listSlides(presentationId: string, userId: string) {
    await requirePresentationAccess(presentationId, userId, 'read');

    const slides = await prisma.slide.findMany({
        where: { presentation_id: presentationId },
        orderBy: { order: 'asc' }
    });

    return slides;
}

/**
 * Update a slide
 */
export async function updateSlide(
    slideId: string,
    userId: string,
    data: { title?: string; content?: string; order?: number }
) {
    const { slide } = await requireSlideAccess(slideId, userId, 'write');

    const updatedSlide = await prisma.slide.update({
        where: { id: slideId },
        data: {
            ...data,
            updated_at: new Date()
        }
    });

    return updatedSlide;
}

/**
 * Delete a slide
 */
export async function deleteSlide(slideId: string, userId: string) {
    const { slide } = await requireSlideAccess(slideId, userId, 'write');

    await prisma.slide.delete({
        where: { id: slideId }
    });

    return { success: true };
}

/**
 * Get a single slide
 */
export async function getSlide(slideId: string, userId: string) {
    const { slide } = await requireSlideAccess(slideId, userId, 'read');

    return slide;
}
