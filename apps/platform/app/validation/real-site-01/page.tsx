import { ValidationShellPage } from "@/app/validation/_components/validation-shell-page";
import { runValidationShellRealSite01 } from "@/src/validation-shell/real-site-01";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ValidationRealSite01Page() {
  const response = await runValidationShellRealSite01();

  return (
    <ValidationShellPage
      config={{
        fixtureId: "real-site-01",
        fixtureRoute: "/validation/real-site-01",
        fixtureApiRoute: "/api/validation/real-site-01",
        otherFixtureId: "real-site-02",
        otherFixtureRoute: "/validation/real-site-02",
        otherFixtureApiRoute: "/api/validation/real-site-02",
      }}
      response={response}
    />
  );
}
