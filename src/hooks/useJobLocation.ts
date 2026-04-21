import { useCallback, useEffect, useState } from "react";

export type JobLocation = {
  address: string;
  lat: number;
  lng: number;
  source: "geo" | "manual";
};

const STORAGE_KEY = "servicehub.job_location";

export function useJobLocation() {
  const [location, setLocationState] = useState<JobLocation | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLocationState(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const setLocation = useCallback((loc: JobLocation | null) => {
    setLocationState(loc);
    if (loc) localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setRequesting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          address: "Current location",
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          source: "geo",
        });
        setRequesting(false);
      },
      (err) => {
        setError(err.message || "Unable to get location.");
        setRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [setLocation]);

  return { location, setLocation, requestGeolocation, requesting, error };
}