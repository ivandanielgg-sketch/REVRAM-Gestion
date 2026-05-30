import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE, isLoginAllowedStatus } from "@/lib/session";
import { canAccessAdmin } from "@/lib/tenant";

const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
const publicApiPaths = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const isPublicApi = publicApiPaths.some((p) => pathname.startsWith(p));
  const changePasswordPath = "/change-password";

  if (pathname.startsWith("/api")) {
    if (isPublicApi) {
      return NextResponse.next();
    }
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (!isLoginAllowedStatus(session.status)) {
      return NextResponse.json({ error: "Cuenta no activa" }, { status: 403 });
    }
    if (session.mustChangePassword && !pathname.startsWith("/api/auth/change-password")) {
      return NextResponse.json({ error: "Debe cambiar su contraseña" }, { status: 403 });
    }
    if (pathname.startsWith("/api/admin") && !canAccessAdmin(session.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!canAccessAdmin(session.role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (session.mustChangePassword) {
      return NextResponse.redirect(new URL(changePasswordPath, request.url));
    }
    return NextResponse.next();
  }

  if (isPublic) {
    if (session && isLoginAllowedStatus(session.status) && !session.mustChangePassword) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isLoginAllowedStatus(session.status)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if (session.mustChangePassword && !pathname.startsWith(changePasswordPath)) {
    return NextResponse.redirect(new URL(changePasswordPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
