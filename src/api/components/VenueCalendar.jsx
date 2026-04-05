import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { SPORT_VENUES, VENUE_SPORTS, TIME_SLOTS, SPORT_COLORS } from '@/lib/sports-config';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const VenueCalendar = ({ onBookingSelect, userRole = 'student' }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedVenue, setSelectedVenue] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Get week dates
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Mock booking data
  const [bookings] = useState([
    {
      id: 1,
      venue: 'Main Gymnasium',
      sport: 'Basketball',
      date: new Date(),
      timeSlot: '10:00',
      duration: 2,
      bookedBy: '张三',
      purpose: '篮球队训练',
      status: userRole === 'teacher' ? 'approved' : 'pending'
    },
    {
      id: 2,
      venue: 'Tennis Court 1',
      sport: 'Tennis',
      date: addDays(new Date(), 1),
      timeSlot: '14:00',
      duration: 1,
      bookedBy: '李四',
      purpose: '网球练习',
      status: 'approved'
    }
  ]);

  const venues = selectedSport 
    ? SPORT_VENUES[selectedSport] || []
    : Object.values(SPORT_VENUES).flat();

  const getBookingsForSlot = (date, timeSlot, venue) => {
    return bookings.filter(booking => 
      isSameDay(booking.date, date) && 
      booking.timeSlot === timeSlot && 
      booking.venue === venue
    );
  };

  const handlePrevWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>场地预约筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">运动类型</label>
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger>
                  <SelectValue placeholder="选择运动类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部运动</SelectItem>
                  {VENUE_SPORTS.map(sport => (
                    <SelectItem key={sport} value={sport}>{sport}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">场地</label>
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                <SelectTrigger>
                  <SelectValue placeholder="选择场地" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部场地</SelectItem>
                  {venues.map(venue => (
                    <SelectItem key={venue} value={venue}>{venue}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">周选择</label>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {format(weekStart, 'yyyy年MM月dd日')} - {format(addDays(weekStart, 6), 'MM月dd日')}
                </span>
                <Button variant="outline" size="sm" onClick={handleNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>场地预约日历</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-2 text-left font-medium">时间/场地</th>
                  {weekDays.map(day => (
                    <th key={day.toISOString()} className="border border-border p-2 text-center min-w-[120px]">
                      <div className="text-sm">
                        <div>{format(day, 'EEE', { locale: zhCN })}</div>
                        <div className={`font-semibold ${isToday(day) ? 'text-primary' : ''}`}>
                          {format(day, 'MM/dd')}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map(timeSlot => (
                  <tr key={timeSlot}>
                    <td className="border border-border p-2 font-medium text-sm">
                      {timeSlot}
                    </td>
                    {weekDays.map(day => {
                      const dayBookings = selectedVenue 
                        ? getBookingsForSlot(day, timeSlot, selectedVenue)
                        : venues.flatMap(venue => getBookingsForSlot(day, timeSlot, venue));
                      
                      return (
                        <td key={`${day.toISOString()}-${timeSlot}`} className="border border-border p-1">
                          <div className="space-y-1">
                            {selectedVenue ? (
                              // Single venue view
                              dayBookings.map(booking => (
                                <div
                                  key={booking.id}
                                  className={`text-xs p-1 rounded text-white cursor-pointer ${getStatusColor(booking.status)}`}
                                  onClick={() => onBookingSelect?.(booking)}
                                >
                                  <div className="font-medium">{booking.bookedBy}</div>
                                  <div>{booking.purpose}</div>
                                  {userRole === 'teacher' && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {booking.status}
                                    </Badge>
                                  )}
                                </div>
                              ))
                            ) : (
                              // Multiple venues view
                              venues.slice(0, 2).map(venue => {
                                const venueBookings = getBookingsForSlot(day, timeSlot, venue);
                                return venueBookings.map(booking => (
                                  <div
                                    key={`${booking.id}-${venue}`}
                                    className={`text-xs p-1 rounded text-white cursor-pointer ${getStatusColor(booking.status)}`}
                                    onClick={() => onBookingSelect?.(booking)}
                                  >
                                    <div className="font-medium">{booking.bookedBy}</div>
                                    <div>{booking.venue}</div>
                                  </div>
                                ));
                              })
                            )}
                            
                            {/* Booking button for available slots */}
                            {dayBookings.length === 0 && userRole === 'student' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs"
                                onClick={() => onBookingSelect?.({
                                  date: day,
                                  timeSlot,
                                  venue: selectedVenue || venues[0],
                                  isNew: true
                                })}
                              >
                                预约
                              </Button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>已批准</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>待审批</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>已拒绝</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueCalendar;
