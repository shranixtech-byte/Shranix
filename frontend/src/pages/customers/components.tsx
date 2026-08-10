// ═════════════════════════════════════════════════════════
// CUSTOMER UI COMPONENTS — re-exported from the shared party
// module so Customer Master and Supplier Master share one set.
// ═════════════════════════════════════════════════════════

import { PartyAvatar } from '@/components/party/party-ui';

export {
  StatusBadge,
  PartyAvatar as CustomerAvatar,
  StatCard,
  TabBar,
  Field,
  TextInput,
  SelectInput,
  TextAreaInput,
} from '@/components/party/party-ui';
export type { PartyStatus as CustomerStatus } from '@/services/party-master.types';

export { PartyAvatar };
