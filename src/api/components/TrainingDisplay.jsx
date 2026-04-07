import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TRAINING_FIELDS, SPORT_COLORS } from '@/lib/sports-config';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

const TrainingDisplay = ({ trainingLog, sport }) => {
  const fields = TRAINING_FIELDS[sport] || [];
  const sportColors = SPORT_COLORS[sport] || {};
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm', { locale: enUS });
    } catch {
      return dateString;
    }
  };

  const renderFieldValue = (field, value) => {
    if (!value && value !== 0) return '-';
    
    switch (field.type) {
      case 'number':
        return `${value}${field.unit || ''}`;
      case 'text':
        return value;
      case 'textarea':
        return value || '-';
      default:
        return value;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {sport} Training记录
          </CardTitle>
          <div className="flex items-center space-x-2">
            {trainingLog.session_type && (
              <Badge variant="outline" className={`${sportColors.text} border-current`}>
                {trainingLog.session_type.charAt(0).toUpperCase() + trainingLog.session_type.slice(1)}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {formatDate(trainingLog.created_at)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {fields.map(field => {
            const value = trainingLog.data?.[field.key];
            return (
              <div key={field.key} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                <span className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </span>
                <span className="text-sm font-semibold">
                  {renderFieldValue(field, value)}
                </span>
              </div>
            );
          })}
          
          {trainingLog.notes && (
            <div className="pt-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">Training笔记</p>
              <p className="text-sm">{trainingLog.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrainingDisplay;
