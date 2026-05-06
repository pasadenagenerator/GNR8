import { canShowContentDebug } from "@/src/public-site/content-debug-access";

export type PublicRouteDependencies = {
  canShowContentDebug: typeof canShowContentDebug;
};

const publicRouteDependencies: PublicRouteDependencies = {
  canShowContentDebug,
};

export function getPublicRouteDependencies(): PublicRouteDependencies {
  return publicRouteDependencies;
}

export function __setPublicRouteDependenciesForTest(overrides: Partial<PublicRouteDependencies>): () => void {
  const previous = { ...publicRouteDependencies };
  Object.assign(publicRouteDependencies, overrides);
  return () => {
    Object.assign(publicRouteDependencies, previous);
  };
}
