import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { verifyCustomerSession, CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Admin route guard (/manage/*, /api/admin/*) ───────────────────────────
  if (pathname.startsWith("/manage") || pathname.startsWith("/api/admin")) {
    // Login page itself and login API route are unprotected
    if (pathname === "/manage" || pathname === "/api/admin/auth") {
      return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/manage", request.url));
    }

    const session = await verifySession(token);
    if (!session) {
      if (pathname.startsWith("/api/")) {
        const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        response.cookies.delete(SESSION_COOKIE);
        return response;
      }
      const response = NextResponse.redirect(new URL("/manage", request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-admin-id", session.adminId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Customer route guard (/orders/*, /confirm-order, /api/addresses/*) ─────
  const isCustomerRoute =
    pathname.startsWith("/orders") ||
    pathname === "/confirm-order" ||
    pathname.startsWith("/api/addresses");

  if (isCustomerRoute) {
    const token = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const session = await verifyCustomerSession(token);
    if (!session) {
      if (pathname.startsWith("/api/")) {
        const response = NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        response.cookies.delete(CUSTOMER_SESSION_COOKIE);
        return response;
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(CUSTOMER_SESSION_COOKIE);
      return response;
    }

    // Inject customer ID for downstream API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-customer-id", session.userId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/manage/:path*",
    "/api/admin/:path*",
    "/orders/:path*",
    "/confirm-order",
    "/api/addresses/:path*",
  ],
};
