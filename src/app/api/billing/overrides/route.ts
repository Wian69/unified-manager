import { NextResponse } from 'next/server';
import { getUserRegionOverrides, saveUserRegionOverrides } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const overrides = await getUserRegionOverrides();
        return NextResponse.json(overrides);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userEmail, regionName } = await request.json();
        
        if (!userEmail) {
            return NextResponse.json({ error: 'userEmail is required' }, { status: 400 });
        }

        const overrides = await getUserRegionOverrides();
        
        if (regionName === null || regionName === '') {
            delete overrides[userEmail];
        } else {
            overrides[userEmail] = regionName;
        }

        await saveUserRegionOverrides(overrides);
        
        return NextResponse.json({ success: true, overrides });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
