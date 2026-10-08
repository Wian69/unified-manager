import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const url = req.nextUrl;
    
    // Allow public routes
    if (
        url.pathname.startsWith("/support") ||
        url.pathname.startsWith("/reply") ||
        url.pathname.startsWith("/sharepoint/agree") ||
        url.pathname.startsWith("/api/support") ||
        url.pathname.startsWith("/api/reply") ||
        url.pathname.startsWith("/_next") ||
        url.pathname.includes("favicon")
    ) {
        return NextResponse.next();
    }

    const basicAuth = req.headers.get("authorization");
    
    if (basicAuth) {
        const authValue = basicAuth.split(" ")[1];
        const [user, pwd] = atob(authValue).split(":");

        const validUser = "adm_wian@eqncs.com";
        const validPassword = process.env.ADMIN_PASSWORD || "Admin@1649";

        if (user === validUser && pwd === validPassword) {
            return NextResponse.next();
        }
    }

    url.pathname = "/api/auth";

    return new NextResponse("Auth required", {
        status: 401,
        headers: {
            "WWW-Authenticate": 'Basic realm="Secure Area"'
        }
    });
}
