import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FORMS = [
    {
        id: 'ec7c28b2-d2bc-4d99-8550-499f385fd58d',
        name: 'IT Support Tickets',
        description: 'Manage IT support tickets and requests.'
    },
    {
        id: '8c0749f4-065c-425f-a7d8-c3f3eb7ae592',
        name: 'New User add',
        description: 'New user onboarding and account requests.'
    }
];

export async function GET() {
    return NextResponse.json({
        forms: FORMS
    });
}
