import { KeyRound, Network, Plus, Save, ShieldCheck, UsersRound } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { MetricCard } from '../components/MetricCard';
import {
  createAdGroup,
  createAgentKey,
  fetchAdGroups,
  fetchAgentKeys,
  fetchLdapSettings,
  saveLdapSettings,
  type AdGroup,
  type AgentKey,
  type LdapSettings
} from '../lib/apiClient';
import { useAuth } from '../lib/auth';

const emptyGroup: AdGroup = { name: '', distinguishedName: '', enabled: true };

export function SettingsPage() {
  const { token } = useAuth();
  const [ldap, setLdap] = useState<LdapSettings | null>(null);
  const [groups, setGroups] = useState<AdGroup[]>([]);
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [groupDraft, setGroupDraft] = useState(emptyGroup);
  const [keyName, setKeyName] = useState('');
  const [newAgentKey, setNewAgentKey] = useState('');
  const [saveState, setSaveState] = useState('');

  useEffect(() => {
    fetchLdapSettings(token ?? undefined).then(setLdap);
    fetchAdGroups(token ?? undefined).then(setGroups);
    fetchAgentKeys(token ?? undefined).then(setKeys);
  }, [token]);

  async function submitLdap(event: FormEvent) {
    event.preventDefault();
    if (!ldap) {
      return;
    }
    setSaveState('Saving LDAP settings...');
    try {
      const saved = await saveLdapSettings(ldap, token ?? undefined);
      setLdap(saved);
      setSaveState('LDAP settings saved.');
    } catch {
      setSaveState('Backend unavailable; LDAP settings are shown as draft values.');
    }
  }

  async function submitGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupDraft.name || !groupDraft.distinguishedName) {
      return;
    }
    try {
      const saved = await createAdGroup(groupDraft, token ?? undefined);
      setGroups((items) => [saved, ...items]);
    } catch {
      setGroups((items) => [{ ...groupDraft, id: `draft-${Date.now()}` }, ...items]);
    }
    setGroupDraft(emptyGroup);
  }

  async function submitAgentKey(event: FormEvent) {
    event.preventDefault();
    if (!keyName) {
      return;
    }
    try {
      const key = await createAgentKey(keyName, token ?? undefined);
      setKeys((items) => [key, ...items]);
      setNewAgentKey(key.key ?? '');
    } catch {
      setNewAgentKey('Backend unavailable. Start the Go API server before generating a real key.');
    }
    setKeyName('');
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Panel administration</span>
          <h1>Settings</h1>
          <p>Configure local bootstrap access, AD group validation, LDAP, and Agent enrollment keys.</p>
        </div>
      </header>

      <section className="metric-grid settings-grid">
        <MetricCard label="Login" value="Local + AD" detail="CLI admin bootstrap, LDAP users after group match" tone="accent" icon={<ShieldCheck size={18} />} />
        <MetricCard label="AD Groups" value={groups.filter((group) => group.enabled).length} detail="Enabled groups allowed to sign in" tone="good" icon={<UsersRound size={18} />} />
        <MetricCard label="LDAP" value={ldap?.enabled ? 'Enabled' : 'Disabled'} detail={ldap?.url ?? 'Loading configuration'} tone="neutral" icon={<Network size={18} />} />
        <MetricCard label="Agent Keys" value={keys.filter((key) => key.enabled).length} detail="Bearer keys accepted by ingestion API" tone="warning" icon={<KeyRound size={18} />} />
      </section>

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <h2>LDAP / AD Connection</h2>
            <p>AD groups are managed below; no group DN is hardcoded in the panel.</p>
          </div>
        </div>
        {ldap ? (
          <form className="settings-form" onSubmit={submitLdap}>
            <label className="toggle-row">
              <span>Enable LDAP login</span>
              <input type="checkbox" checked={ldap.enabled} onChange={(event) => setLdap({ ...ldap, enabled: event.target.checked })} />
            </label>
            <label className="form-field">
              <span>LDAP URL</span>
              <input value={ldap.url} onChange={(event) => setLdap({ ...ldap, url: event.target.value })} placeholder="ldaps://ad.example.com:636" />
            </label>
            <label className="form-field">
              <span>Bind DN</span>
              <input value={ldap.bindDn} onChange={(event) => setLdap({ ...ldap, bindDn: event.target.value })} />
            </label>
            <label className="form-field">
              <span>User Base DN</span>
              <input value={ldap.userBaseDn} onChange={(event) => setLdap({ ...ldap, userBaseDn: event.target.value })} />
            </label>
            <label className="form-field">
              <span>User Filter</span>
              <input value={ldap.userFilter} onChange={(event) => setLdap({ ...ldap, userFilter: event.target.value })} />
            </label>
            <label className="form-field">
              <span>Group Base DN</span>
              <input value={ldap.groupBaseDn} onChange={(event) => setLdap({ ...ldap, groupBaseDn: event.target.value })} />
            </label>
            <button className="button primary" type="submit">
              <Save size={16} />
              Save LDAP
            </button>
            {saveState ? <div className="form-note">{saveState}</div> : null}
          </form>
        ) : (
          <div className="empty-state">Loading LDAP settings...</div>
        )}
      </section>

      <section className="content-grid">
        <div className="panel settings-panel">
          <div className="section-heading">
            <div>
              <h2>Allowed AD Groups</h2>
              <p>Users must belong to one enabled group to enter the panel.</p>
            </div>
          </div>
          <form className="settings-form compact-form" onSubmit={submitGroup}>
            <label className="form-field">
              <span>Group Name</span>
              <input value={groupDraft.name} onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })} />
            </label>
            <label className="form-field">
              <span>Distinguished Name</span>
              <input value={groupDraft.distinguishedName} onChange={(event) => setGroupDraft({ ...groupDraft, distinguishedName: event.target.value })} />
            </label>
            <button className="button secondary" type="submit">
              <Plus size={16} />
              Add Group
            </button>
          </form>
          <div className="settings-list">
            {groups.map((group) => (
              <div className="settings-row" key={group.id ?? group.distinguishedName}>
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.distinguishedName}</span>
                </div>
                <span className={group.enabled ? 'status-chip good' : 'status-chip muted'}>{group.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel settings-panel">
          <div className="section-heading">
            <div>
              <h2>Agent Keys</h2>
              <p>Agents authenticate with the generated key; only the hash is stored by the API.</p>
            </div>
          </div>
          <form className="settings-form compact-form" onSubmit={submitAgentKey}>
            <label className="form-field">
              <span>Key Name</span>
              <input value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Production Linux fleet" />
            </label>
            <button className="button secondary" type="submit">
              <KeyRound size={16} />
              Generate Key
            </button>
          </form>
          {newAgentKey ? <div className="agent-key-result">{newAgentKey}</div> : null}
          <div className="settings-list">
            {keys.map((key) => (
              <div className="settings-row" key={key.id}>
                <div>
                  <strong>{key.name}</strong>
                  <span>{key.prefix}...</span>
                </div>
                <span className={key.enabled ? 'status-chip good' : 'status-chip muted'}>{key.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <h2>Local Admin Bootstrap</h2>
            <p>Create or reset the bootstrap account from the server CLI before configuring LDAP.</p>
          </div>
        </div>
        <div className="command-strip">server create-admin --username admin</div>
      </section>
    </div>
  );
}
