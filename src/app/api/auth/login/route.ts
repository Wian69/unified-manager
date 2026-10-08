import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const validUser = "adm_wian@eqncs.com";
        const validPassword = process.env.ADMIN_PASSWORD || "Admin@1649";

        if (body.email === validUser && body.password === validPassword) {
            // Set cookie for 30 days so they don't have to sign in every 8 hours!
            const cookieStore = await cookies();
            cookieStore.set("eqn-admin-auth", validPassword, { 
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production"
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
