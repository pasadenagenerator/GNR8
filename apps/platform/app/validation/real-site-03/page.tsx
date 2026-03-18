import { ValidationShellPage } from "@/app/validation/_components/validation-shell-page";
import { runValidationShellRealSite03 } from "@/src/validation-shell/real-site-03";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ValidationRealSite03Page() {
  const response = await runValidationShellRealSite03();

  return (
    <ValidationShellPage
      config={{
        fixtureId: "real-site-03",
        fixtureRoute: "/validation/real-site-03",
        fixtureApiRoute: "/api/validation/real-site-03",
        otherFixtureId: "real-site-02",
        otherFixtureRoute: "/validation/real-site-02",
        otherFixtureApiRoute: "/api/validation/real-site-02",
      }}
      response={response}
    />
  );
}
