"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { Phone, Plus, RefreshCw, RotateCcw, Settings2 } from "lucide-react";
import { TitleEater } from "@/components/EasterEggs";
import { AvocadoIcon } from "@/components/dashboard/DashboardIcons";
import type { Theme } from "@/types/preferences";

export interface DashboardClientOption {
  value: string;
  label: string;
  group?: string;
}

interface DashboardHeaderProps {
  user: { username: string };
  appVersion: string;
  selectedClient: string;
  selectedClientRecord?: DashboardClientOption;
  guacamoleUrl: string;
  contactMenuRef: RefObject<HTMLDivElement | null>;
  contactMenuOpen: boolean;
  setContactMenuOpen: Dispatch<SetStateAction<boolean>>;
  phoneNumbers: any[];
  peopleContacts: any[];
  providerContacts: any[];
  onOpenModal: (modal: string) => void;
  clientPickerRef: RefObject<HTMLDivElement | null>;
  clientPickerOpen: boolean;
  setClientPickerOpen: Dispatch<SetStateAction<boolean>>;
  clientSearchInputRef: RefObject<HTMLInputElement | null>;
  clientSearch: string;
  setClientSearch: Dispatch<SetStateAction<string>>;
  clientSearchDirty: boolean;
  setClientSearchDirty: Dispatch<SetStateAction<boolean>>;
  filteredClients: DashboardClientOption[];
  activeClientIndex: number;
  setActiveClientIndex: Dispatch<SetStateAction<number>>;
  loading: boolean;
  onClientChange: (client: string) => void;
  onCompanyModalMode: (mode: "add" | "selectForUpdate" | "update" | null) => void;
  onSelectCompanyForUpdate: (data: Record<string, any>) => Promise<boolean>;
  onRefresh: () => void;
  loadingData: boolean;
  userMenuOpen: boolean;
  setUserMenuOpen: Dispatch<SetStateAction<boolean>>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onResetOverview: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  user,
  appVersion,
  selectedClient,
  selectedClientRecord,
  guacamoleUrl,
  contactMenuRef,
  contactMenuOpen,
  setContactMenuOpen,
  phoneNumbers,
  peopleContacts,
  providerContacts,
  onOpenModal,
  clientPickerRef,
  clientPickerOpen,
  setClientPickerOpen,
  clientSearchInputRef,
  clientSearch,
  setClientSearch,
  clientSearchDirty,
  setClientSearchDirty,
  filteredClients,
  activeClientIndex,
  setActiveClientIndex,
  loading,
  onClientChange,
  onCompanyModalMode,
  onSelectCompanyForUpdate,
  onRefresh,
  loadingData,
  userMenuOpen,
  setUserMenuOpen,
  theme,
  setTheme,
  onResetOverview,
  onLogout,
}: DashboardHeaderProps) {
  const setOpenModal = onOpenModal;
  const handleClientChange = onClientChange;
  const setCompanyModalMode = onCompanyModalMode;
  const handleSelectCompanyForUpdate = onSelectCompanyForUpdate;
  const fetchClientData = onRefresh;
  const resetOverviewLayout = onResetOverview;
  const handleLogout = onLogout;

  return (
    <>
      {/* Compact Header */}
      <header className="cdms-topbar flex-shrink-0 h-[66px]">
        <div className="px-6 h-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="cdms-brand-mark" aria-hidden="true"><span /><span /><span /></div>
            <div className="cdms-brand-copy">
              <h1 className="m-0 flex items-center leading-none"><TitleEater title="CDMS" /></h1>
            </div>
          </div>
          <div className="cdms-header-client">
            <button
              type="button"
              className="cdms-guac-button"
              disabled={!guacamoleUrl}
              title={guacamoleUrl ? `Open Guacamole for ${selectedClientRecord?.label || selectedClient}` : 'No Guacamole link configured'}
              aria-label={guacamoleUrl ? `Open Guacamole for ${selectedClientRecord?.label || selectedClient}` : 'No Guacamole link configured'}
              onClick={() => {
                if (guacamoleUrl) window.open(guacamoleUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <AvocadoIcon />
            </button>
            <div className="cdms-contact-control" ref={contactMenuRef}>
              <button
                type="button"
                className={`cdms-contact-button ${contactMenuOpen ? 'is-open' : ''}`}
                disabled={!selectedClient}
                title={selectedClient ? `Contact information for ${selectedClientRecord?.label || selectedClient}` : 'Select a client to view contacts'}
                aria-label={selectedClient ? `Contact information for ${selectedClientRecord?.label || selectedClient}` : 'Select a client to view contacts'}
                aria-expanded={contactMenuOpen}
                aria-controls="client-contact-menu"
                onClick={() => {
                  setClientPickerOpen(false);
                  setContactMenuOpen(open => !open);
                }}
              >
                <Phone aria-hidden="true" />
              </button>
              {contactMenuOpen && (
                <div id="client-contact-menu" className="cdms-contact-menu" role="dialog" aria-label="Client contact information">
                    <header className="cdms-contact-menu-header">
                      <div>
                        <strong>Contact Information</strong>
                        <span>{selectedClientRecord?.label || selectedClient}</span>
                      </div>
                      <small>{phoneNumbers.length + peopleContacts.length + providerContacts.length}</small>
                    </header>

                    <div className="cdms-contact-menu-body">
                      <section className="cdms-contact-section">
                        <h3>Main Phones</h3>
                        {phoneNumbers.length > 0 ? phoneNumbers.map((phone, index) => (
                          <a key={`${phone.Number}-${index}`} className="cdms-contact-primary" href={`tel:${phone.Number}`}>
                            <Phone size={14} aria-hidden="true" />
                            <span>
                              <strong>{phone.Number}</strong>
                              <small>{phone.Name || phone.Type || phone.Location || (index === 0 ? 'Primary number' : 'Additional number')}</small>
                            </span>
                          </a>
                        )) : <p className="cdms-contact-empty">No client phone numbers available.</p>}
                      </section>

                      <section className="cdms-contact-section">
                        <div className="cdms-contact-section-heading">
                          <button type="button" onClick={() => { setContactMenuOpen(false); setOpenModal('usersModal'); }}>People</button>
                        </div>
                        <div className="cdms-contact-list">
                          {peopleContacts.length > 0 ? peopleContacts.map((person, index) => (
                            <article key={`${person.Name || person.Login}-${index}`} className="cdms-contact-entry">
                              <div className="cdms-contact-entry-title">
                                <strong>{person.Name || person.Login}</strong>
                                {person.SubName && <small>{person.SubName}</small>}
                              </div>
                              <div className="cdms-contact-links">
                                {person.Phone && <a href={`tel:${person.Phone}`}>{person.Phone}</a>}
                                {person.Email && <a href={`mailto:${person.Email}`}>{person.Email}</a>}
                              </div>
                            </article>
                          )) : <p className="cdms-contact-empty">No individual contact details available.</p>}
                        </div>
                      </section>

                      <section className="cdms-contact-section">
                        <div className="cdms-contact-section-heading">
                          <button type="button" onClick={() => { setContactMenuOpen(false); setOpenModal('servicesModal'); }}>Service Providers</button>
                        </div>
                        <div className="cdms-contact-list">
                          {providerContacts.length > 0 ? providerContacts.map((contact, index) => (
                            <article key={`${contact.Name || contact.Contact}-${index}`} className="cdms-contact-entry">
                              <div className="cdms-contact-entry-title">
                                <strong>{contact.Name || contact.Contact || 'Service contact'}</strong>
                                {(contact.Contact || contact['Service Type']) && <small>{[contact.Contact, contact['Service Type']].filter(Boolean).join(' · ')}</small>}
                              </div>
                              <div className="cdms-contact-links">
                                {String(contact.Phone || '').split(' / ').filter(Boolean).map((phone, phoneIndex) => <a key={`${phone}-${phoneIndex}`} href={`tel:${phone}`}>{phone}</a>)}
                                {contact.Email && <a href={`mailto:${contact.Email}`}>{contact.Email}</a>}
                                {contact.Account && <span>Account {contact.Account}</span>}
                              </div>
                            </article>
                          )) : <p className="cdms-contact-empty">No service-provider contacts available.</p>}
                        </div>
                      </section>
                    </div>

                  </div>
              )}
            </div>
            <div className={`cdms-client-picker ${clientPickerOpen ? 'is-open' : ''}`} ref={clientPickerRef}>
              <div className={`cdms-client-search ${clientPickerOpen ? 'is-open' : ''}`} title={!clientPickerOpen ? selectedClientRecord?.label : undefined}>
                <input
                  ref={clientSearchInputRef}
                  id="client-select"
                  type="search"
                  role="combobox"
                  aria-label="Search clients"
                  aria-autocomplete="list"
                  aria-controls="client-suggestions"
                  aria-expanded={clientPickerOpen}
                  aria-activedescendant={clientPickerOpen && filteredClients[activeClientIndex] ? `client-option-${filteredClients[activeClientIndex].value}` : undefined}
                  value={clientPickerOpen ? clientSearch : (selectedClientRecord?.label || '')}
                  placeholder={loading ? 'Loading clients…' : 'Search clients…'}
                  autoComplete="off"
                  disabled={loading}
                  onFocus={() => {
                    setContactMenuOpen(false);
                    if (!clientPickerOpen) {
                      setClientSearch(selectedClientRecord?.label || '');
                      setClientSearchDirty(false);
                      setClientPickerOpen(true);
                    }
                  }}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setClientSearchDirty(true);
                    setClientPickerOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setClientPickerOpen(true);
                      setActiveClientIndex(index => Math.min(index + 1, Math.max(filteredClients.length - 1, 0)));
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setActiveClientIndex(index => Math.max(index - 1, 0));
                    } else if (event.key === 'Enter' && clientPickerOpen && filteredClients[activeClientIndex]) {
                      event.preventDefault();
                      const client = filteredClients[activeClientIndex];
                      setClientSearch(client.label);
                      setClientSearchDirty(false);
                      handleClientChange(client.value);
                      setClientPickerOpen(false);
                    } else if (event.key === 'Escape') {
                      setClientPickerOpen(false);
                      setClientSearch(selectedClientRecord?.label || '');
                      setClientSearchDirty(false);
                    }
                  }}
                />
                <div className="cdms-client-actions" aria-label="Client actions">
                  <button type="button" className="cdms-client-action" title="Add client" aria-label="Add client" onClick={() => { setClientPickerOpen(false); setCompanyModalMode('add'); }}>
                    <Plus size={16} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className="cdms-client-action"
                    title="Configure current client"
                    aria-label="Configure current client"
                    disabled={!selectedClient}
                    onClick={() => {
                      setClientPickerOpen(false);
                      if (selectedClientRecord) void handleSelectCompanyForUpdate({ companyLabel: selectedClientRecord.label });
                    }}
                  >
                    <Settings2 size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
              {clientPickerOpen && (
                <div id="client-suggestions" className="cdms-client-suggestions" role="listbox">
                  <div className="cdms-client-suggestions-head">
                    <span>{clientSearchDirty && clientSearch.trim() ? 'Suggestions' : 'All clients'}</span>
                    <small>{filteredClients.length}</small>
                  </div>
                  {filteredClients.length > 0 ? filteredClients.map((client, index) => (
                    <button
                      id={`client-option-${client.value}`}
                      key={client.value}
                      type="button"
                      role="option"
                      aria-selected={selectedClient === client.value}
                      className={`cdms-client-option ${index === activeClientIndex ? 'is-active' : ''} ${selectedClient === client.value ? 'is-selected' : ''}`}
                      onMouseEnter={() => setActiveClientIndex(index)}
                      onClick={() => { setClientSearch(client.label); setClientSearchDirty(false); handleClientChange(client.value); setClientPickerOpen(false); }}
                    >
                      <span className="cdms-client-monogram">{client.value.slice(0, 2)}</span>
                      <span className="cdms-client-option-copy"><strong>{client.label}</strong>{client.group && <small>{client.group}</small>}</span>
                      {selectedClient === client.value && <span className="cdms-client-check">✓</span>}
                    </button>
                  )) : (
                    <div className="cdms-client-empty">No clients match “{clientSearch}”</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={fetchClientData}
              disabled={!selectedClient || loadingData}
              className="cdms-toolbar-action"
              title="Refresh client data"
              aria-label="Refresh client data"
            >
              <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setUserMenuOpen(open => !open);
                }}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <span className="font-medium">{user.username}</span>
                <span className="text-xs">▼</span>
              </button>
              {userMenuOpen && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 py-1">
                  {/* Theme options */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
                    Theme
                  </div>
                  <button
                    onClick={() => setTheme('light')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'light' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>☀️</span> Light {theme === 'light' && '✓'}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'dark' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>🌙</span> Dark {theme === 'dark' && '✓'}
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'system' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>💻</span> System {theme === 'system' && '✓'}
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => {
                      resetOverviewLayout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <RotateCcw size={14} /> Reset Overview
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  {/* Logout */}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Logout
                    </button>
                    {appVersion && (
                      <>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
                          Version {appVersion}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
