import { auth } from "@/auth";

export default auth((req) => {
  // No redirect needed for now — we handle auth state on the client side
  // This middleware just ensures the session is available
});

export const config = {
  matcher: ["/api/user/status"],
};
