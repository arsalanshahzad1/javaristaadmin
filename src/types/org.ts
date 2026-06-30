export interface OrgUser {
  _id: string;
  name: string;
  role: string;
  storeId?: string;
  javaRistaScore?: number;
}

export interface SubtreeNode {
  user: OrgUser;
  directReports: SubtreeNode[];
}

export interface RoleChangeRequest {
  _id: string;
  requestedBy: { _id: string; name: string };
  targetUser: { _id: string; name: string; role: string };
  fromRole: string;
  toRole: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  requestedAt: string;
  reviewedBy?: { name: string };
  reviewNote?: string;
  storeId: string;
}
