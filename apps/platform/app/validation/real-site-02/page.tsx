import { ValidationShellPage } from "@/app/validation/_components/validation-shell-page";
import { runValidationShellRealSite02 } from "@/src/validation-shell/real-site-02";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ValidationRealSite02Page() {
  const response = await runValidationShellRealSite02();

  return (
    <ValidationShellPage
      config={{
        fixtureId: "real-site-02",
        fixtureRoute: "/validation/real-site-02",
        fixtureApiRoute: "/api/validation/real-site-02",
        otherFixtureId: "real-site-01",
        otherFixtureRoute: "/validation/real-site-01",
        otherFixtureApiRoute: "/api/validation/real-site-01",
      }}
      response={response}
    />
  );
}
