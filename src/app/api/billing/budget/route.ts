import { NextResponse } from 'next/server';
import { getItBudget, saveItBudget } from '@/lib/db';

export async function GET() {
    try {
        const budget = await getItBudget();
        return NextResponse.json(budget, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        await saveItBudget(data);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
