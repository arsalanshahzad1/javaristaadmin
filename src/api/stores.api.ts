import adminApiClient from './adminApiClient';

export interface StoreAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  coordinates?: { lat: number; lng: number };
}

export interface OperatingHour {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export type StoreStatus = 'planning' | 'construction' | 'open' | 'temporarily_closed' | 'closed';
export type StoreType = 'flagship' | 'kiosk' | 'drive-thru' | 'standard';

export interface Store {
  _id: string;
  name: string;
  storeNumber: string;
  address: StoreAddress;
  regionId?: string;
  status: StoreStatus;
  openedAt?: string;
  expectedOpenDate?: string;
  managerId?: { _id: string; name: string; email: string } | null;
  photos: string[];
  coverPhoto?: string;
  phone?: string;
  email?: string;
  operatingHours?: OperatingHour[];
  storeType: StoreType;
  isActive: boolean;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStorePayload {
  name: string;
  storeNumber: string;
  address: StoreAddress;
  status?: StoreStatus;
  expectedOpenDate?: string;
  managerId?: string;
  phone?: string;
  email?: string;
  coverPhoto?: string;
  storeType?: StoreType;
  isActive?: boolean;
}

export const storesApi = {
  getAll: async (): Promise<Store[]> => {
    const res = await adminApiClient.get<{ data: Store[] }>('/stores');
    return res.data.data;
  },

  getById: async (id: string): Promise<Store> => {
    const res = await adminApiClient.get<{ data: Store }>(`/stores/${id}`);
    return res.data.data;
  },

  create: async (payload: CreateStorePayload): Promise<Store> => {
    const res = await adminApiClient.post<{ data: Store }>('/stores', payload);
    return res.data.data;
  },

  update: async (id: string, payload: Partial<CreateStorePayload>): Promise<Store> => {
    const res = await adminApiClient.put<{ data: Store }>(`/stores/${id}`, payload);
    return res.data.data;
  },

  deactivate: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/stores/${id}`);
  },

  addPhoto: async (id: string, file: File): Promise<Store> => {
    const form = new FormData();
    form.append('photo', file);
    const res = await adminApiClient.post<{ data: Store }>(`/stores/${id}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  removePhoto: async (id: string, photoUrl: string): Promise<Store> => {
    const res = await adminApiClient.delete<{ data: Store }>(`/stores/${id}/photos`, {
      data: { photoUrl },
    });
    return res.data.data;
  },
};
