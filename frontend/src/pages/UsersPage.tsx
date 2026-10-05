import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormField, PageHeader } from '@/components/shared';
import { useMe } from '@/hooks/useAuth';
import { useCreateUser, useUpdateUser, useUsers } from '@/hooks/useUsers';
import { getErrorMessage } from '@/lib/api';
import { ROLES, ROLE_LABEL, type User } from '@/lib/types';
import { formatDate } from '@/lib/utils';

const passwordRule = z
  .string()
  .min(8, 'Minimal 8 karakter')
  .max(128)
  .regex(/[A-Za-z]/, 'Harus mengandung huruf')
  .regex(/[0-9]/, 'Harus mengandung angka');

const schema = z.object({
  name: z.string().trim().min(2, 'Minimal 2 karakter').max(100),
  email: z.email('Email tidak valid'),
  // Optional on edit: empty means "keep current password".
  password: z.union([z.literal(''), passwordRule]),
  role: z.enum(ROLES),
  isActive: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

function UserFormDialog({ open, onOpenChange, user }: { open: boolean; onOpenChange: (o: boolean) => void; user: User | null }) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isEdit = !!user;

  const { register, handleSubmit, control, reset, formState, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        role: user?.role ?? 'SALES',
        isActive: user?.isActive === false ? 'false' : 'true',
      });
    }
  }, [open, user, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          id: user.id,
          name: v.name,
          email: v.email,
          role: v.role,
          isActive: v.isActive === 'true',
          ...(v.password && { password: v.password }),
        });
      } else {
        if (!v.password) {
          setError('password', { message: 'Password wajib diisi' });
          return;
        }
        await createUser.mutateAsync({ name: v.name, email: v.email, password: v.password, role: v.role });
      }
      toast.success(isEdit ? 'User diperbarui' : 'User dibuat');
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Tambah User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField label="Nama" htmlFor="u-name" error={formState.errors.name?.message}>
            <Input id="u-name" {...register('name')} />
          </FormField>
          <FormField label="Email" htmlFor="u-email" error={formState.errors.email?.message}>
            <Input id="u-email" type="email" {...register('email')} />
          </FormField>
          <FormField
            label={isEdit ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'}
            htmlFor="u-password"
            error={formState.errors.password?.message}
          >
            <Input id="u-password" type="password" autoComplete="new-password" {...register('password')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Role" htmlFor="u-role">
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="u-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {isEdit && (
              <FormField label="Status" htmlFor="u-active">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="u-active">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Aktif</SelectItem>
                        <SelectItem value="false">Nonaktif</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { data: me } = useMe();
  const { data: users, isLoading } = useUsers();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  return (
    <>
      <PageHeader
        title="Manajemen User"
        description="Kelola akun dan role tim (Admin, Manager, Sales)"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Tambah User
          </Button>
        }
      />
      <Card className="py-4">
        <CardContent className="px-4">
          {isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Login terakhir</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name} {u.id === me?.id && <span className="text-xs text-muted-foreground">(Anda)</span>}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'ADMIN' ? 'violet' : u.role === 'MANAGER' ? 'blue' : 'secondary'}>
                        {ROLE_LABEL[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(u.lastLoginAt, true)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(u);
                          setFormOpen(true);
                        }}
                        title="Edit"
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />
    </>
  );
}
