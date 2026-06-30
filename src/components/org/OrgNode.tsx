import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { SubtreeNode } from '../../types/org';

interface OrgNodeProps {
  /** The org subtree node to render. */
  node: SubtreeNode;
  /** Current depth in the tree (0 = root). Controls default expand state. */
  depth: number;
  /** Called when the user clicks this node's card. */
  onNodeClick: (userId: string) => void;
  /** Increment to force-expand all nodes. */
  expandSignal: number;
  /** Increment to force-collapse all nodes. */
  collapseSignal: number;
}

const PURPLE_ROLES = new Set(['ceo', 'owner', 'coo', 'cfo']);
const BLUE_ROLES = new Set(['area_manager', 'regional_manager', 'hr_manager', 'marketing_manager']);
const GREEN_ROLES = new Set(['store_manager', 'assistant_manager', 'shift_supervisor']);

function roleBorderClass(role: string): string {
  if (PURPLE_ROLES.has(role)) return 'border-l-purple-500';
  if (BLUE_ROLES.has(role)) return 'border-l-blue-500';
  if (GREEN_ROLES.has(role)) return 'border-l-green-500';
  return 'border-l-gray-500';
}

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return <span className="text-[#444] text-xs">—</span>;
  const cls =
    score >= 80
      ? 'bg-green-900/30 text-green-400'
      : score >= 60
      ? 'bg-amber-900/30 text-amber-400'
      : 'bg-red-900/30 text-red-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${cls}`}>
      {score.toFixed(0)}
    </span>
  );
}

/**
 * Recursive org-chart node. Renders a card for the given SubtreeNode and,
 * when expanded, its direct reports indented beneath it with a border-left
 * connector — all pure CSS, no chart library.
 */
export function OrgNode({ node, depth, onNodeClick, expandSignal, collapseSignal }: OrgNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.directReports.length > 0;

  useEffect(() => {
    if (expandSignal > 0) setExpanded(true);
  }, [expandSignal]);

  useEffect(() => {
    if (collapseSignal > 0) setExpanded(false);
  }, [collapseSignal]);

  return (
    <div className="flex flex-col">
      {/* Node card */}
      <div
        className={`bg-[#1A1A1A] rounded-lg shadow-sm border border-[#2A2A2A] border-l-4 ${roleBorderClass(node.user.role)}
          px-3 py-2.5 cursor-pointer hover:bg-[#242424] transition-colors select-none min-w-[180px] max-w-[240px]`}
        onClick={() => onNodeClick(node.user._id)}
      >
        <div className="flex items-start gap-1.5">
          {/* Chevron toggle */}
          {hasChildren ? (
            <button
              className="mt-0.5 text-[#555] hover:text-white flex-shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          ) : (
            <span className="w-[13px] flex-shrink-0" />
          )}

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm leading-tight truncate">
              {node.user.name}
            </p>
            <p className="text-[#555] text-xs mt-0.5 truncate capitalize">
              {node.user.role.replace(/_/g, ' ')}
            </p>
          </div>

          <ScoreBadge score={node.user.javaRistaScore} />
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-5 mt-2 border-l-2 border-[#2A2A2A] pl-4 flex flex-col gap-2">
          {node.directReports.map((child) => (
            <OrgNode
              key={child.user._id}
              node={child}
              depth={depth + 1}
              onNodeClick={onNodeClick}
              expandSignal={expandSignal}
              collapseSignal={collapseSignal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
