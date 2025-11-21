// DTO and interface definitions for Account Type operations.
// Placed in types/ to keep request/response contracts isolated from business logic.
export interface AccountTypeCreateDTO {
  code: string; // Must be the fixed numeric prefix (e.g., '1') or new custom code
  name: string; // Human readable category name
  description?: string;
}

export interface AccountTypeResponseDTO {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  created_at: Date;
}
