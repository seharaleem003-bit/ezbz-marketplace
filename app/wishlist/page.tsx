import { Heart } from "lucide-react";

export const metadata = {
  title: "Wishlist",
};

export default function WishlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <Heart className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-heading font-semibold">Your wishlist is empty</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Tap the heart on any listing to save it here for later.
      </p>
    </div>
  );
}
