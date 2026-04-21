import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PAYMENT_METHOD_OPTIONS, formatCurrency, type PaymentMethod } from "@/lib/payment";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  quotedPrice: number | null;
  commissionPct: number | null;
  onCompleted: () => void;
}

export default function CompleteJobDialog({ open, onOpenChange, bookingId, quotedPrice, commissionPct, onCompleted }: Props) {
  const [finalPrice, setFinalPrice] = useState<string>(quotedPrice != null ? String(quotedPrice) : "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const priceNum = Number(finalPrice);
  const adjusted = quotedPrice != null && priceNum > 0 && priceNum !== Number(quotedPrice);
  const commission = priceNum > 0 && commissionPct != null ? Math.round(priceNum * Number(commissionPct)) / 100 : 0;
  const vendorNet = priceNum > 0 ? priceNum - commission : 0;

  const submit = async () => {
    if (!priceNum || priceNum <= 0) {
      toast.error("Enter a valid final price");
      return;
    }
    if (adjusted && !note.trim()) {
      toast.error("Add a note explaining the price adjustment");
      return;
    }
    setSaving(true);
    const { error: payErr } = await supabase.rpc("vendor_set_booking_payment", {
      _booking_id: bookingId,
      _final_price: priceNum,
      _payment_method: method,
      _adjustment_note: adjusted ? note.trim() : null,
    });
    if (payErr) {
      setSaving(false);
      toast.error(payErr.message);
      return;
    }
    const { error: statusErr } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);
    setSaving(false);
    if (statusErr) {
      toast.error(statusErr.message);
      return;
    }
    toast.success("Job completed and payment recorded");
    onOpenChange(false);
    onCompleted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete job & record payment</DialogTitle>
          <DialogDescription>
            Enter the amount you collected from the customer. Commission will be calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {quotedPrice != null && (
            <p className="text-xs text-muted-foreground">
              Quoted price: <span className="font-medium text-foreground">{formatCurrency(quotedPrice)}</span>
            </p>
          )}

          <div>
            <Label htmlFor="final-price">Final price collected ($)</Label>
            <Input
              id="final-price"
              type="number"
              min="0"
              step="0.01"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {adjusted && (
            <div>
              <Label htmlFor="note">Reason for price adjustment <span className="text-destructive">*</span></Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Extra time required, additional materials, etc."
                rows={3}
              />
            </div>
          )}

          {priceNum > 0 && commissionPct != null && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Gross collected</span><span className="font-medium">{formatCurrency(priceNum)}</span></div>
              <div className="flex justify-between text-destructive"><span>Platform commission ({commissionPct}%)</span><span className="font-medium">−{formatCurrency(commission)}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>Your net</span><span>{formatCurrency(vendorNet)}</span></div>
              <p className="pt-1 text-[11px] text-muted-foreground">Commission is owed to the platform and will appear in your earnings ledger.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete & record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}