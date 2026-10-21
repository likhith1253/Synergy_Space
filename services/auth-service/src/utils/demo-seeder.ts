import bcrypt from 'bcrypt';
import crypto from 'crypto';
// @ts-ignore - Local module resolution
import { createLogger } from '@packages/logger';

const logger = createLogger('auth-service-seeder');

export async function seedDemoWorkspace(prisma: any) {
    const DEMO_EMAIL = 'demo@realtimecollaborator.com';
    const DEMO_ORG_SLUG = 'demo-workspace';

    try {
        // 1. Clean or Upsert Core Tenant Isolation Boundary
        let org = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG } });
        if (!org) {
            org = await prisma.organization.create({
                data: {
                    name: 'Demo Corporate Workspace',
                    slug: DEMO_ORG_SLUG,
                    subscription_status: 'premium',
                    subscription_plan: 'enterprise'
                }
            });
        }

        // 2. Setup the Flagship Recruit Access User Profile
        let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
        // The demo account is only reachable through /demo-login (which issues a token directly).
        // Its password is random and never disclosed, so it cannot be used with /login.
        const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

        if (user) {
            // Rotate any previously seeded well-known password
            await prisma.user.update({ where: { id: user.id }, data: { password_hash: hashedPassword } });
        } else {
            user = await prisma.user.create({
                data: {
                    email: DEMO_EMAIL,
                    password_hash: hashedPassword,
                    full_name: 'Guest Recruiter',
                    role: 'owner',
                    organization_id: org.id,
                    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=recruiter'
                }
            });

            await prisma.organizationMember.upsert({
                where: { organization_id_user_id: { organization_id: org.id, user_id: user.id } },
                update: { role: 'admin' },
                create: { organization_id: org.id, user_id: user.id, role: 'admin' }
            });
        }

        // 3. Clear out old demo data pools in exact foreign key dependency order
        await prisma.message.deleteMany({ where: { sender_id: user.id } });
        await prisma.teamMember.deleteMany({ where: { user_id: user.id } });
        await prisma.slide.deleteMany({ where: { presentation: { project: { owner_id: user.id } } } });
        await prisma.presentation.deleteMany({ where: { project: { owner_id: user.id } } });
        await prisma.canvas.deleteMany({ where: { project: { owner_id: user.id } } });
        await prisma.documentVersion.deleteMany({ where: { document: { owner_id: user.id } } });
        await prisma.document.deleteMany({ where: { owner_id: user.id } });
        await prisma.project.deleteMany({ where: { owner_id: user.id } });

        // 4. Create Flagship Portfolios / Workspaces
        const internalProject = await prisma.project.create({
            data: {
                name: '🚀 Project Apollo - Core System Platform',
                description: 'The master architecture mapping for our real-time collaboration engines and microservice configurations.',
                organization_id: org.id,
                created_by: user.id,
                owner_id: user.id
            }
        });

        const marketingProject = await prisma.project.create({
            data: {
                name: '🎨 Creative Assets & Q3 Strategy',
                description: 'Workspace focusing on canvas designs, interactive slides, and client feedback cycles.',
                organization_id: org.id,
                created_by: user.id,
                owner_id: user.id
            }
        });

        // 5. Populate Project 1 with a Real-Time Document
        const activeDoc = await prisma.document.create({
            data: {
                title: 'System Architecture Specification.md',
                project_id: internalProject.id,
                owner_id: user.id,
                yjs_binary_state: Buffer.from([0x00])
            }
        });

        await prisma.documentVersion.create({
            data: {
                document_id: activeDoc.id,
                name: 'v1.0.0 Base Release Template',
                snapshot_binary: Buffer.from([0x00]),
                created_by: user.id
            }
        });

        // 6. Populate Project 2 with an Interactive Presentation
        const deck = await prisma.presentation.create({
            data: {
                project_id: marketingProject.id,
                title: 'Q3 Enterprise Growth Pitch Deck',
                template: 'modern-dark'
            }
        });

        await prisma.slide.createMany({
            data: [
                {
                    presentation_id: deck.id,
                    title: 'Executive Vision Statement',
                    content: JSON.stringify({ bulletPoints: ['Scale up microservices to 10M requests.', 'Isolate workspaces across clean organizational boundaries.'] }),
                    order: 0
                },
                {
                    presentation_id: deck.id,
                    title: 'Core Product Capabilities',
                    content: JSON.stringify({ bulletPoints: ['Yjs text consistency matching framework.', 'Dynamic API gateway request routing logic.'] }),
                    order: 1
                }
            ]
        });

        // 7. Populate Project 2 with a Live Interactive Canvas Board
        await prisma.canvas.create({
            data: {
                project_id: marketingProject.id,
                name: 'System Components Flowchart',
                data: JSON.stringify({
                    nodes: [
                        { id: '1', type: 'input', data: { label: 'Vercel Next.js App' }, position: { x: 250, y: 25 } },
                        { id: '2', data: { label: 'API Gateway (Express)' }, position: { x: 250, y: 125 } },
                        { id: '3', data: { label: 'Auth Microservice' }, position: { x: 100, y: 250 } },
                        { id: '4', data: { label: 'Document Microservice' }, position: { x: 400, y: 250 } }
                    ],
                    edges: [
                        { id: 'e1-2', source: '1', target: '2', animated: true },
                        { id: 'e2-3', source: '2', target: '3' },
                        { id: 'e2-4', source: '2', target: '4' }
                    ]
                })
            }
        });

        // 8. Inject mock team chat dialogue records
        await prisma.message.createMany({
            data: [
                {
                    project_id: internalProject.id,
                    sender_id: user.id,
                    content: "Welcome to the real-time reviewer tracking suite. All endpoints match production service standards perfectly!"
                },
                {
                    project_id: marketingProject.id,
                    sender_id: user.id,
                    content: "Take a look at the interactive presentation module and the layout flowchart attached below."
                }
            ]
        });

        logger.info('Demo workspace seeded successfully');
    } catch (error: any) {
        logger.error(`Demo workspace seeding failed: ${error.message}`);
        throw { success: false, error: 'Failed to seed demo workspace' };
    }
}