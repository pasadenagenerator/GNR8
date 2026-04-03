import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import CommandCenterLayout from "./CommandCenterLayout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  children: ReactNode;
};

export default async function CommandCenterRouteLayout(props: Props) {
  try {
    await requireSuperadminUserIdForPage();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Unauthorized") {
      redirect("/login");
    }
    if (message.startsWith("Forbidden")) {
      redirect("/superadmin");
    }
    throw error;
  }

  return <CommandCenterLayout>{props.children}</CommandCenterLayout>;
}
