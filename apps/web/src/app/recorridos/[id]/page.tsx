import { notFound } from "next/navigation";
import { InspectionReview } from "@/components/inspection-review";
import { createAppContainer } from "@/di/providers";
import { TOKENS } from "@/di/tokens";
import { toInspectionReviewDto } from "@/domain/inspection-view";
import type { InspectionRepository } from "@/domain/ports";

export const dynamic = "force-dynamic";

export default async function RecorridoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const container = createAppContainer();
  const inspections = container.resolve<InspectionRepository>(TOKENS.InspectionRepository);
  const detail = await inspections.findDetail(id);

  if (!detail) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <InspectionReview inspection={toInspectionReviewDto(detail)} />
    </main>
  );
}
