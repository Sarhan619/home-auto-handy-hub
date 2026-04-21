import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvailabilityToggleProps {
  vendorId: string;
  initialOnline: boolean;
  onChange?: (online: boolean) => void;
}

export default function AvailabilityToggle({ vendorId, initialOnline, onChange }: AvailabilityToggleProps) {
  const [online, setOnline] = useState(initialOnline);
  const [saving, setSaving] = useState(false);

  const toggle = async (next: boolean) => {
    setSaving(true);
    const prev = online;
    setOnline(next);
    const { error } = await supabase.from("vendors").update({ is_online: next }).eq("id", vendorId);
    setSaving(false);
    if (error) {
      setOnline(prev);
      toast.error(error.message);
      return;
    }
    onChange?.(next);
    toast.success(next ? "You're online — broadcast jobs enabled" : "You're offline — broadcast jobs paused");
  };

  return (
    <div className="flex items-center gap-3">
      <Switch
        id="availability"
        checked={online}
        onCheckedChange={toggle}
        disabled={saving}
      />
      <Label htmlFor="availability" className="cursor-pointer">
        <span className="font-medium">{online ? "Online" : "Offline"}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          {online ? "Receiving broadcast jobs" : "Only direct requests"}
        </span>
      </Label>
    </div>
  );
}