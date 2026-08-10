import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Building2,
  FileText,
  Globe,
  Loader2,
  MapPin,
  Phone,
  Save,
  StickyNote,
  Users,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Field, SelectInput, TabBar, TextAreaInput, TextInput } from '@/components/party/party-ui';
import { Button } from '@/components/ui/Button';
import type { PartyCategory, PartyGroup } from '@/services/party-master.types';
import {
  createSupplier,
  createSupplierAddress,
  createSupplierContact,
  createSupplierDocument,
  deleteSupplierAddress,
  deleteSupplierContact,
  deleteSupplierDocument,
  getSupplier,
  listSupplierAddresses,
  listSupplierCategories,
  listSupplierContacts,
  listSupplierDocuments,
  listSupplierGroups,
  SUPPLIER_CONTACT_TYPES,
  SUPPLIER_DOC_TYPES,
  SUPPLIER_TYPES,
  updateSupplier,
  updateSupplierAddress,
  updateSupplierContact,
} from '@/services/supplier-master.service';

const TABS = [
  { key: 'basic', label: 'Basic Info', icon: <Users className="h-4 w-4" /> },
  { key: 'business', label: 'Business', icon: <Building2 className="h-4 w-4" /> },
  { key: 'addresses', label: 'Addresses', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Phone className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { key: 'accounting', label: 'Accounting', icon: <Wallet className="h-4 w-4" /> },
  { key: 'bank', label: 'Bank', icon: <Banknote className="h-4 w-4" /> },
  { key: 'remarks', label: 'Remarks', icon: <StickyNote className="h-4 w-4" /> },
];

type AddressType = 'billing' | 'shipping' | 'head_office' | 'branch';
type ContactType = 'owner' | 'accounts' | 'purchase' | 'sales' | 'dispatch' | 'purchase_manager';

interface AddressRow {
  id?: string;
  addressType: AddressType;
  address: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  isDefault: boolean;
}

interface ContactRow {
  id?: string;
  contactType: ContactType;
  name: string;
  mobile: string;
  email: string;
  designation: string;
  isPrimary: boolean;
}

interface DocRow {
  id?: string;
  docType: string;
  fileName: string;
  notes: string;
}

export function CreateSupplierPage() {
  return <SupplierFormPage mode="create" />;
}

export function EditSupplierPage() {
  return <SupplierFormPage mode="edit" />;
}

function SupplierFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('basic');
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string | null>(null);

  const [groups, setGroups] = useState<PartyGroup[]>([]);
  const [categories, setCategories] = useState<PartyCategory[]>([]);

  const [form, setForm] = useState<Record<string, any>>({
    name: '',
    firmName: '',
    supplierType: 'regular',
    groupId: '',
    categoryId: '',
    gstin: '',
    pan: '',
    aadhaar: '',
    contactPerson: '',
    mobile: '',
    altMobile: '',
    whatsapp: '',
    email: '',
    website: '',
    address: '',
    village: '',
    taluka: '',
    district: '',
    state: '',
    city: '',
    pin: '',
    country: 'India',
    openingBalance: 0,
    creditLimit: 0,
    creditDays: 30,
    paymentTerms: '',
    upiId: '',
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankBranch: '',
    status: 'active',
    remarks: '',
  });
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    if (mode !== 'edit' || !id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [c, g, cat, addr, cts, docs] = await Promise.all([
        getSupplier(id),
        listSupplierGroups().catch(() => []),
        listSupplierCategories().catch(() => []),
        listSupplierAddresses(id).catch(() => []),
        listSupplierContacts(id).catch(() => []),
        listSupplierDocuments(id).catch(() => []),
      ]);
      setGroups(g);
      setCategories(cat);
      setAddresses(
        (addr || []).map((a) => ({
          id: a.id,
          addressType: a.addressType,
          address: a.address || '',
          village: a.village || '',
          taluka: a.taluka || '',
          district: a.district || '',
          state: a.state || '',
          country: a.country || 'India',
          pincode: a.pincode || '',
          isDefault: Boolean(a.isDefault),
        })),
      );
      setContacts(
        (cts || []).map((x) => ({
          id: x.id,
          contactType: x.contactType,
          name: x.name || '',
          mobile: x.mobile || '',
          email: x.email || '',
          designation: x.designation || '',
          isPrimary: Boolean(x.isPrimary),
        })),
      );
      setDocuments(
        (docs || []).map((d) => ({
          id: d.id,
          docType: d.docType,
          fileName: d.fileName || '',
          notes: d.notes || '',
        })),
      );
      setForm((f) => ({
        ...f,
        ...c,
        groupId: c.groupId || '',
        categoryId: c.categoryId || '',
        openingBalance: c.openingBalance ?? 0,
        creditLimit: c.creditLimit ?? 0,
        creditDays: c.creditDays ?? 30,
      }));
      if (c.warnings?.mobileDuplicates?.length) {
        setWarnings(
          `⚠️ Mobile number already used by: ${c.warnings.mobileDuplicates.map((w) => w.name).join(', ')}`,
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, mode]);

  useEffect(() => {
    void load();
    if (mode === 'create') {
      void listSupplierGroups()
        .then(setGroups)
        .catch(() => undefined);
      void listSupplierCategories()
        .then(setCategories)
        .catch(() => undefined);
    }
  }, [load, mode]);

  const addAddress = () =>
    setAddresses((a) => [
      ...a,
      {
        addressType: 'billing',
        address: '',
        village: '',
        taluka: '',
        district: '',
        state: '',
        country: 'India',
        pincode: '',
        isDefault: addresses.length === 0,
      },
    ]);
  const addContact = () =>
    setContacts((c) => [
      ...c,
      {
        contactType: 'owner',
        name: '',
        mobile: '',
        email: '',
        designation: '',
        isPrimary: contacts.length === 0,
      },
    ]);
  const addDocument = () =>
    setDocuments((d) => [...d, { docType: 'other', fileName: '', notes: '' }]);

  const save = async () => {
    setError(null);
    setNotice(null);
    if (!String(form.name || '').trim()) {
      setError('Supplier Name is required');
      setTab('basic');
      return;
    }
    const payload = { ...form };
    delete payload.id;
    if (payload.groupId === '') {
      delete payload.groupId;
    }
    if (payload.categoryId === '') {
      delete payload.categoryId;
    }
    setSaving(true);
    try {
      const saved =
        mode === 'create'
          ? await createSupplier(payload)
          : await updateSupplier(id as string, payload);
      const savedId = saved.id as string;

      // ── Persist child records (addresses / contacts / documents) ──
      if (mode === 'create') {
        for (const a of addresses) {
          if (a.address || a.village || a.state || a.pincode) {
            await createSupplierAddress(savedId, a).catch(() => undefined);
          }
        }
        for (const c of contacts) {
          if (c.name) {
            await createSupplierContact(savedId, c).catch(() => undefined);
          }
        }
        for (const d of documents) {
          if (d.fileName) {
            await createSupplierDocument(savedId, d).catch(() => undefined);
          }
        }
      } else if (id) {
        const existingAddr = await listSupplierAddresses(id).catch(() => []);
        const existingCts = await listSupplierContacts(id).catch(() => []);
        const existingDocs = await listSupplierDocuments(id).catch(() => []);
        for (const a of addresses) {
          if (a.id) {
            await updateSupplierAddress(id, a.id, a).catch(() => undefined);
          } else if (a.address || a.village || a.state || a.pincode) {
            await createSupplierAddress(id, a).catch(() => undefined);
          }
        }
        for (const old of existingAddr) {
          if (!addresses.some((a) => a.id === old.id)) {
            await deleteSupplierAddress(id, old.id).catch(() => undefined);
          }
        }
        for (const c of contacts) {
          if (c.id) {
            await updateSupplierContact(id, c.id, c).catch(() => undefined);
          } else if (c.name) {
            await createSupplierContact(id, c).catch(() => undefined);
          }
        }
        for (const old of existingCts) {
          if (!contacts.some((x) => x.id === old.id)) {
            await deleteSupplierContact(id, old.id).catch(() => undefined);
          }
        }
        for (const d of documents) {
          if (!d.id && d.fileName) {
            await createSupplierDocument(id, d).catch(() => undefined);
          }
        }
        for (const old of existingDocs) {
          if (!documents.some((x) => x.id === old.id)) {
            await deleteSupplierDocument(id, old.id).catch(() => undefined);
          }
        }
      }

      if (saved.warnings?.mobileDuplicates?.length) {
        setWarnings(
          `⚠️ Mobile number already used by: ${saved.warnings.mobileDuplicates.map((w) => w.name).join(', ')}`,
        );
      }
      setNotice(
        mode === 'create'
          ? `✅ Supplier created — code ${saved.code}`
          : '✅ Supplier updated successfully',
      );
      setTimeout(() => navigate(`/suppliers/${savedId}`), 700);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const invalidTabs: string[] = [];
  if (!String(form.name || '').trim()) {
    invalidTabs.push('basic');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === 'create' ? 'New Supplier' : 'Edit Supplier'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            पुरवठादार {mode === 'create' ? 'नोंदणी' : 'सुधारणा'}
          </p>
        </div>
        {form.code && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {form.code}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {warnings && !error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          {warnings}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {/* Tabs */}
      <TabBar
        tabs={TABS.map((t) => ({
          ...t,
          count:
            t.key === 'addresses'
              ? addresses.length
              : t.key === 'contacts'
                ? contacts.length
                : t.key === 'documents'
                  ? documents.length
                  : undefined,
        }))}
        active={tab}
        onChange={setTab}
      />

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        {tab === 'basic' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier Name" required>
              <TextInput
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Agro Traders"
              />
            </Field>
            <Field label="Firm Name">
              <TextInput
                value={form.firmName}
                onChange={(e) => set('firmName', e.target.value)}
                placeholder="Registered firm name"
              />
            </Field>
            <Field label="Supplier Type">
              <SelectInput
                value={form.supplierType}
                onChange={(e) => set('supplierType', e.target.value)}
              >
                {SUPPLIER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </SelectInput>
            </Field>
            <Field label="Supplier Group">
              <SelectInput value={form.groupId} onChange={(e) => set('groupId', e.target.value)}>
                <option value="">— None —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Supplier Category">
              <SelectInput
                value={form.categoryId}
                onChange={(e) => set('categoryId', e.target.value)}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Contact Person">
              <TextInput
                value={form.contactPerson}
                onChange={(e) => set('contactPerson', e.target.value)}
              />
            </Field>
            <Field label="Mobile" hint="10-digit Indian mobile">
              <TextInput
                value={form.mobile}
                onChange={(e) => set('mobile', e.target.value)}
                placeholder="98765 43210"
              />
            </Field>
            <Field label="Alternate Mobile">
              <TextInput
                value={form.altMobile}
                onChange={(e) => set('altMobile', e.target.value)}
              />
            </Field>
            <Field label="WhatsApp">
              <TextInput value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field label="Website">
              <TextInput
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
        )}

        {tab === 'business' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN" hint="Format: 22AAAAA0000A1Z5">
              <TextInput
                value={form.gstin}
                onChange={(e) => set('gstin', e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                className="font-mono"
              />
            </Field>
            <Field label="PAN" hint="Format: AAAAA0000A">
              <TextInput
                value={form.pan}
                onChange={(e) => set('pan', e.target.value.toUpperCase())}
                placeholder="AAAAA0000A"
                className="font-mono"
              />
            </Field>
            <Field label="Aadhaar (optional)">
              <TextInput
                value={form.aadhaar}
                onChange={(e) => set('aadhaar', e.target.value)}
                placeholder="12-digit Aadhaar"
              />
            </Field>
            <Field label="Address">
              <TextAreaInput
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </Field>
            <Field label="Village">
              <TextInput value={form.village} onChange={(e) => set('village', e.target.value)} />
            </Field>
            <Field label="Taluka">
              <TextInput value={form.taluka} onChange={(e) => set('taluka', e.target.value)} />
            </Field>
            <Field label="District">
              <TextInput value={form.district} onChange={(e) => set('district', e.target.value)} />
            </Field>
            <Field label="City">
              <TextInput value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="State">
              <TextInput value={form.state} onChange={(e) => set('state', e.target.value)} />
            </Field>
            <Field label="Pincode">
              <TextInput value={form.pin} onChange={(e) => set('pin', e.target.value)} />
            </Field>
            <Field label="Country">
              <TextInput value={form.country} onChange={(e) => set('country', e.target.value)} />
            </Field>
          </div>
        )}

        {tab === 'addresses' && (
          <div className="space-y-4">
            {addresses.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
                No addresses yet — add billing, shipping, head office or branch addresses.
              </p>
            )}
            {addresses.map((a, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Address Type">
                    <SelectInput
                      value={a.addressType}
                      onChange={(e) =>
                        setAddresses((arr) =>
                          arr.map((x, j) =>
                            j === i ? { ...x, addressType: e.target.value as AddressType } : x,
                          ),
                        )
                      }
                    >
                      <option value="billing">Billing</option>
                      <option value="shipping">Shipping</option>
                      <option value="head_office">Head Office</option>
                      <option value="branch">Branch</option>
                    </SelectInput>
                  </Field>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={a.isDefault}
                        onChange={(e) =>
                          setAddresses((arr) =>
                            arr.map((x, j) => ({
                              ...x,
                              isDefault: j === i ? e.target.checked : false,
                            })),
                          )
                        }
                        className="h-4 w-4 rounded accent-emerald-600"
                      />
                      Default address
                    </label>
                  </div>
                  <Field label="Address">
                    <TextAreaInput
                      value={a.address}
                      onChange={(e) =>
                        setAddresses((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Village">
                    <TextInput
                      value={a.village}
                      onChange={(e) =>
                        setAddresses((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, village: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Taluka">
                    <TextInput
                      value={a.taluka}
                      onChange={(e) =>
                        setAddresses((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, taluka: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="District">
                    <TextInput
                      value={a.district}
                      onChange={(e) =>
                        setAddresses((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, district: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="State">
                    <TextInput
                      value={a.state}
                      onChange={(e) =>
                        setAddresses((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, state: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Country">
                    <TextInput
                      value={a.country}
                      onChange={(e) =>
                        setAddresses((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, country: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Pincode">
                    <TextInput
                      value={a.pincode}
                      onChange={(e) =>
                        setAddresses((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, pincode: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3 text-right">
                  <button
                    onClick={() => setAddresses((arr) => arr.filter((_, j) => j !== i))}
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remove address
                  </button>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              icon={<MapPin className="h-3.5 w-3.5" />}
              onClick={addAddress}
            >
              Add Address
            </Button>
          </div>
        )}

        {tab === 'contacts' && (
          <div className="space-y-4">
            {contacts.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
                No contacts yet — add owner, accounts, sales, dispatch or purchase manager contacts.
              </p>
            )}
            {contacts.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Contact Type">
                    <SelectInput
                      value={c.contactType}
                      onChange={(e) =>
                        setContacts((arr) =>
                          arr.map((x, j) =>
                            j === i ? { ...x, contactType: e.target.value as ContactType } : x,
                          ),
                        )
                      }
                    >
                      {SUPPLIER_CONTACT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={c.isPrimary}
                        onChange={(e) =>
                          setContacts((arr) =>
                            arr.map((x, j) => ({
                              ...x,
                              isPrimary: j === i ? e.target.checked : false,
                            })),
                          )
                        }
                        className="h-4 w-4 rounded accent-emerald-600"
                      />
                      Primary contact
                    </label>
                  </div>
                  <Field label="Name">
                    <TextInput
                      value={c.name}
                      onChange={(e) =>
                        setContacts((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Mobile">
                    <TextInput
                      value={c.mobile}
                      onChange={(e) =>
                        setContacts((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, mobile: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Email">
                    <TextInput
                      value={c.email}
                      onChange={(e) =>
                        setContacts((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Designation">
                    <TextInput
                      value={c.designation}
                      onChange={(e) =>
                        setContacts((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, designation: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3 text-right">
                  <button
                    onClick={() => setContacts((arr) => arr.filter((_, j) => j !== i))}
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remove contact
                  </button>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              icon={<Phone className="h-3.5 w-3.5" />}
              onClick={addContact}
            >
              Add Contact
            </Button>
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            {documents.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
                No documents recorded — GST certificate, PAN, cancelled cheque, licenses…
              </p>
            )}
            {documents.map((d, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Document Type">
                    <SelectInput
                      value={d.docType}
                      onChange={(e) =>
                        setDocuments((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, docType: e.target.value } : x)),
                        )
                      }
                    >
                      {SUPPLIER_DOC_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="File Name">
                    <TextInput
                      value={d.fileName}
                      onChange={(e) =>
                        setDocuments((arr) =>
                          arr.map((x, j) => (j === i ? { ...x, fileName: e.target.value } : x)),
                        )
                      }
                      placeholder="gst-certificate.pdf"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Notes">
                      <TextInput
                        value={d.notes}
                        onChange={(e) =>
                          setDocuments((arr) =>
                            arr.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)),
                          )
                        }
                      />
                    </Field>
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button
                    onClick={() => setDocuments((arr) => arr.filter((_, j) => j !== i))}
                    className="text-xs font-medium text-red-500 hover:text-red-600"
                  >
                    Remove document
                  </button>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              icon={<FileText className="h-3.5 w-3.5" />}
              onClick={addDocument}
            >
              Add Document
            </Button>
          </div>
        )}

        {tab === 'accounting' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opening Balance" hint="Credit opening balance">
              <TextInput
                type="number"
                min={0}
                value={form.openingBalance}
                onChange={(e) => set('openingBalance', Number(e.target.value))}
              />
            </Field>
            <Field label="Current Balance" hint="Auto-updated by ledger">
              <TextInput
                type="number"
                value={form.currentBalance ?? 0}
                disabled
                className="opacity-60"
              />
            </Field>
            <Field label="Credit Limit" hint="Must be ≥ 0">
              <TextInput
                type="number"
                min={0}
                value={form.creditLimit}
                onChange={(e) => set('creditLimit', Number(e.target.value))}
              />
            </Field>
            <Field label="Credit Days" hint="Payment term in days">
              <TextInput
                type="number"
                min={0}
                value={form.creditDays}
                onChange={(e) => set('creditDays', Number(e.target.value))}
              />
            </Field>
            <Field label="Payment Terms">
              <TextInput
                value={form.paymentTerms}
                onChange={(e) => set('paymentTerms', e.target.value)}
                placeholder="e.g. Net 30, COD"
              />
            </Field>
          </div>
        )}

        {tab === 'bank' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bank Name">
              <TextInput value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
            </Field>
            <Field label="Account Number">
              <TextInput
                value={form.bankAccountNo}
                onChange={(e) => set('bankAccountNo', e.target.value)}
              />
            </Field>
            <Field label="IFSC" hint="Format: AAAA0000000">
              <TextInput
                value={form.bankIfsc}
                onChange={(e) => set('bankIfsc', e.target.value.toUpperCase())}
                className="font-mono"
                placeholder="SBIN0001234"
              />
            </Field>
            <Field label="Bank Branch">
              <TextInput
                value={form.bankBranch}
                onChange={(e) => set('bankBranch', e.target.value)}
              />
            </Field>
            <Field label="UPI ID">
              <TextInput
                value={form.upiId}
                onChange={(e) => set('upiId', e.target.value)}
                placeholder="supplier@upi"
              />
            </Field>
          </div>
        )}

        {tab === 'remarks' && (
          <Field label="Remarks">
            <TextAreaInput
              value={form.remarks}
              onChange={(e) => set('remarks', e.target.value)}
              placeholder="Internal notes about this supplier…"
              className="min-h-32"
            />
          </Field>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Globe className="h-3.5 w-3.5" />
          {invalidTabs.includes('basic') && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="h-3.5 w-3.5" /> Supplier name required
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={save}>
            {mode === 'create' ? 'Create Supplier' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
