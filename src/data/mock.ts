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
  { id: 'new', name: 'New Lead', color: '#1F6BFF', emoji: '🧑‍💼', description: 'Just reached out, not qualified yet' },
  { id: 'contacted', name: 'Contacted', color: '#17A2B8', emoji: '💬', description: 'We replied and are in conversation' },
  { id: 'interested', name: 'Hot Lead', color: '#F79009', emoji: '🔥', description: 'Showing buying intent, still deciding' },
  { id: 'booked', name: 'Converted', color: '#12B76A', emoji: '🤩', description: 'Appointment or purchase confirmed' },
  { id: 'lost', name: 'No Response', color: '#98A2B3', emoji: '😐', description: 'Not moving forward for now' }
];

// ---- Snippets ('/' in the composer) ---------------------------------------

export const mockSnippets = [
  { shortcut: '/welcome', text: 'Hi! 👋 Thanks for reaching out to us. How can I help you today?' },
  { shortcut: '/hours', text: 'Our clinic is open Monday–Saturday, 9:00am to 7:00pm.' },
  { shortcut: '/book', text: "I'd love to get you booked in! What day and time works best for you, $firstName?" },
  { shortcut: '/location', text: 'We are located in Sharjah — I can send you the map pin if you like.' },
  { shortcut: '/thanks', text: 'Thank you so much, $firstName! Have a lovely day. 😊' }
];

// ---- WhatsApp templates (need Meta approval before they can be sent) ------

export const mockTemplates = [
  {
    id: 'tpl1',
    name: 'welcome_arabic',
    language: 'ar',
    body: 'مرحباً $name! شكراً لتواصلك معنا. كيف يمكننا مساعدتك اليوم؟',
    status: 'approved' as const
  },
  {
    id: 'tpl2',
    name: 'appointment_reminder',
    language: 'en',
    body: 'Hi $firstName, this is a reminder of your appointment at $workspace. Reply YES to confirm.',
    status: 'approved' as const
  },
  {
    id: 'tpl3',
    name: 'summer_promo',
    language: 'en',
    body: 'Hi $firstName! Our summer offer is live — 20% off all treatments this month. 🦷',
    status: 'pending' as const
  }
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
  },
  {
    id: 'c8',
    name: 'Khadija Salim',
    phone: '+971 56 555 0190',
    channel: 'whatsapp',
    color: '#E1548C',
    lifecycleStageId: 'new',
    adSource: {
      platform: 'Meta · Click Ads',
      adName: 'إعلان العلاج الطبيعي — آلام الرقبة',
      campaign: 'Click Ads - Physio'
    }
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
  { id: 'v7', contactId: 'c7', status: 'open', assigneeId: 'me', unread: 0, lastMessageAt: mins(4) },
  { id: 'v8', contactId: 'c8', status: 'open', assigneeId: 'omar', unread: 1, lastMessageAt: mins(2) }
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
  },

  // Khadija — came in through the Arabic physio Click Ad (like respond.io
  // workflow events)
  {
    id: 'm19',
    conversationId: 'v8',
    kind: 'text',
    from: 'contact',
    text: 'يساعدك أخصائيو العلاج الطبيعي لدينا على تحديد سبب المشكلة ووضع خطة علاج مخصصة لتخفيف الألم وتحسين الحركة.\n\n✅ تخفيف آلام الرقبة\n✅ تمارين تصحيح القوام\n✅ تحسين المرونة والحركة',
    at: mins(40)
  },
  { id: 'm20', conversationId: 'v8', kind: 'text', from: 'contact', text: 'Hello! Can I get more info on this?', at: mins(38) },
  { id: 'm21', conversationId: 'v8', kind: 'event', from: 'contact', text: 'Lifecycle Stage New Lead added', at: mins(37) },
  { id: 'm22', conversationId: 'v8', kind: 'event', from: 'contact', text: 'Workflow Send Data to Message - Click Ads - Physio started', at: mins(37) },
  { id: 'm23', conversationId: 'v8', kind: 'text', from: 'me', text: 'Hi 👋', at: mins(36) },
  { id: 'm24', conversationId: 'v8', kind: 'event', from: 'contact', text: 'Assigned to Omar Khalil by Workflow Send Data to Message - Click Ads - Physio', at: mins(36) },
  { id: 'm25', conversationId: 'v8', kind: 'event', from: 'contact', text: 'Workflow Send Data to Message - Click Ads - Physio ended', at: mins(35) },
  { id: 'm26', conversationId: 'v8', kind: 'text', from: 'contact', text: 'You came to Sharjah and other', at: mins(2) }
];

// ---- Notifications ---------------------------------------------------------

export const mockNotifications = [
  {
    id: 'n1',
    kind: 'system' as const,
    title: 'Knowledge source (Salwaty Website) added',
    at: mins(180),
    archived: false
  },
  {
    id: 'n2',
    kind: 'mention' as const,
    title: 'Dr. Sara Haddad mentioned you in Kara Finley',
    body: '@Amanda Low Tuesday 10:30am works. Book her in 👍',
    at: mins(12),
    archived: false,
    conversationId: 'v1'
  },
  {
    id: 'n3',
    kind: 'system' as const,
    title: 'Knowledge source (Salwaty Website) added',
    at: days(7),
    archived: false
  },
  {
    id: 'n4',
    kind: 'assignment' as const,
    title: 'Workflow assigned Khadija Salim to Omar Khalil',
    body: 'Workflow Send Data to Message - Click Ads - Physio',
    at: mins(36),
    archived: false,
    conversationId: 'v8'
  },
  {
    id: 'n5',
    kind: 'mention' as const,
    title: 'Omar Khalil mentioned you in Hussein Baashen',
    body: '@Amanda Low no answer on the mobile — it is switched off',
    at: days(9),
    archived: true,
    conversationId: 'v3'
  }
];
