import {
  Building2,
  FileText,
  Globe,
  Landmark,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  StickyNote,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import {
  createAddress,
  createContact,
  createCustomer,
  createDocument,
  deleteAddress,
  deleteContact,
  deleteDocument,
  getCustomer,
  listAddresses,
  listCategories,
  listContacts,
  listDocuments,
  listGroups,
  updateAddress,
  updateContact,
  updateCustomer,
  ADDRESS_TYPES,
  CONTACT_TYPES,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPES,
  DOC_TYPES,
  type CustomerAddress,
  type CustomerCategory,
  type CustomerContact,
  type CustomerDocument,
  type CustomerGroup,
  type CustomerStatus,
} from '@/services/customer-master.service';

import { Field, SelectInput, TabBar, TextAreaInput, TextInput } from './components';

interface FormState {
  code: string;
  name: string;
  firmName: string;
  customerType: string;
  contactPerson: string;
  mobile: string;
  altMobile: string;
  whatsapp: string;
  email: string;
  website: string;
  status: string;
  gstin: string;
  pan: string;
  customerGroup: string;
  customerCategory: string;
  priceList: string;
  paymentTerms: string;
  loyaltyPoints: number;
  creditLimit: number;
  creditDays: number;
  openingBalance: number;
  remarks: string;
}

const emptyForm: FormState = {
  code: '',
  name: '',
  firmName: '',
  customerType: 'retail',
  contactPerson: '',
  mobile: '',
  altMobile: '',
  whatsapp: '',
  email: '',
  website: '',
  status: 'active',
  gstin: '',
  pan: '',
  customerGroup: '',
  customerCategory: '',
  priceList: 'standard',
  paymentTerms: '',
  loyaltyPoints: 0,
  creditLimit: 0,
  creditDays: 0,
  openingBalance: 0,
  remarks: '',
};

interface AddressDraft {
  addressType: string;
  address: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
}

const emptyAddress: AddressDraft = {
  addressType: 'billing',
  address: '',
  village: '',
  taluka: '',
  district: '',
  state: '',
  country: 'India',
  pincode: '',
};

interface ContactDraft {
  contactType: string;
  name: string;
  mobile: string;
  email: string;
  designation: string;
}

const emptyContact: ContactDraft = {
  contactType: 'owner',
  name: '',
  mobile: '',
  email: '',
  designation: '',
};

interface DocumentDraft {
  docType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  notes: string;
}

const emptyDocument: DocumentDraft = {
  docType: 'other',
  fileName: '',
  fileUrl: '',
  fileSize: 0,
  mimeType: '',
  notes: '',
};

const TABS = [
  { key: 'basic', label: 'Basic Information', icon: <Users className="h-4 w-4" /> },
  { key: 'business', label: 'Business Details', icon: <Building2 className="h-4 w-4" /> },
  { key: 'addresses', label: 'Addresses', icon: <MapPin className="h-4 w-4" /> },
  { key: 'contacts', label: 'Contacts', icon: <Phone className="h-4 w-4" /> },
  { key: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { key: 'accounting', label: 'Accounting', icon: <Wallet className="h-4 w-4" /> },
  { key: 'remarks', label: 'Remarks', icon: <StickyNote className="h-4 w-4" /> },
];

export function CreateCustomerPage() {
  return <CustomerFormPage />;
}

export function EditCustomerPage() {
  return <CustomerFormPage isEditing />;
}

function CustomerFormPage({ isEditing = false }: { isEditing?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Child editors
  const [addressDraft, setAddressDraft] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [contactDraft, setContactDraft] = useState(emptyContact);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  const [docDraft, setDocDraft] = useState(emptyDocument);
  const [showDocForm, setShowDocForm] = useState(false);

  const update = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Load reference data
  useEffect(() => {
    void listGroups()
      .then(setGroups)
      .catch(() => undefined);
    void listCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  // Load existing customer (edit mode)
  useEffect(() => {
    if (!isEditing || !id) {
      return;
    }
    setLoading(true);
    Promise.all([getCustomer(id), listAddresses(id), listContacts(id), listDocuments(id)])
      .then(([c, addr, cts, docs]) => {
        setForm({
          code: c.code || '',
          name: c.name || '',
          firmName: c.firmName || '',
          customerType: c.customerType || 'retail',
          contactPerson: c.contactPerson || '',
          mobile: c.mobile || '',
          altMobile: c.altMobile || '',
          whatsapp: c.whatsapp || '',
          email: c.email || '',
          website: c.website || '',
          status: c.status || 'active',
          gstin: c.gstin || '',
          pan: c.pan || '',
          customerGroup: c.groupId || c.customerGroup || '',
          customerCategory: c.categoryId || c.customerCategory || '',
          priceList: c.priceList || 'standard',
          paymentTerms: c.paymentTerms || '',
          loyaltyPoints: Number(c.loyaltyPoints || 0),
          creditLimit: Number(c.creditLimit || 0),
          creditDays: Number(c.creditDays || 0),
          openingBalance: Number(c.openingBalance || 0),
          remarks: c.remarks || '',
        });
        setAddresses(addr || []);
        setContacts(cts || []);
        setDocuments(docs || []);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [isEditing, id]);

  const groupNameById = useMemo(() => {
    const m = new Map(groups.map((g) => [g.id, g.name]));
    return (v: string) => (m.has(v) ? m.get(v)! : v);
  }, [groups]);

  const validate = (): string | null => {
    if (!form.name.trim()) {
      return 'Customer name is required';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Enter a valid email address';
    }
    if (Number(form.creditLimit) < 0) {
      return 'Credit limit cannot be negative';
    }
    if (Number(form.openingBalance) < 0) {
      return 'Opening balance cannot be negative';
    }
    if (form.mobile && !/^(\+?91[\s-]?)?[6-9][0-9]{9}$/.test(form.mobile.replace(/[\s-]/g, ''))) {
      return 'Enter a valid 10-digit mobile number';
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: form.name,
        code: isEditing ? undefined : form.code || undefined,
        firmName: form.firmName || undefined,
        customerType: form.customerType || undefined,
        contactPerson: form.contactPerson || undefined,
        mobile: form.mobile || undefined,
        altMobile: form.altMobile || undefined,
        whatsapp: form.whatsapp || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        status: form.status as CustomerStatus,
        gstin: form.gstin || undefined,
        pan: form.pan || undefined,
        customerGroup: groupNameById(form.customerGroup) || undefined,
        customerCategory: categoryNameById(form.customerCategory) || undefined,
        priceList: form.priceList || 'standard',
        paymentTerms: form.paymentTerms || undefined,
        loyaltyPoints: Number(form.loyaltyPoints) || 0,
        creditLimit: Number(form.creditLimit) || 0,
        creditDays: Number(form.creditDays) || 0,
        openingBalance: Number(form.openingBalance) || 0,
        remarks: form.remarks || undefined,
      };

      let customerId: string;
      if (isEditing && id) {
        await updateCustomer(id, payload);
        customerId = id;
      } else {
        const created = await createCustomer(payload);
        customerId = created.id;
      }

      // Persist child records (add-only diff is fine — edits saved below too)
      await persistChildren(customerId);
      setSuccess(isEditing ? 'Customer updated successfully' : 'Customer created successfully');
      setTimeout(() => navigate('/customers'), 700);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const categoryNameById = (v: string) => {
    const m = new Map(categories.map((c) => [c.id, c.name]));
    return m.has(v) ? m.get(v)! : v;
  };

  // ── Child persistence ───────────────────────────────────────
  // Rows with a `new-` client id are newly added → POST. Rows with a real id
  // were already persisted (server writes happen in the edit handlers).
  const persistChildren = async (customerId: string) => {
    for (const a of addresses) {
      if (String(a.id).startsWith('new-')) {
        await createAddress(customerId, {
          addressType: a.addressType,
          address: a.address,
          village: a.village,
          taluka: a.taluka,
          district: a.district,
          state: a.state,
          country: a.country,
          pincode: a.pincode,
          isDefault: a.isDefault,
        });
      }
    }
    for (const c of contacts) {
      if (String(c.id).startsWith('new-')) {
        await createContact(customerId, {
          contactType: c.contactType,
          name: c.name,
          mobile: c.mobile,
          email: c.email,
          designation: c.designation,
          isPrimary: c.isPrimary,
        });
      }
    }
    for (const d of documents) {
      if (String(d.id).startsWith('new-')) {
        await createDocument(customerId, {
          docType: d.docType,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
          notes: d.notes,
        });
      }
    }
  };

  // ── Address handlers ─────────────────────────────────────────
  const startAddAddress = () => {
    setAddressDraft(emptyAddress);
    setEditingAddressId(null);
    setShowAddressForm(true);
  };

  const startEditAddress = (a: CustomerAddress) => {
    setAddressDraft({
      addressType: a.addressType,
      address: a.address || '',
      village: a.village || '',
      taluka: a.taluka || '',
      district: a.district || '',
      state: a.state || '',
      country: a.country || 'India',
      pincode: a.pincode || '',
    });
    setEditingAddressId(a.id);
    setShowAddressForm(true);
  };

  const saveAddress = async () => {
    if (!addressDraft.address && !addressDraft.village && !addressDraft.district) {
      setError('Address line is required');
      return;
    }
    setError(null);
    try {
      if (editingAddressId) {
        // Real customer id from the route param; server validates ownership.
        if (id) {
          await updateAddress(id, editingAddressId, addressDraft as any);
        }
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingAddressId ? { ...a, ...(addressDraft as any) } : a)),
        );
      } else {
        setAddresses((prev) => [
          ...prev,
          { ...addressDraft, id: `new-${Date.now()}`, customerId: '', isDefault: false } as any,
        ]);
      }
      setShowAddressForm(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeAddress = async (a: CustomerAddress) => {
    if (!String(a.id).startsWith('new-')) {
      await deleteAddress(a.customerId, a.id).catch(() => undefined);
    }
    setAddresses((prev) => prev.filter((x) => x.id !== a.id));
  };

  // ── Contact handlers ─────────────────────────────────────────
  const startAddContact = () => {
    setContactDraft(emptyContact);
    setEditingContactId(null);
    setShowContactForm(true);
  };

  const startEditContact = (c: CustomerContact) => {
    setContactDraft({
      contactType: c.contactType,
      name: c.name,
      mobile: c.mobile || '',
      email: c.email || '',
      designation: c.designation || '',
    });
    setEditingContactId(c.id);
    setShowContactForm(true);
  };

  const saveContact = async () => {
    if (!contactDraft.name.trim()) {
      setError('Contact name is required');
      return;
    }
    setError(null);
    try {
      if (editingContactId) {
        // Persist edits server-side (real id → already existing row).
        if (id) {
          await updateContact(id, editingContactId, {
            contactType: contactDraft.contactType as any,
            name: contactDraft.name,
            mobile: contactDraft.mobile || undefined,
            email: contactDraft.email || undefined,
            designation: contactDraft.designation || undefined,
          });
        }
        setContacts((prev) =>
          prev.map((c) => (c.id === editingContactId ? { ...c, ...(contactDraft as any) } : c)),
        );
      } else {
        setContacts((prev) => [
          ...prev,
          { ...contactDraft, id: `new-${Date.now()}`, customerId: '', isPrimary: false } as any,
        ]);
      }
      setShowContactForm(false);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeContact = async (c: CustomerContact) => {
    if (!String(c.id).startsWith('new-')) {
      await deleteContact(c.customerId, c.id).catch(() => undefined);
    }
    setContacts((prev) => prev.filter((x) => x.id !== c.id));
  };

  // ── Document handlers ────────────────────────────────────────
  const saveDocument = () => {
    if (!docDraft.fileName.trim()) {
      setError('Document name is required');
      return;
    }
    setError(null);
    setDocuments((prev) => [
      ...prev,
      { ...docDraft, id: `new-${Date.now()}`, customerId: '' } as any,
    ]);
    setDocDraft(emptyDocument);
    setShowDocForm(false);
  };

  const removeDocument = async (d: CustomerDocument) => {
    if (!String(d.id).startsWith('new-')) {
      await deleteDocument(d.customerId, d.id).catch(() => undefined);
    }
    setDocuments((prev) => prev.filter((x) => x.id !== d.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isEditing ? 'Edit Customer' : 'Create Customer'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isEditing
              ? `Update customer master — ${form.name || form.code}`
              : 'Enterprise customer master — ग्राहक नोंदणी'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<X className="h-4 w-4" />}
            onClick={() => navigate('/customers')}
          >
            Cancel
          </Button>
          <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          {success}
        </div>
      )}

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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        {tab === 'basic' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Customer Name" required>
              <TextInput
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Enter customer name"
              />
            </Field>
            <Field
              label="Customer Code"
              hint={
                isEditing
                  ? 'Code cannot be changed after creation'
                  : 'Leave blank for auto-generation (CUS-0001)'
              }
            >
              <TextInput
                value={form.code}
                onChange={(e) => update('code', e.target.value)}
                placeholder="CUS-0001"
                disabled={isEditing}
              />
            </Field>
            <Field label="Firm Name">
              <TextInput
                value={form.firmName}
                onChange={(e) => update('firmName', e.target.value)}
                placeholder="Firm / business name"
              />
            </Field>
            <Field label="Customer Type">
              <SelectInput
                value={form.customerType}
                onChange={(e) => update('customerType', e.target.value)}
              >
                {CUSTOMER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Contact Person">
              <TextInput
                value={form.contactPerson}
                onChange={(e) => update('contactPerson', e.target.value)}
                placeholder="Person name"
              />
            </Field>
            <Field label="Mobile" hint="10-digit Indian mobile">
              <TextInput
                value={form.mobile}
                onChange={(e) => update('mobile', e.target.value)}
                placeholder="9876543210"
              />
            </Field>
            <Field label="Alternate Mobile">
              <TextInput
                value={form.altMobile}
                onChange={(e) => update('altMobile', e.target.value)}
                placeholder="Alternate number"
              />
            </Field>
            <Field label="WhatsApp">
              <TextInput
                value={form.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
                placeholder="WhatsApp number"
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="customer@example.com"
              />
            </Field>
            <Field label="Website">
              <TextInput
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://…"
              />
            </Field>
            <Field label="Status">
              <SelectInput value={form.status} onChange={(e) => update('status', e.target.value)}>
                {CUSTOMER_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        )}

        {tab === 'business' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="GSTIN" hint="Format: 22AAAAA0000A1Z5 — duplicate GSTIN is blocked">
              <TextInput
                value={form.gstin}
                onChange={(e) => update('gstin', e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
              />
            </Field>
            <Field label="PAN" hint="Format: AAAAA0000A">
              <TextInput
                value={form.pan}
                onChange={(e) => update('pan', e.target.value.toUpperCase())}
                placeholder="AAAAA0000A"
              />
            </Field>
            <Field label="Customer Group">
              <SelectInput
                value={form.customerGroup}
                onChange={(e) => update('customerGroup', e.target.value)}
              >
                <option value="">— None —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
                {groups.length === 0 && <option value="">Default groups loading…</option>}
              </SelectInput>
            </Field>
            <Field label="Customer Category">
              <SelectInput
                value={form.customerCategory}
                onChange={(e) => update('customerCategory', e.target.value)}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Price List">
              <SelectInput
                value={form.priceList}
                onChange={(e) => update('priceList', e.target.value)}
              >
                <option value="standard">Standard</option>
                <option value="wholesale">Wholesale</option>
                <option value="retail">Retail</option>
                <option value="promotional">Promotional</option>
                <option value="contract">Contract</option>
              </SelectInput>
            </Field>
            <Field label="Payment Terms">
              <TextInput
                value={form.paymentTerms}
                onChange={(e) => update('paymentTerms', e.target.value)}
                placeholder="30 days"
              />
            </Field>
            <Field label="Loyalty Points">
              <TextInput
                type="number"
                min={0}
                value={String(form.loyaltyPoints)}
                onChange={(e) => update('loyaltyPoints', Number(e.target.value))}
              />
            </Field>
          </div>
        )}

        {tab === 'addresses' && (
          <div className="space-y-4">
            {!showAddressForm && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={startAddAddress}
              >
                Add Address
              </Button>
            )}
            {showAddressForm && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-900/10">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Address Type">
                    <SelectInput
                      value={addressDraft.addressType}
                      onChange={(e) =>
                        setAddressDraft({ ...addressDraft, addressType: e.target.value as any })
                      }
                    >
                      {ADDRESS_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Address" required>
                    <TextInput
                      value={addressDraft.address}
                      onChange={(e) =>
                        setAddressDraft({ ...addressDraft, address: e.target.value })
                      }
                      placeholder="Street, building, area…"
                    />
                  </Field>
                  <Field label="Village">
                    <TextInput
                      value={addressDraft.village}
                      onChange={(e) =>
                        setAddressDraft({ ...addressDraft, village: e.target.value })
                      }
                      placeholder="Village"
                    />
                  </Field>
                  <Field label="Taluka">
                    <TextInput
                      value={addressDraft.taluka}
                      onChange={(e) => setAddressDraft({ ...addressDraft, taluka: e.target.value })}
                      placeholder="Taluka"
                    />
                  </Field>
                  <Field label="District">
                    <TextInput
                      value={addressDraft.district}
                      onChange={(e) =>
                        setAddressDraft({ ...addressDraft, district: e.target.value })
                      }
                      placeholder="District"
                    />
                  </Field>
                  <Field label="State">
                    <TextInput
                      value={addressDraft.state}
                      onChange={(e) => setAddressDraft({ ...addressDraft, state: e.target.value })}
                      placeholder="State"
                    />
                  </Field>
                  <Field label="Country">
                    <TextInput
                      value={addressDraft.country}
                      onChange={(e) =>
                        setAddressDraft({ ...addressDraft, country: e.target.value })
                      }
                      placeholder="India"
                    />
                  </Field>
                  <Field label="Pincode">
                    <TextInput
                      value={addressDraft.pincode}
                      onChange={(e) =>
                        setAddressDraft({ ...addressDraft, pincode: e.target.value })
                      }
                      placeholder="PIN"
                    />
                  </Field>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" onClick={saveAddress}>
                    Save Address
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddressForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {addresses.length === 0 && !showAddressForm && (
              <p className="py-6 text-center text-sm text-slate-400">
                No addresses — billing, shipping or branch addresses can be added
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {addresses.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium capitalize text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                      <MapPin className="h-3 w-3" /> {a.addressType}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditAddress(a)}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeAddress(a)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                    {a.address || '—'}
                    {a.village && (
                      <span className="block text-xs text-slate-400">Village: {a.village}</span>
                    )}
                    {a.taluka && (
                      <span className="block text-xs text-slate-400">Taluka: {a.taluka}</span>
                    )}
                    {(a.district || a.state) && (
                      <span className="block text-xs text-slate-400">
                        {[a.district, a.state].filter(Boolean).join(', ')}{' '}
                        {a.pincode ? `- ${a.pincode}` : ''}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'contacts' && (
          <div className="space-y-4">
            {!showContactForm && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={startAddContact}
              >
                Add Contact
              </Button>
            )}
            {showContactForm && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-900/10">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Contact Type">
                    <SelectInput
                      value={contactDraft.contactType}
                      onChange={(e) =>
                        setContactDraft({ ...contactDraft, contactType: e.target.value as any })
                      }
                    >
                      {CONTACT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Name" required>
                    <TextInput
                      value={contactDraft.name}
                      onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })}
                      placeholder="Person name"
                    />
                  </Field>
                  <Field label="Designation">
                    <TextInput
                      value={contactDraft.designation}
                      onChange={(e) =>
                        setContactDraft({ ...contactDraft, designation: e.target.value })
                      }
                      placeholder="Manager"
                    />
                  </Field>
                  <Field label="Mobile">
                    <TextInput
                      value={contactDraft.mobile}
                      onChange={(e) => setContactDraft({ ...contactDraft, mobile: e.target.value })}
                      placeholder="Mobile"
                    />
                  </Field>
                  <Field label="Email">
                    <TextInput
                      type="email"
                      value={contactDraft.email}
                      onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })}
                      placeholder="Email"
                    />
                  </Field>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" onClick={saveContact}>
                    Save Contact
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowContactForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {contacts.length === 0 && !showContactForm && (
              <p className="py-6 text-center text-sm text-slate-400">
                No contacts — owner, accounts, purchase or sales contacts
              </p>
            )}
            <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {c.name}{' '}
                      <span className="ml-1 text-[10px] font-normal capitalize text-slate-400">
                        ({c.contactType})
                      </span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {[c.mobile, c.email, c.designation].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => startEditContact(c)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeContact(c)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-4">
            {!showDocForm && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setShowDocForm(true)}
              >
                Add Document
              </Button>
            )}
            {showDocForm && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-900/10">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Document Type">
                    <SelectInput
                      value={docDraft.docType}
                      onChange={(e) => setDocDraft({ ...docDraft, docType: e.target.value as any })}
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="File Name" required>
                    <TextInput
                      value={docDraft.fileName}
                      onChange={(e) => setDocDraft({ ...docDraft, fileName: e.target.value })}
                      placeholder="GST certificate.pdf"
                    />
                  </Field>
                  <Field label="File URL / Reference">
                    <TextInput
                      value={docDraft.fileUrl}
                      onChange={(e) => setDocDraft({ ...docDraft, fileUrl: e.target.value })}
                      placeholder="Link to stored file (optional)"
                    />
                  </Field>
                  <Field label="Notes">
                    <TextInput
                      value={docDraft.notes}
                      onChange={(e) => setDocDraft({ ...docDraft, notes: e.target.value })}
                      placeholder="Remarks"
                    />
                  </Field>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" onClick={saveDocument}>
                    Save Document
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDocForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {documents.length === 0 && !showDocForm && (
              <p className="py-6 text-center text-sm text-slate-400">
                No documents — GST certificate, PAN, agreement, shop license…
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {d.fileName}
                    </p>
                    <p className="text-[11px] capitalize text-slate-400">
                      {d.docType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeDocument(d)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'accounting' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Credit Limit (₹)" hint="Business rule: cannot be negative">
              <TextInput
                type="number"
                min={0}
                value={String(form.creditLimit)}
                onChange={(e) => update('creditLimit', Number(e.target.value))}
              />
            </Field>
            <Field label="Credit Days">
              <TextInput
                type="number"
                min={0}
                value={String(form.creditDays)}
                onChange={(e) => update('creditDays', Number(e.target.value))}
                placeholder="30"
              />
            </Field>
            <Field label="Opening Balance (₹)" hint="Applied on the financial ledger">
              <TextInput
                type="number"
                min={0}
                value={String(form.openingBalance)}
                onChange={(e) => update('openingBalance', Number(e.target.value))}
              />
            </Field>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <p className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                <Landmark className="h-4 w-4" /> Linked financial ledger
              </p>
              <p className="mt-1.5 leading-relaxed">
                Customer records are synced 1:1 with the ledger master — outstanding, payments and
                credit limits are tracked automatically by the sales & payment engines.
              </p>
            </div>
          </div>
        )}

        {tab === 'remarks' && (
          <div className="space-y-4">
            <Field label="Remarks" hint="Internal notes — shown on the customer profile">
              <TextAreaInput
                rows={6}
                value={form.remarks}
                onChange={(e) => update('remarks', e.target.value)}
                placeholder="Additional notes about this customer…"
              />
            </Field>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <p className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                <Globe className="h-4 w-4" /> Did you know?
              </p>
              <p className="mt-1.5">
                Every create, update, status change and credit change is written to the audit trail
                for compliance. Blocked customers cannot purchase on credit.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate('/customers')}>
          Cancel
        </Button>
        <Button icon={<Save className="h-4 w-4" />} loading={saving} onClick={handleSave}>
          {isEditing ? 'Save Changes' : 'Create Customer'}
        </Button>
      </div>
    </div>
  );
}
