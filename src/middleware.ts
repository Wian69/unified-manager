import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const url = req.nextUrl;
    
    // Allow public routes
    if (
        url.pathname.startsWith("/login") ||
        url.pathname.startsWith("/support") ||
        url.pathname.startsWith("/reply") ||
        url.pathname.startsWith("/sharepoint/agree") ||
        url.pathname.startsWith("/api/auth") ||
        url.pathname.startsWith("/api/support") ||
        url.pathname.startsWith("/api/reply") ||
        url.pathname.startsWith("/_next") ||
        url.pathname.includes("favicon")
    ) {
        return NextResponse.next();
    }

    const token = req.cookies.get("eqn-admin-auth");
    const validToken = process.env.ADMIN_PASSWORD || "Admin@1649";

    if (token && token.value === validToken) {
        return NextResponse.next();
    }

    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
