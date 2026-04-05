import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SPORT_VENUES, VENUE_SPORTS } from '@/lib/sports-config';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const VenueBookingForm = ({ booking, onSubmit, onCancel, userRole = 'student' }) => {
  const [formData, setFormData] = useState({
    venue: booking?.venue || '',
    sport: booking?.sport || '',
    date: booking?.date || new Date(),
    timeSlot: booking?.timeSlot || '',
    duration: booking?.duration || 1,
    purpose: booking?.purpose || '',
    ...booking
  });
  
  const [errors, setErrors] = useState({});

  const venues = formData.sport 
    ? SPORT_VENUES[formData.sport] || []
    : Object.values(SPORT_VENUES).flat();

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => ({
        ...prev,
        [key]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.venue) newErrors.venue = '请选择场地';
    if (!formData.sport) newErrors.sport = '请选择运动类型';
    if (!formData.date) newErrors.date = '请选择日期';
    if (!formData.timeSlot) newErrors.timeSlot = '请选择时间段';
    if (!formData.purpose) newErrors.purpose = '请填写预约用途';
    if (!formData.duration || formData.duration < 1) newErrors.duration = '预约时长至少1小时';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSubmit(formData);
  };

  const isEditing = !booking?.isNew;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? '场地预约详情' : '新建场地预约'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sport Selection */}
          <div className="space-y-2">
            <Label htmlFor="sport">运动类型 *</Label>
            <Select
              value={formData.sport}
              onValueChange={(value) => handleInputChange('sport', value)}
              disabled={isEditing}
            >
              <SelectTrigger className={errors.sport ? 'border-red-500' : ''}>
                <SelectValue placeholder="选择运动类型" />
              </SelectTrigger>
              <SelectContent>
                {VENUE_SPORTS.map(sport => (
                  <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sport && <p className="text-sm text-red-500">{errors.sport}</p>}
          </div>

          {/* Venue Selection */}
          <div className="space-y-2">
            <Label htmlFor="venue">场地 *</Label>
            <Select
              value={formData.venue}
              onValueChange={(value) => handleInputChange('venue', value)}
              disabled={isEditing}
            >
              <SelectTrigger className={errors.venue ? 'border-red-500' : ''}>
                <SelectValue placeholder="选择场地" />
              </SelectTrigger>
              <SelectContent>
                {venues.map(venue => (
                  <SelectItem key={venue} value={venue}>{venue}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.venue && <p className="text-sm text-red-500">{errors.venue}</p>}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">预约日期 *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date ? format(formData.date, 'yyyy-MM-dd') : ''}
              onChange={(e) => handleInputChange('date', new Date(e.target.value))}
              min={format(new Date(), 'yyyy-MM-dd')}
              disabled={isEditing}
              className={errors.date ? 'border-red-500' : ''}
            />
            {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
          </div>

          {/* Time Slot Selection */}
          <div className="space-y-2">
            <Label htmlFor="timeSlot">开始时间 *</Label>
            <Select
              value={formData.timeSlot}
              onValueChange={(value) => handleInputChange('timeSlot', value)}
              disabled={isEditing}
            >
              <SelectTrigger className={errors.timeSlot ? 'border-red-500' : ''}>
                <SelectValue placeholder="选择开始时间" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="07:00">07:00</SelectItem>
                <SelectItem value="08:00">08:00</SelectItem>
                <SelectItem value="09:00">09:00</SelectItem>
                <SelectItem value="10:00">10:00</SelectItem>
                <SelectItem value="11:00">11:00</SelectItem>
                <SelectItem value="14:00">14:00</SelectItem>
                <SelectItem value="15:00">15:00</SelectItem>
                <SelectItem value="16:00">16:00</SelectItem>
                <SelectItem value="17:00">17:00</SelectItem>
                <SelectItem value="18:00">18:00</SelectItem>
                <SelectItem value="19:00">19:00</SelectItem>
                <SelectItem value="20:00">20:00</SelectItem>
              </SelectContent>
            </Select>
            {errors.timeSlot && <p className="text-sm text-red-500">{errors.timeSlot}</p>}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">预约时长 (小时) *</Label>
            <Select
              value={formData.duration.toString()}
              onValueChange={(value) => handleInputChange('duration', parseInt(value))}
              disabled={isEditing}
            >
              <SelectTrigger className={errors.duration ? 'border-red-500' : ''}>
                <SelectValue placeholder="选择预约时长" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1小时</SelectItem>
                <SelectItem value="2">2小时</SelectItem>
                <SelectItem value="3">3小时</SelectItem>
                <SelectItem value="4">4小时</SelectItem>
              </SelectContent>
            </Select>
            {errors.duration && <p className="text-sm text-red-500">{errors.duration}</p>}
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="purpose">预约用途 *</Label>
            <Textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => handleInputChange('purpose', e.target.value)}
              placeholder="请描述预约用途，例如：篮球队训练、个人练习等"
              rows={3}
              disabled={isEditing && userRole !== 'teacher'}
              className={errors.purpose ? 'border-red-500' : ''}
            />
            {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}
          </div>

          {/* Booking Info */}
          {isEditing && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">预约信息</h4>
              <div className="text-sm text-muted-foreground">
                <p>预约人: {booking.bookedBy}</p>
                <p>提交时间: {booking.created_at ? format(new Date(booking.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '-'}</p>
                <p>状态: {booking.status}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4">
            {!isEditing && (
              <Button type="submit" className="flex-1">
                提交预约
              </Button>
            )}
            
            {isEditing && userRole === 'teacher' && booking.status === 'pending' && (
              <>
                <Button type="button" variant="default" className="flex-1" onClick={() => onSubmit({ ...formData, status: 'approved' })}>
                  批准预约
                </Button>
                <Button type="button" variant="destructive" className="flex-1" onClick={() => onSubmit({ ...formData, status: 'rejected' })}>
                  拒绝预约
                </Button>
              </>
            )}
            
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              {isEditing ? '关闭' : '取消'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default VenueBookingForm;
