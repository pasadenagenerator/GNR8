import { ValidationShellPage } from "@/app/validation/_components/validation-shell-page";
import { runValidationShellFriendSite01 } from "@/src/validation-shell/friend-site-01";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ValidationFriendSite01Page() {
  const response = await runValidationShellFriendSite01();

  return (
    <ValidationShellPage
      config={{
        fixtureId: "friend-site-01",
        fixtureRoute: "/validation/friend-site-01",
        fixtureApiRoute: "/api/validation/friend-site-01",
        otherFixtureId: "real-site-03",
        otherFixtureRoute: "/validation/real-site-03",
        otherFixtureApiRoute: "/api/validation/real-site-03",
      }}
      response={response}
    />
  );
}
