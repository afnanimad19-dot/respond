import {
  Contact,
  Conversation,
  LifecycleStage,
  Message,
  TeamMember
} from '../lib/types';

// ---- Team ----------------------------------------------------------------

export const mockTeam: TeamMember[] = [
  {
    id: 'me',
    name: 'Amanda Low',
    email: 'amanda@pydent.clinic',
    role: 'owner',
    online: true,
    color: '#0A84FF'
  },
  {
    id: 'dr-sara',
    name: 'Dr. Sara Haddad',
    email: 'sara@pydent.clinic',
    role: 'doctor',
    online: true,
    color: '#30B0C7'
  },
  {
    id: 'omar',
    name: 'Omar Khalil',
    email: 'omar@pydent.clinic',
    role: 'agent',
    online: false,
    color: '#FF9F0A'
  },
  {
    id: 'dr-adam',
    name: 'Dr. Adam Reed',
    email: 'adam@pydent.clinic',
    role: 'doctor',
    online: false,
    color: '#34C759'
  }
];

// ---- Lifecycle -----------------------------------------------------------

export const mockLifecycle: LifecycleStage[] = [
  { id: 'new', name: 'New Lead', color: '#0A84FF', description: 'Just reached out, not qualified yet' },
  { id: 'contacted', name: 'Contacted', color: '#30B0C7', description: 'We replied and are in conversation' },
  { id: 'interested', name: 'Interested', color: '#FF9F0A', description: 'Showing buying intent, still deciding' },
  { id: 'booked', name: 'Booked', color: '#34C759', description: 'Appointment or purchase confirmed' },
  { id: 'lost', name: 'Lost', color: '#8E8E93', description: 'Not moving forward for now' }
];

// ---- Contacts ------------------------------------------------------------

export const mockContacts: Contact[] = [
  {
    id: 'c1',
    name: 'Kara Finley',
    phone: '+1 902 555 0134',
    channel: 'whatsapp',
    color: '#FF6482',
    lifecycleStageId: 'interested',
    note: 'Asking about teeth whitening packages.'
  },
  {
    id: 'c2',
    name: 'Shanny',
    phone: '+1 415 555 0122',
    channel: 'whatsapp',
    color: '#77C25C',
    lifecycleStageId: 'new'
  },
  {
    id: 'c3',
    name: 'Hussein Baashen',
    handle: '@hbaashen',
    channel: 'telegram',
    color: '#4FA8E0',
    lifecycleStageId: 'contacted'
  },
  {
    id: 'c4',
    name: 'Adam',
    phone: '+44 20 555 0187',
    channel: 'whatsapp',
    color: '#3E7BFA',
    lifecycleStageId: 'new'
  },
  {
    id: 'c5',
    name: '19028132466',
    phone: '+1 902 813 2466',
    channel: 'whatsapp',
    color: '#FFB340',
    lifecycleStageId: 'new'
  },
  {
    id: 'c6',
    name: 'Paget Kagy',
    handle: '@paget.kagy',
    channel: 'instagram',
    color: '#E1548C',
    lifecycleStageId: 'booked',
    note: 'Quantum Energy collab — invisalign consult booked.'
  },
  {
    id: 'c7',
    name: 'Edwin Regina',
    handle: '@edwin.regina',
    channel: 'instagram',
    color: '#5E9BF7',
    lifecycleStageId: 'interested'
  }
];

// ---- Conversations ---------------------------------------------------------

const now = Date.now();
const mins = (n: number) => new Date(now - n * 60_000).toISOString();
const days = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const mockConversations: Conversation[] = [
  { id: 'v1', contactId: 'c1', status: 'open', assigneeId: null, unread: 2, lastMessageAt: mins(12) },
  { id: 'v2', contactId: 'c2', status: 'open', assigneeId: 'me', unread: 0, lastMessageAt: mins(55) },
  { id: 'v3', contactId: 'c3', status: 'open', assigneeId: 'dr-sara', unread: 1, lastMessageAt: mins(140) },
  { id: 'v4', contactId: 'c4', status: 'closed', assigneeId: 'me', unread: 0, lastMessageAt: days(1) },
  { id: 'v5', contactId: 'c5', status: 'open', assigneeId: null, unread: 0, lastMessageAt: days(2) },
  { id: 'v6', contactId: 'c6', status: 'snoozed', assigneeId: 'omar', unread: 0, lastMessageAt: days(3) },
  { id: 'v7', contactId: 'c7', status: 'open', assigneeId: 'me', unread: 0, lastMessageAt: mins(4) }
];

// ---- Messages --------------------------------------------------------------

export const mockMessages: Message[] = [
  // Kara Finley — whitening lead
  { id: 'm1', conversationId: 'v1', kind: 'event', from: 'contact', text: 'Conversation opened by Contact', at: mins(60) },
  { id: 'm2', conversationId: 'v1', kind: 'text', from: 'contact', text: 'Hi! Do you have any teeth whitening offers this month?', at: mins(58) },
  { id: 'm3', conversationId: 'v1', kind: 'text', from: 'me', text: 'Hi Kara! 👋 Yes — our summer whitening package is 20% off until the end of the month.', at: mins(50) },
  { id: 'm4', conversationId: 'v1', kind: 'text', from: 'contact', text: 'That sounds great. Can I book a session for next week?', at: mins(14) },
  { id: 'm5', conversationId: 'v1', kind: 'comment', from: 'me', text: '@Dr. Sara Haddad she wants next week — do you have Tuesday morning free?', at: mins(13), mentions: ['dr-sara'] },
  { id: 'm6', conversationId: 'v1', kind: 'comment', from: 'dr-sara', text: 'Tuesday 10:30am works. Book her in 👍', at: mins(12), mentions: [] },

  // Shanny
  { id: 'm7', conversationId: 'v2', kind: 'text', from: 'contact', text: 'Hello, I need some information please.', at: mins(70) },
  { id: 'm8', conversationId: 'v2', kind: 'text', from: 'me', text: 'Could you please provide your name?', at: mins(55) },

  // Hussein — telegram
  { id: 'm9', conversationId: 'v3', kind: 'text', from: 'contact', text: 'Halo testing', at: mins(150) },
  { id: 'm10', conversationId: 'v3', kind: 'audio', from: 'dr-sara', text: 'Audio message (0:42)', at: mins(140) },

  // Adam — closed
  { id: 'm11', conversationId: 'v4', kind: 'text', from: 'contact', text: 'hello', at: days(1.1) },
  { id: 'm12', conversationId: 'v4', kind: 'text', from: 'me', text: 'Hi Adam! How can I help you today?', at: days(1.05) },
  {
    id: 'm13',
    conversationId: 'v4',
    kind: 'event',
    from: 'me',
    text: 'Conversation closed by Amanda · Category: Sales · Summary: General enquiry, no follow-up needed',
    at: days(1)
  },

  // Unknown number
  { id: 'm14', conversationId: 'v5', kind: 'text', from: 'me', text: 'Hi 19028132466! 👋 How can I help you today?', at: days(2) },

  // Paget — instagram
  { id: 'm15', conversationId: 'v6', kind: 'unsupported', from: 'contact', text: 'Unsupported message', at: days(3) },

  // Edwin — instagram, meeting request
  { id: 'm16', conversationId: 'v7', kind: 'event', from: 'contact', text: 'Conversation opened by Contact · Assigned to you', at: mins(30) },
  { id: 'm17', conversationId: 'v7', kind: 'text', from: 'contact', text: "Hi. I'm interested in scheduling a meeting to discuss your services.", at: mins(25) },
  {
    id: 'm18',
    conversationId: 'v7',
    kind: 'text',
    from: 'me',
    text: "Hi Edwin! I'd be happy to help you with that. I'll send you a Calendly link where you can select the time that works best for you.",
    at: mins(4)
  }
];
