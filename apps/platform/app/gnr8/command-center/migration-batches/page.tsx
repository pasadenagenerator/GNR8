import { getMigrationBatchListViewModel } from "../_lib/migration-batches-service";
import { MigrationBatchListView } from "./_components/migration-batches-views";

export default async function CommandCenterMigrationBatchesPage() {
  const model = await getMigrationBatchListViewModel();
  return <MigrationBatchListView model={model} />;
}
