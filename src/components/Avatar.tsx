import { ChannelType } from '../lib/types';
import {
  ChatLogo,
  InstagramLogo,
  MessengerLogo,
  TelegramLogo,
  TikTokLogo,
  WhatsAppLogo
} from './icons';

export const channelColor: Record<ChannelType, string> = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  messenger: '#0084FF',
  telegram: '#29A9EB',
  tiktok: '#111111',
  sms: '#34C759',
  webchat: '#0A84FF'
};

export const channelName: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  sms: 'SMS',
  webchat: 'Web Chat'
};

export function ChannelLogo({ channel }: { channel: ChannelType }) {
  switch (channel) {
    case 'whatsapp':
      return <WhatsAppLogo />;
    case 'instagram':
      return <InstagramLogo />;
    case 'messenger':
      return <MessengerLogo />;
    case 'telegram':
      return <TelegramLogo />;
    case 'tiktok':
      return <TikTokLogo />;
    default:
      return <ChatLogo />;
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (/^\+?\d/.test(name)) return '#';
  const first = parts[0]?.charAt(0) ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  color,
  channel,
  small
}: {
  name: string;
  color: string;
  channel?: ChannelType;
  small?: boolean;
}) {
  return (
    <div className="avatar-wrap">
      <div
        className={`avatar${small ? ' sm' : ''}`}
        style={{ background: `linear-gradient(160deg, ${color}, ${color}cc)` }}
      >
        {initials(name)}
      </div>
      {channel && (
        <span
          className={`channel-dot${small ? ' sm' : ''}`}
          style={{
            background:
              channel === 'instagram'
                ? 'linear-gradient(45deg,#F58529,#DD2A7B)'
                : channelColor[channel],
            color: '#fff'
          }}
        >
          <ChannelLogo channel={channel} />
        </span>
      )}
    </div>
  );
}
