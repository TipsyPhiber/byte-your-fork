import React from 'react';
import AppearanceCard from './components/settings/AppearanceCard';
import ProfilePictureCard from './components/settings/ProfilePictureCard';
import UsernameCard from './components/settings/UsernameCard';
import CuisinePreferencesCard from './components/settings/CuisinePreferencesCard';
import DietaryRestrictionsCard from './components/settings/DietaryRestrictionsCard';
import EmailCard from './components/settings/EmailCard';
import PasswordCard from './components/settings/PasswordCard';
import AdminPanelCard from './components/settings/AdminPanelCard';

const Settings = ({ user, setUser, token, onPreferencesChange, darkMode, setDarkMode }) => (
  <div style={{ maxWidth: '600px', margin: '0 auto' }}>
    <h2 style={{ color: 'var(--dark-blue)', marginBottom: '30px' }}>Account Settings</h2>
    <AppearanceCard darkMode={darkMode} setDarkMode={setDarkMode} />
    <ProfilePictureCard user={user} setUser={setUser} token={token} />
    <UsernameCard user={user} setUser={setUser} token={token} />
    <CuisinePreferencesCard user={user} setUser={setUser} token={token} onPreferencesChange={onPreferencesChange} />
    <DietaryRestrictionsCard user={user} setUser={setUser} token={token} />
    <EmailCard user={user} setUser={setUser} token={token} />
    <PasswordCard token={token} />
    {user?.role === 'admin' && <AdminPanelCard token={token} />}
  </div>
);

export default Settings;
