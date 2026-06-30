import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, ChevronUp, ExternalLink, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { orgApi } from '../../api/org.api';
import adminApiClient from '../../api/adminApiClient';
import { OrgNode } from '../../components/org/OrgNode';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import type { SubtreeNode, OrgUser } from '../../types/org';
import type { User, PaginatedResponse } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function filterTree(node: SubtreeNode, q: string): SubtreeNode | null {
  if (!q) return node;
  const matches = node.user.name.toLowerCase().includes(q.toLowerCase());
  const filteredReports = node.directReports
    .map((r) => filterTree(r, q))
    .filter(Boolean) as SubtreeNode[];
  if (matches || filteredReports.length > 0) {
    return { ...node, directReports: filteredReports };
  }
  return null;
}

function findNode(nodes: SubtreeNode[], id: string): SubtreeNode | null {
  for (const n of nodes) {
    if (n.user._id === id) return n;
    const found = findNode(n.directReports, id);
    if (found) return found;
  }
  return null;
}

// ── Side Panel ────────────────────────────────────────────────────────────────

interface SidePanelProps {
  node: SubtreeNode;
  allNodes: SubtreeNode[];
  onClose: () => void;
  onManagerUpdated: () => void;
}

function SidePanel({ node, allNodes, onClose, onManagerUpdated }: SidePanelProps) {
  const navigate = useNavigate();
  const [managerQuery, setManagerQuery] = useState('');
  const [selectedManager, setSelectedManager] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user } = node;

  const { data: managerResults, isFetching: searchingManagers } = useQuery({
    queryKey: ['org-user-search', managerQuery],
    queryFn: async () => {
      if (!managerQuery.trim()) return [];
      const res = await adminApiClient.get<PaginatedResponse<User>>('/admin/users', {
        params: { search: managerQuery, limit: 10 },
      });
      return res.data.data;
    },
    enabled: managerQuery.trim().length > 0,
    staleTime: 10_000,
  });

  const setManagerMutation = useMutation({
    mutationFn: ({ managerId }: { managerId: string | null }) =>
      orgApi.setUserManager(user._id, managerId),
    onSuccess: () => {
      toast.success('Manager updated.');
      setSelectedManager(null);
      setManagerQuery('');
      onManagerUpdated();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Failed to update manager.';
      toast.error(msg);
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Find current manager node in the tree (any ancestor at depth-1)
  const currentManagerNode = useMemo(() => {
    // Search the whole tree for a node that has this user in directReports
    function findParent(nodes: SubtreeNode[], targetId: string): OrgUser | null {
      for (const n of nodes) {
        if (n.directReports.some((r) => r.user._id === targetId)) return n.user;
        const found = findParent(n.directReports, targetId);
        if (found) return found;
      }
      return null;
    }
    return findParent(allNodes, user._id);
  }, [allNodes, user._id]);

  const PURPLE_ROLES = ['ceo', 'owner', 'coo', 'cfo'];
  const BLUE_ROLES = ['area_manager', 'regional_manager', 'hr_manager', 'marketing_manager'];
  const GREEN_ROLES = ['store_manager', 'assistant_manager', 'shift_supervisor'];
  const scoreColor =
    (user.javaRistaScore ?? 0) >= 80
      ? 'bg-green-900/30 text-green-400'
      : (user.javaRistaScore ?? 0) >= 60
      ? 'bg-amber-900/30 text-amber-400'
      : 'bg-red-900/30 text-red-400';

  const roleBorder = PURPLE_ROLES.includes(user.role)
    ? 'border-purple-500'
    : BLUE_ROLES.includes(user.role)
    ? 'border-blue-500'
    : GREEN_ROLES.includes(user.role)
    ? 'border-green-500'
    : 'border-gray-500';

  return (
    <div className="w-80 flex-shrink-0 bg-[#1A1A1A] border-l border-[#2A2A2A] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-semibold text-white">Employee Details</h3>
        <button
          onClick={onClose}
          className="text-[#555] hover:text-white transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* User card */}
        <div className={`p-4 rounded-xl border border-[#2A2A2A] border-l-4 ${roleBorder} bg-[#242424]`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-white text-base leading-tight">{user.name}</p>
              <p className="text-[#666] text-xs mt-1 capitalize">{user.role.replace(/_/g, ' ')}</p>
              {user.storeId && (
                <p className="text-[#444] text-xs mt-0.5">Store: {user.storeId}</p>
              )}
            </div>
            {user.javaRistaScore != null && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold flex-shrink-0 ${scoreColor}`}>
                {user.javaRistaScore.toFixed(0)}
              </span>
            )}
          </div>
        </div>

        {/* View full profile */}
        <button
          onClick={() => navigate(`/team-performance/employee/${user._id}`)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#2A2A2A]
            text-[#888] hover:text-white hover:border-[#444] text-sm transition-colors cursor-pointer"
        >
          <ExternalLink size={14} />
          View Full Profile
        </button>

        {/* Change Manager section */}
        <div>
          <p className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
            Manager
          </p>

          {/* Current manager */}
          <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-[#242424] border border-[#2A2A2A]">
            <div className="w-7 h-7 rounded-full bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-[#888]">
                {currentManagerNode ? currentManagerNode.name[0].toUpperCase() : '?'}
              </span>
            </div>
            <p className="text-sm text-white flex-1 truncate">
              {currentManagerNode ? currentManagerNode.name : (
                <span className="text-[#555] italic">No manager assigned</span>
              )}
            </p>
          </div>

          {/* Manager search */}
          <div className="relative mb-3" ref={dropdownRef}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                placeholder="Search for new manager…"
                value={selectedManager ? selectedManager.name : managerQuery}
                onChange={(e) => {
                  setManagerQuery(e.target.value);
                  setSelectedManager(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-[#242424] border border-[#2A2A2A] rounded-lg pl-8 pr-3 py-2
                  text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#D62B2B]"
              />
              {(searchingManagers) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </span>
              )}
            </div>
            {showDropdown && managerResults && managerResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg
                shadow-xl max-h-48 overflow-y-auto">
                {managerResults.map((u) => (
                  <button
                    key={u._id}
                    className="w-full text-left px-3 py-2 hover:bg-[#242424] transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedManager(u);
                      setManagerQuery('');
                      setShowDropdown(false);
                    }}
                  >
                    <p className="text-sm text-white">{u.name}</p>
                    <p className="text-xs text-[#555] capitalize">{u.role.replace(/_/g, ' ')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              fullWidth
              onClick={() => selectedManager && setManagerMutation.mutate({ managerId: selectedManager._id })}
              disabled={!selectedManager || setManagerMutation.isPending}
              loading={setManagerMutation.isPending}
            >
              Update
            </Button>
            {currentManagerNode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm('Remove the current manager from this employee?')) {
                    setManagerMutation.mutate({ managerId: null });
                  }
                }}
                disabled={setManagerMutation.isPending}
                loading={setManagerMutation.isPending}
                title="Remove current manager"
              >
                <UserX size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

/**
 * Full-org chart page with real-time search filtering, expand/collapse all,
 * root-user subtree zooming, and a side panel for per-node management.
 */
export function OrgChartPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [rootUserId, setRootUserId] = useState<string | undefined>();
  const [rootOptions, setRootOptions] = useState<OrgUser[]>([]);
  const [expandSignal, setExpandSignal] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [panelUserId, setPanelUserId] = useState<string | null>(null);

  const { data: chart = [], isLoading, error } = useQuery({
    queryKey: ['org-chart', rootUserId],
    queryFn: () => orgApi.getOrgChart(rootUserId),
    staleTime: 60_000,
  });

  // Populate root options from the initial full-org fetch
  useEffect(() => {
    if (!rootUserId && chart.length > 0) {
      setRootOptions(chart.map((n) => n.user));
    }
  }, [chart, rootUserId]);

  const filteredChart = useMemo(() => {
    if (!search.trim()) return chart;
    return chart.map((n) => filterTree(n, search)).filter(Boolean) as SubtreeNode[];
  }, [chart, search]);

  const panelNode = useMemo(
    () => (panelUserId ? findNode(chart, panelUserId) : null),
    [chart, panelUserId]
  );

  const handleNodeClick = useCallback((userId: string) => {
    setPanelUserId((prev) => (prev === userId ? null : userId));
  }, []);

  const handleManagerUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['org-chart'] });
    setPanelUserId(null);
  }, [queryClient]);

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-[#2A2A2A] flex-shrink-0">
        <h1 className="text-xl font-bold text-white">Organisation Chart</h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              placeholder="Filter by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#242424] border border-[#2A2A2A] rounded-lg pl-8 pr-3 py-1.5
                text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#D62B2B] w-48"
            />
          </div>

          {/* Root user select */}
          {rootOptions.length > 0 && (
            <div className="relative">
              <select
                value={rootUserId ?? ''}
                onChange={(e) => setRootUserId(e.target.value || undefined)}
                className="appearance-none bg-[#242424] border border-[#2A2A2A] rounded-lg pl-3 pr-8 py-1.5
                  text-sm text-white focus:outline-none focus:border-[#D62B2B] cursor-pointer"
              >
                <option value="">Full org</option>
                {rootOptions.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            </div>
          )}

          {/* Expand / Collapse all */}
          <Button variant="ghost" size="sm" onClick={() => setExpandSignal((v) => v + 1)}>
            <ChevronDown size={14} /> Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCollapseSignal((v) => v + 1)}>
            <ChevronUp size={14} /> Collapse All
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Chart area */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <Spinner />
            </div>
          )}
          {error && (
            <p className="text-[#D62B2B] text-sm">Failed to load org chart.</p>
          )}
          {!isLoading && !error && filteredChart.length === 0 && (
            <p className="text-[#555] text-sm">
              {search ? 'No employees match your search.' : 'No organisation data found.'}
            </p>
          )}
          {!isLoading && filteredChart.length > 0 && (
            <div className="flex flex-col gap-4">
              {filteredChart.map((node) => (
                <OrgNode
                  key={node.user._id}
                  node={node}
                  depth={0}
                  onNodeClick={handleNodeClick}
                  expandSignal={expandSignal}
                  collapseSignal={collapseSignal}
                />
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        {panelNode && (
          <SidePanel
            node={panelNode}
            allNodes={chart}
            onClose={() => setPanelUserId(null)}
            onManagerUpdated={handleManagerUpdated}
          />
        )}
      </div>
    </div>
  );
}
