import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return true;
  }

  if (pathname === "/login" || pathname === "/signup") {
    return true;
  }

  if (
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/sms-terms"
  ) {
    return true;
  }

  if (pathname.startsWith("/auth")) {
    return true;
  }

  if (
    pathname === "/camp-nackte/waiver" ||
    pathname === "/camp-nackte/waiver/submit" ||
    pathname === "/camp-nackte/waiver/lookup" ||
    pathname === "/camp-nackte/waiver/thank-you"
    || pathname.startsWith("/camp-nackte/waiver/pdf/")
  ) {
    return true;
  }

  if (pathname.startsWith("/participant/")) {
    return true;
  }

  if (pathname.startsWith("/register/")) {
    return true;
  }

  return /\.[^/]+$/.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user.app_metadata?.requires_password_change === true && pathname !== "/settings") {
    const settingsUrl = new URL("/settings", request.url);
    settingsUrl.searchParams.set("password", "required");
    return NextResponse.redirect(settingsUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
