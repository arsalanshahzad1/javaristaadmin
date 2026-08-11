import { useQuery } from '@tanstack/react-query';
import { storesApi } from '../../api/stores.api';
import { useAuth } from '../../hooks/useAuth';
import { StoreDetailPage } from './StoreDetailPage';

export function MyStorePage() {
  const { user } = useAuth();

  const { data: stores, isLoading } = useQuery({
    queryKey: ['my-store', user?.storeId],
    queryFn: () => storesApi.getAll(),
    enabled: Boolean(user?.storeId),
  });

  if (!user?.storeId) {
    return (
      <div className="p-6 text-center text-[#666]">
        You are not currently assigned to a store. Contact an administrator.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-48 bg-[#1A1A1A] rounded-xl animate-pulse" />
      </div>
    );
  }

  const myStore = stores?.[0];
  if (!myStore) {
    return <div className="p-6 text-center text-[#666]">Store not found.</div>;
  }

  return <StoreDetailPage idOverride={myStore._id} hideBackButton />;
}
