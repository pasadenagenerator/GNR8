import { registerChaiPageType } from "@chaibuilder/next/runtime";
import { BlogPageType } from "./blog";

export const registerPageTypes = () => {
  registerChaiPageType(BlogPageType.key, BlogPageType);
};
