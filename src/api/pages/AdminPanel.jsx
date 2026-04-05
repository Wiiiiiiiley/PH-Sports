import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Trash2, UserPlus, Shield, AlertTriangle, Loader2 } from 'lucide-react';

const AdminPanel = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    name: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAdmins();
    }
  }, [isAdmin]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const allUsers = await api.entities.User.filter({ role: 'admin' });
      setAdmins(allUsers);
    } catch (err) {
      setError('加载管理员列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if admin already exists
      const existingAdmin = admins.find(admin => admin.email === newAdmin.email);
      if (existingAdmin) {
        setError('该邮箱已经是管理员');
        setLoading(false);
        return;
      }

      // Create admin account
      // In our current backend, we might need a specific endpoint or just use register
      // For now, let's use the register endpoint but we'll need to update the role afterwards
      // or the backend should allow admins to create users.
      
      // Let's assume the admin can update roles
      const result = await api.auth.register({
        email: newAdmin.email,
        password: newAdmin.password,
        full_name: newAdmin.name,
      });

      if (result?.user?.id) {
        await api.entities.User.update(result.user.id, { role: 'admin' });
      }

      setSuccess('管理员创建成功！');
      loadAdmins();
      setNewAdmin({ email: '', name: '', password: '' });
      setIsCreateDialogOpen(false);
    } catch (err) {
      setError(err?.response?.data?.error || '创建管理员失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    const adminToDelete = admins.find(admin => admin.id === adminId);
    if (adminToDelete?.email === 'admin@sportsync.edu') {
      setError('不能删除系统主管理员');
      return;
    }

    if (!window.confirm(`确定要移除管理员 ${adminToDelete?.full_name} 吗？此操作将把其角色降级为学生。`)) {
      return;
    }

    try {
      setLoading(true);
      // Instead of deleting, we downgrade the role
      await api.entities.User.update(adminId, { role: 'student' });
      setSuccess('管理员移除成功！');
      loadAdmins();
    } catch (err) {
      setError('操作失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            访问被拒绝：只有管理员可以访问此页面
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <Shield className="h-8 w-8 mr-2" />
          管理员管理
        </h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              创建管理员
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建新管理员</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">管理员邮箱 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="输入管理员邮箱"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">管理员姓名 *</Label>
                <Input
                  id="name"
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入管理员姓名"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">初始密码 *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="输入初始密码"
                  required
                />
              </div>
              
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-500">{success}</p>}
              
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? '创建中...' : '创建管理员'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                  取消
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admins List */}
      <Card>
        <CardHeader>
          <CardTitle>管理员列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>创建者</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.full_name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    {admin.created_at ? format(new Date(admin.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '—'}
                  </TableCell>
                  <TableCell>系统</TableCell>
                  <TableCell>
                    {admin.email !== 'admin@sportsync.edu' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin.id)}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {admins.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    暂无管理员
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 只有管理员可以访问此页面</p>
          <p>• 创建的管理员账号可以直接登录，无需注册</p>
          <p>• 普通用户无法通过注册成为管理员</p>
          <p>• 系统管理员无法删除</p>
          <p>• 请妥善保管管理员密码</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
