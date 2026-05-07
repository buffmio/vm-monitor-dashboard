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
    setSaveState('正在保存 LDAP 设置...');
    try {
      const saved = await saveLdapSettings(ldap, token ?? undefined);
      setLdap(saved);
      setSaveState('LDAP 设置已保存。');
    } catch {
      setSaveState('后端不可用，LDAP 设置暂以草稿值显示。');
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
      setNewAgentKey('后端不可用。请先启动 Go API 服务，再生成真实 Agent Key。');
    }
    setKeyName('');
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">面板管理</span>
          <h1>设置</h1>
          <p>配置本地初始化账号、AD 组校验、LDAP 和 Agent 接入密钥。</p>
        </div>
      </header>

      <section className="metric-grid settings-grid">
        <MetricCard label="登录" value="本地 + AD" detail="CLI 初始化管理员，LDAP 用户需匹配 AD 组" tone="accent" icon={<ShieldCheck size={18} />} />
        <MetricCard label="AD 组" value={groups.filter((group) => group.enabled).length} detail="启用组内用户允许登录" tone="good" icon={<UsersRound size={18} />} />
        <MetricCard label="LDAP" value={ldap?.enabled ? '已启用' : '已禁用'} detail={ldap?.url ?? '正在加载配置'} tone="neutral" icon={<Network size={18} />} />
        <MetricCard label="Agent Keys" value={keys.filter((key) => key.enabled).length} detail="接收 Agent 上报的 Bearer Key" tone="warning" icon={<KeyRound size={18} />} />
      </section>

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <h2>LDAP / AD 连接</h2>
            <p>AD 组在下方手动管理，面板不会写死任何 Group DN。</p>
          </div>
        </div>
        {ldap ? (
          <form className="settings-form" onSubmit={submitLdap}>
            <label className="toggle-row">
              <span>启用 LDAP 登录</span>
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
              <span>用户 Base DN</span>
              <input value={ldap.userBaseDn} onChange={(event) => setLdap({ ...ldap, userBaseDn: event.target.value })} />
            </label>
            <label className="form-field">
              <span>用户过滤器</span>
              <input value={ldap.userFilter} onChange={(event) => setLdap({ ...ldap, userFilter: event.target.value })} />
            </label>
            <label className="form-field">
              <span>组 Base DN</span>
              <input value={ldap.groupBaseDn} onChange={(event) => setLdap({ ...ldap, groupBaseDn: event.target.value })} />
            </label>
            <button className="button primary" type="submit">
              <Save size={16} />
              保存 LDAP
            </button>
            {saveState ? <div className="form-note">{saveState}</div> : null}
          </form>
        ) : (
          <div className="empty-state">正在加载 LDAP 设置...</div>
        )}
      </section>

      <section className="content-grid">
        <div className="panel settings-panel">
          <div className="section-heading">
            <div>
              <h2>允许登录的 AD 组</h2>
              <p>用户必须属于至少一个启用的组，才能进入面板。</p>
            </div>
          </div>
          <form className="settings-form compact-form" onSubmit={submitGroup}>
            <label className="form-field">
              <span>组名称</span>
              <input value={groupDraft.name} onChange={(event) => setGroupDraft({ ...groupDraft, name: event.target.value })} />
            </label>
            <label className="form-field">
              <span>Distinguished Name</span>
              <input value={groupDraft.distinguishedName} onChange={(event) => setGroupDraft({ ...groupDraft, distinguishedName: event.target.value })} />
            </label>
            <button className="button secondary" type="submit">
              <Plus size={16} />
              添加组
            </button>
          </form>
          <div className="settings-list">
            {groups.map((group) => (
              <div className="settings-row" key={group.id ?? group.distinguishedName}>
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.distinguishedName}</span>
                </div>
                <span className={group.enabled ? 'status-chip good' : 'status-chip muted'}>{group.enabled ? '已启用' : '已禁用'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel settings-panel">
          <div className="section-heading">
            <div>
              <h2>Agent Keys</h2>
              <p>Agent 使用生成的 key 认证；API 只保存 hash。</p>
            </div>
          </div>
          <form className="settings-form compact-form" onSubmit={submitAgentKey}>
            <label className="form-field">
              <span>Key 名称</span>
              <input value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="生产 Linux 资源池" />
            </label>
            <button className="button secondary" type="submit">
              <KeyRound size={16} />
              生成 Key
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
                <span className={key.enabled ? 'status-chip good' : 'status-chip muted'}>{key.enabled ? '已启用' : '已禁用'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <h2>本地管理员初始化</h2>
            <p>配置 LDAP 前，可先通过 server CLI 创建或重置初始化账号。</p>
          </div>
        </div>
        <div className="command-strip">server create-admin --username admin</div>
      </section>
    </div>
  );
}
