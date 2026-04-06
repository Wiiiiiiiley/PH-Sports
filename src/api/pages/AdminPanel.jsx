import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Shield, Edit, AlertTriangle, Loader2, Save, X, ChevronDown, Users } from 'lucide-react';
import { SPORT_ICONS } from '@/lib/sports-config';

const AdminPanel = () => {
  const { user: currentUser, checkUserAuth } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [teamMemberships, setTeamMemberships] = useState([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [expandedSports, setExpandedSports] = useState({});

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin && currentUser) {
      setEditForm({
        full_name: currentUser.full_name || '',
        email: currentUser.email || '',
        password: '',
        confirmPassword: ''
      });
      fetchTeamMemberships();
    }
  }, [isAdmin, currentUser]);

  const fetchTeamMemberships = async () => {
    try {
      setLoadingMemberships(true);
      const data = await api.entities.TeamMembership.list();
      setTeamMemberships(data || []);
    } catch (err) {
      console.error('Failed to fetch team memberships:', err);
    } finally {
      setLoadingMemberships(false);
    }
  };

  const groupedByTeam = teamMemberships.reduce((acc, membership) => {
    const sport = membership.sport || '未分配';
    if (!acc[sport]) {
      acc[sport] = [];
    }
    acc[sport].push(membership);
    return acc;
  }, {});

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!editForm.full_name.trim()) {
        setError('请输入姓名');
        setLoading(false);
        return;
      }
      if (!editForm.email.trim()) {
        setError('请输入邮箱');
        setLoading(false);
        return;
      }
      if (editForm.password && editForm.password !== editForm.confirmPassword) {
        setError('两次输入的密码不一致');
        setLoading(false);
        return;
      }

      const updates = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim()
      };

      if (editForm.password) {
        updates.password = editForm.password;
      }

      await api.auth.updateMe(updates);
      await checkUserAuth();

      setSuccess('管理员信息更新成功！');
      setIsEditDialogOpen(false);

      setEditForm(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } catch (err) {
      setError(err?.response?.data?.error || '更新失败，请重试');
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
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              修改信息
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>修改管理员信息</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">管理员姓名 *</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="输入管理员姓名"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">管理员邮箱 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="输入管理员邮箱"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">新密码（可选）</Label>
                <Input
                  id="password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="留空则不修改密码"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="再次输入新密码"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-500">{success}</p>}

              <div className="flex space-x-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      保存修改
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Admin Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>当前管理员信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">姓名</Label>
              <p className="text-lg font-medium">{currentUser?.full_name || '未设置'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">邮箱</Label>
              <p className="text-lg font-medium">{currentUser?.email || '未设置'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">角色</Label>
              <p className="text-lg font-medium">管理员</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">创建时间</Label>
              <p className="text-lg font-medium">
                {currentUser?.created_at
                  ? format(new Date(currentUser.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })
                  : '未知'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Memberships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            队伍成员管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMemberships ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedByTeam).length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无队伍成员</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedByTeam)
                .sort(([sportA], [sportB]) => sportA.localeCompare(sportB))
                .map(([sport, members]) => (
                  <Collapsible
                    key={sport}
                    open={expandedSports[sport] || false}
                    onOpenChange={(open) => setExpandedSports(prev => ({ ...prev, [sport]: open }))}
                    className="border rounded-lg"
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <ChevronDown 
                            className={`h-5 w-5 transition-transform ${expandedSports[sport] ? 'rotate-180' : ''}`}
                          />
                          <span className="text-lg">
                            {SPORT_ICONS[sport] || '🏀'}
                          </span>
                          <span className="font-semibold">{sport}</span>
                          <span className="text-sm text-muted-foreground">({members.length} 名学生)</span>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-2 border-t pt-4">
                        {members.map((member, idx) => (
                          <div
                            key={member.id || idx}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{member.user_name || '未知'}</p>
                              <p className="text-xs text-muted-foreground">{member.user_email || '未知'}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.created_at ? format(new Date(member.created_at), 'MM-dd', { locale: zhCN }) : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 系统只允许一个管理员账号</p>
          <p>• 管理员可以修改自己的姓名、邮箱和密码</p>
          <p>• 密码字段留空表示不修改密码</p>
          <p>• 修改邮箱后需要使用新邮箱登录</p>
          <p>• 请妥善保管管理员账号信息</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
