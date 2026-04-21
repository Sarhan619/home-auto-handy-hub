import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, LocateFixed, Loader2, Pencil } from "lucide-react";
import { useJobLocation, type JobLocation } from "@/hooks/useJobLocation";
import { toast } from "sonner";

interface Props {
  onChange?: (loc: JobLocation | null) => void;
  compact?: boolean;
}

export default function LocationPicker({ onChange, compact }: Props) {
  const { location, setLocation, requestGeolocation, requesting, error } = useJobLocation();
  const [editing, setEditing] = useState(!location);
  const [address, setAddress] = useState(location?.address ?? "");
  const [lat, setLat] = useState(location?.lat?.toString() ?? "");
  const [lng, setLng] = useState(location?.lng?.toString() ?? "");

  const saveManual = () => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!address.trim() || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      toast.error("Enter a street address and valid coordinates.");
      return;
    }
    const loc: JobLocation = { address: address.trim(), lat: latNum, lng: lngNum, source: "manual" };
    setLocation(loc);
    onChange?.(loc);
    setEditing(false);
  };

  const useGeo = () => {
    requestGeolocation();
  };

  // Sync upstream when geo arrives
  if (location && onChange && !editing) {
    // call once per render is fine; React batches
    onChange(location);
  }

  if (!editing && location) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className={compact ? "flex items-center justify-between gap-3 p-3" : "flex items-center justify-between gap-3 p-4"}>
          <div className="flex min-w-0 items-center gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{location.address}</p>
              <p className="text-xs text-muted-foreground">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)} · {location.source === "geo" ? "GPS" : "manual"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Change
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={useGeo} disabled={requesting}>
            {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
            Use my current location
          </Button>
          <span className="text-xs text-muted-foreground">or enter manually</span>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="grid gap-3">
          <div>
            <Label htmlFor="addr">Street address</Label>
            <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Springfield" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input id="lat" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="40.7128" />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input id="lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-74.0060" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: Right-click a spot in Google Maps to copy lat/lng. Address autocomplete coming in a later phase.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          {location && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
          <Button type="button" size="sm" onClick={saveManual}>Save location</Button>
        </div>
      </CardContent>
    </Card>
  );
}