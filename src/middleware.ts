import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

const publicPaths = ["/login", "/forgot-password", "/reset-password"];
const publicApiPaths = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
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
    if (session.mustChangePassword && !pathname.startsWith("/api/auth/change-password")) {
      return NextResponse.json({ error: "Debe cambiar su contraseña" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (isPublic) {
    if (session && !session.mustChangePassword) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.mustChangePassword && !pathname.startsWith(changePasswordPath)) {
    return NextResponse.redirect(new URL(changePasswordPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
