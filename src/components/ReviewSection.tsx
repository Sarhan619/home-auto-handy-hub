import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "@/components/StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_id: string;
};

interface ReviewSectionProps {
  bookingId: string;
  vendorId: string;
  customerId: string;
}

export default function ReviewSection({ bookingId, vendorId, customerId }: ReviewSectionProps) {
  const { user } = useAuth();
  const isCustomer = user?.id === customerId;
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("id,rating,comment,created_at,customer_id")
      .eq("booking_id", bookingId)
      .maybeSingle()
      .then(({ data }) => {
        const r = (data as Review | null) ?? null;
        setReview(r);
        if (r) {
          setRating(r.rating);
          setComment(r.comment ?? "");
        }
        setLoading(false);
      });
  }, [bookingId]);

  const submit = async () => {
    if (rating < 1) {
      toast.error("Please select a star rating");
      return;
    }
    setSaving(true);
    if (review) {
      const { data, error } = await supabase
        .from("reviews")
        .update({ rating, comment: comment.trim() || null })
        .eq("id", review.id)
        .select("id,rating,comment,created_at,customer_id")
        .single();
      setSaving(false);
      if (error) return toast.error(error.message);
      setReview(data as Review);
      setEditing(false);
      toast.success("Review updated");
    } else {
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          booking_id: bookingId,
          vendor_id: vendorId,
          customer_id: customerId,
          rating,
          comment: comment.trim() || null,
        })
        .select("id,rating,comment,created_at,customer_id")
        .single();
      setSaving(false);
      if (error) return toast.error(error.message);
      setReview(data as Review);
      toast.success("Thanks for your review!");
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Non-customer viewing an existing review
  if (!isCustomer) {
    if (!review) return null;
    return (
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Customer review</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <StarRating value={review.rating} readOnly />
          {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
          <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleString()}</p>
        </CardContent>
      </Card>
    );
  }

  // Customer view
  if (review && !editing) {
    return (
      <Card className="mb-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Your review</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <StarRating value={review.rating} readOnly />
          {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
          <p className="text-xs text-muted-foreground">Submitted {new Date(review.created_at).toLocaleString()}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" />
          {review ? "Edit your review" : "Rate this job"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">How was the service?</p>
          <StarRating value={rating} onChange={setRating} size={28} />
        </div>
        <Textarea
          placeholder="Share what went well or what could improve (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
        />
        <div className="flex gap-2">
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {review ? "Save changes" : "Submit review"}
          </Button>
          {review && editing && (
            <Button variant="ghost" onClick={() => { setEditing(false); setRating(review.rating); setComment(review.comment ?? ""); }} disabled={saving}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}