import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { api } from '@/api';
import { useLanguage } from '@/lib/LanguageContext';
import { getTranslation } from '@/lib/translations';

const Login = () => {
  const { language, toggleLanguage } = useLanguage();
  const t = (key) => getTranslation(language, key);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await api.auth.login({
        email: formData.email,
        password: formData.password,
      });

      if (result?.token) {
        localStorage.setItem('ph_sports_access_token', result.token);
      }

      window.location.href = '/';
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || t('checkEmailPassword');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button
          onClick={toggleLanguage}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {language === 'zh' ? '🇬🇧 EN' : '🇨🇳 中'}
        </Button>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{t('loginTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('enterEmail')}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t('enterPassword')}
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('loggingIn') : t('loginButton')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {t('noAccount')}{' '}
            <Link to="/register" className="text-primary hover:underline">
              {t('registerNow')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
