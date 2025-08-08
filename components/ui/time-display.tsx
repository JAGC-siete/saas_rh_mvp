import React from 'react';
import { formatTimeDisplay } from '../../lib/timezone';

interface TimeDisplayProps {
  timestamp: string | Date | null;
  label?: string;
  className?: string;
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ 
  timestamp, 
  label, 
  className = '' 
}) => {
  const formattedTime = formatTimeDisplay(timestamp);
  
  return (
    <span className={`font-mono ${className}`} title={label}>
      {formattedTime}
    </span>
  );
};

interface AttendanceStatusProps {
  checkIn: string | null;
  checkOut: string | null;
  expectedCheckIn?: string;
  expectedCheckOut?: string;
}

export const AttendanceStatus: React.FC<AttendanceStatusProps> = ({
  checkIn,
  checkOut,
  expectedCheckIn,
  expectedCheckOut
}) => {
  const getStatus = () => {
    if (!checkIn) return { text: 'Ausente', className: 'bg-red-100 text-red-800' };
    if (!checkOut) return { text: 'En curso', className: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Completo', className: 'bg-green-100 text-green-800' };
  };

  const status = getStatus();

  return (
    <div className="space-y-2">
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.className}`}>
        {status.text}
      </span>
      
      <div className="text-sm space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Entrada:</span>
          <div className="flex items-center space-x-2">
            <TimeDisplay timestamp={checkIn} />
            {expectedCheckIn && (
              <span className="text-xs text-gray-500">
                (esperado: {expectedCheckIn})
              </span>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Salida:</span>
          <div className="flex items-center space-x-2">
            <TimeDisplay timestamp={checkOut} />
            {expectedCheckOut && (
              <span className="text-xs text-gray-500">
                (esperado: {expectedCheckOut})
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeDisplay;
