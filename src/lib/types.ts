export type ChannelType =
  | 'whatsapp'
  | 'instagram'
  | 'messenger'
  | 'telegram'
  | 'tiktok'
  | 'sms'
  | 'webchat';

export type ConversationStatus = 'open' | 'closed' | 'snoozed';

export type Role = 'owner' | 'manager' | 'doctor' | 'agent';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  online: boolean;
  color: string;
  /** pending = invited by email, has not joined yet */
  pending?: boolean;
}

export interface LifecycleStage {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  handle?: string;
  channel: ChannelType;
  color: string;
  lifecycleStageId: string | null;
  note?: string;
}

export type MessageKind = 'text' | 'comment' | 'event' | 'audio' | 'file' | 'unsupported';

export interface Message {
  id: string;
  conversationId: string;
  kind: MessageKind;
  /** 'contact' = the customer, otherwise a team member id */
  from: 'contact' | string;
  text: string;
  at: string; // ISO timestamp
  /** team member ids mentioned with @ inside an internal comment */
  mentions?: string[];
}

export interface Conversation {
  id: string;
  contactId: string;
  status: ConversationStatus;
  assigneeId: string | null;
  unread: number;
  lastMessageAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  /** which LHDM product this workspace comes from, e.g. PyDent */
  sourceApp: string;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  workspace: Workspace;
  demo: boolean;
}
