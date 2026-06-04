import { getMigrationBatchDetailViewModel } from "../../_lib/migration-batches-service";
import { MigrationBatchDetailView } from "../_components/migration-batches-views";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function CommandCenterMigrationBatchDetailPage(props: PageProps) {
  const { batchId } = await props.params;
  const model = await getMigrationBatchDetailViewModel(batchId);
  return <MigrationBatchDetailView model={model} />;
}
