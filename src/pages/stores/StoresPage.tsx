import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Pencil, Eye } from 'lucide-react';
import { storesApi, type Store, type StoreStatus } from '../../api/stores.api';
import { StoreFormModal } from './StoreFormModal';

const STATUS_STYLES: Record<StoreStatus, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'bg-[#2A2A2A] text-[#999]' },
  construction: { label: 'Construction', className: 'bg-amber-900/30 text-amber-400' },
  open: { label: 'Open', className: 'bg-green-900/30 text-green-400' },
  temporarily_closed: { label: 'Temp. Closed', className: 'bg-orange-900/30 text-orange-400' },
  closed: { label: 'Closed', className: 'bg-red-900/30 text-red-400' },
};

function StatusBadge({ status }: { status: StoreStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.planning;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

export function StoresPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setModalOpen(true);
  };

  const handleNewStore = () => {
    setEditingStore(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingStore(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Stores</h1>
          <p className="text-sm text-[#666] mt-1">Manage Java Times Caffè locations</p>
        </div>
        <button
          onClick={handleNewStore}
          className="flex items-center gap-2 px-4 py-2 bg-[#D62B2B] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Store
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#1A1A1A] rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#555]">
          <Building2 size={48} className="mb-4" />
          <p className="text-lg font-medium text-[#777]">No stores yet</p>
          <p className="text-sm mt-1">Create the first Java Times Caffè location</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <StoreCard
              key={store._id}
              store={store}
              onEdit={() => handleEdit(store)}
              onView={() => navigate(`/stores/${store._id}`)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <StoreFormModal
          store={editingStore}
          onClose={handleModalClose}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            handleModalClose();
          }}
        />
      )}
    </div>
  );
}

function StoreCard({
  store,
  onEdit,
  onView,
}: {
  store: Store;
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden flex flex-col">
      {/* Cover photo */}
      <div className="h-36 bg-[#141414] relative overflow-hidden flex-shrink-0">
        {store.coverPhoto ? (
          <img src={store.coverPhoto} alt={store.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 size={40} className="text-[#333]" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={store.status} />
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-white leading-tight">{store.name}</h3>
          <span className="text-xs text-[#555] bg-[#242424] px-1.5 py-0.5 rounded font-mono flex-shrink-0">
            #{store.storeNumber}
          </span>
        </div>

        <p className="text-xs text-[#666] mb-2">
          {[store.address.city, store.address.country].filter(Boolean).join(', ') || 'No address'}
        </p>

        {store.managerId && (
          <p className="text-xs text-[#555] mb-2">
            Manager: <span className="text-[#999]">{store.managerId.name}</span>
          </p>
        )}

        {typeof store.employeeCount === 'number' && (
          <p className="text-xs text-[#555] mb-3">
            {store.employeeCount} employee{store.employeeCount !== 1 ? 's' : ''}
          </p>
        )}

        <div className="mt-auto flex gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#ccc] hover:text-white bg-[#242424] hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            onClick={onView}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#ccc] hover:text-white bg-[#242424] hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <Eye size={12} />
            View
          </button>
        </div>
      </div>
    </div>
  );
}
