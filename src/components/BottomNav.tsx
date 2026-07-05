import { NavLink } from 'react-router-dom';
import { BellIcon, GearIcon, InboxIcon, PhoneIcon } from './icons';

export function BottomNav() {
  return (
    <nav className="bottomnav glass">
      <NavLink to="/notifications">
        <BellIcon />
        Notifications
      </NavLink>
      <NavLink to="/inbox">
        <InboxIcon />
        Inbox
      </NavLink>
      <NavLink to="/calls">
        <PhoneIcon />
        Calls
      </NavLink>
      <NavLink to="/settings">
        <GearIcon />
        Settings
      </NavLink>
    </nav>
  );
}
