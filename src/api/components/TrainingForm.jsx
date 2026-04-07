import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TRAINING_FIELDS, SPORT_SESSION_TYPES } from '@/lib/sports-config';

const TrainingForm = ({ sport, onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    session_type: '',
    ...initialData
  });
  
  const [errors, setErrors] = useState({});

  const fields = TRAINING_FIELDS[sport] || [];
  const sessionTypes = SPORT_SESSION_TYPES[sport] || [];

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
    
    // Check required fields
    fields.forEach(field => {
      if (field.required && !formData[field.key]) {
        newErrors[field.key] = `${field.label} 是Required项`;
      }
    });
    
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

  const renderField = (field) => {
    const value = formData[field.key] || '';
    const error = errors[field.key];

    switch (field.type) {
      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id={field.key}
                type="number"
                value={value}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                placeholder={`Please enter${field.label}`}
                className={error ? 'border-red-500' : ''}
              />
              {field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'text':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id={field.key}
                type="text"
                value={value}
                onChange={(e) => handleInputChange(field.key, e.target.value)}
                placeholder={`Please enter${field.label}`}
                className={error ? 'border-red-500' : ''}
              />
              {field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Textarea
              id={field.key}
              value={value}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={`Please enter${field.label}`}
              rows={3}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training记录 - {sport}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Type Selection */}
          {sessionTypes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="session_type">Training类型</Label>
              <Select
                value={formData.session_type}
                onValueChange={(value) => handleInputChange('session_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择Training类型" />
                </SelectTrigger>
                <SelectContent>
                  {sessionTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dynamic Fields */}
          <div className="grid gap-4">
            {fields.map(renderField)}
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full">
            SaveTraining记录
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TrainingForm;
