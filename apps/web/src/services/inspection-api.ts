import type { InspectionListItemDto, InspectionReviewDto } from "@/domain/inspection-view";
import { httpClient, type HttpClient } from "@/services/http";

type ListResponse = { ok: boolean; inspections: InspectionListItemDto[] };
type DetailResponse = { ok: boolean; inspection: InspectionReviewDto };
type CreateResponse = { ok: boolean; inspection: { id: string; title: string; location: string | null } };
type UploadResponse = { ok: boolean; inspectionId: string };

export class InspectionApiService {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<InspectionListItemDto[]> {
    return this.http.get<ListResponse>("/api/inspections").then((res) => res.inspections);
  }

  getById(id: string): Promise<InspectionReviewDto> {
    return this.http.get<DetailResponse>(`/api/inspections/${id}`).then((res) => res.inspection);
  }

  create(data: { title: string; location?: string }): Promise<{ id: string }> {
    return this.http.post<CreateResponse>("/api/inspections", data).then((res) => res.inspection);
  }

  uploadImages(inspectionId: string, files: File[]): Promise<UploadResponse> {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return this.http.post<UploadResponse>(`/api/inspections/${inspectionId}/images`, form);
  }

  pdfUrl(inspectionId: string): string {
    return `/api/inspections/${inspectionId}/pdf`;
  }
}

export const inspectionApi = new InspectionApiService(httpClient);
