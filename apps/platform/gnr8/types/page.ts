import type { Gnr8Section } from "@/gnr8/types/section";

export type Gnr8Page = {
  id: string;
  slug: string;
  title?: string;
  sections: Gnr8Section[];
};

