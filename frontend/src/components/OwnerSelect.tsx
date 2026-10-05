import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { ROLE_LABEL } from '@/lib/types';

/** Owner picker shown only to ADMIN/MANAGER (SALES always own their records). */
export function OwnerSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { data: users = [] } = useUsers();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id="ownerId">
        <SelectValue placeholder="Saya sendiri" />
      </SelectTrigger>
      <SelectContent>
        {users
          .filter((u) => u.isActive)
          .map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name} · {ROLE_LABEL[u.role]}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
