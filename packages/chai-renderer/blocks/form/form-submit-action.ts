"use server";

import { db, safeQuery, schema } from "@chaibuilder/next/actions";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface FormSubmissionData {
  formData: Record<string, JsonValue>;
  additionalData: Record<string, JsonValue>;
}

export async function formSubmit(data: FormSubmissionData) {
  try {
    const appKey = process.env.CHAIBUILDER_APP_KEY;

    if (!appKey) {
      console.error("CHAIBUILDER_APP_KEY not set");
      return { success: false };
    }

    const { formData, additionalData = {} } = data;

    const formName = (additionalData.formName as string) || "contact";
    const pageUrl = (additionalData.pageUrl as string) || "";

    if (typeof formName !== "string" || formName.length > 255) {
      console.error("Invalid formName");
      return { success: false };
    }

    const formSubmission = {
      app: appKey,
      formName,
      formData: formData as Record<string, unknown>,
      additionalData: additionalData as Record<string, unknown>,
      pageUrl,
    };

    const { error } = await safeQuery(() =>
      db.insert(schema.appFormSubmissions).values(formSubmission),
    );

    if (error) {
      console.error("Form submission error:", error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("Form submission error:", error);
    return { success: false };
  }
}
