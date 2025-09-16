import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrentTime } from "../lib/time-utils";

interface TimeZoneSelectorProps {
  userTimeZone: string;
  accountTimeZone?: string;
  onUserTimeZoneChange: (timeZone: string) => void;
  onAccountTimeZoneChange?: (timeZone: string) => void;
}

const commonTimeZones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "UTC", label: "UTC" },
];

export default function TimeZoneSelector({ 
  userTimeZone, 
  accountTimeZone, 
  onUserTimeZoneChange,
  onAccountTimeZoneChange 
}: TimeZoneSelectorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [accountTime, setAccountTime] = useState<Date | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      if (accountTimeZone && accountTimeZone !== userTimeZone) {
        setAccountTime(now);
      } else {
        setAccountTime(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userTimeZone, accountTimeZone]);

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <div className="text-sm text-muted-foreground">
          Your Time: <span className="font-medium text-foreground" data-testid="text-user-time">
            {formatCurrentTime(currentTime, userTimeZone)}
          </span>
        </div>
        {accountTime && accountTimeZone && (
          <div className="text-sm text-muted-foreground">
            Account Time: <span className="font-medium text-foreground" data-testid="text-account-time">
              {formatCurrentTime(accountTime, accountTimeZone)}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Select value={userTimeZone} onValueChange={onUserTimeZoneChange}>
          <SelectTrigger className="w-48" data-testid="select-user-timezone">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {commonTimeZones.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onAccountTimeZoneChange && (
          <Select value={accountTimeZone || ""} onValueChange={onAccountTimeZoneChange}>
            <SelectTrigger className="w-48" data-testid="select-account-timezone">
              <SelectValue placeholder="Account timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="same">Same as user</SelectItem>
              {commonTimeZones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
