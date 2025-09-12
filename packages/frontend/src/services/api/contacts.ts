import { apiClient } from './';
import type { ContactPerson } from '@medical-crm/shared';

// Assuming these types will be defined in the shared package
interface ContactCreateRequest extends Omit<ContactPerson, 'id' | 'createdAt' | 'updatedAt'> {}
interface ContactUpdateRequest extends Partial<ContactCreateRequest> {}

export const contactsApi = {
  getAll: (params?: any) => {
    const urlParams = new URLSearchParams(params).toString();
    return apiClient.get<{ data: ContactPerson[], pagination: any }>(`/contacts?${urlParams}`);
  },
  getById: (id: string) => apiClient.get<{ data: ContactPerson }>(`/contacts/${id}`),
  create: (data: ContactCreateRequest) => apiClient.post<{ data: ContactPerson }>('/contacts', data),
  update: (id: string, data: ContactUpdateRequest) => apiClient.put<{ data: ContactPerson }>(`/contacts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/contacts/${id}`),
};
