import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Image from "next/image";
import { toRupiah } from "@/utils/toRupiah";

interface ProductMenuCardProps {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  onAddToCart: (id: string) => void;
}

export const ProductMenuCard: React.FC<ProductMenuCardProps> = ({
  productId,
  imageUrl,
  name,
  price,
  onAddToCart,
}) => {
  return (
    <div className="hover:bg-accent/10 relative flex flex-col rounded-lg border p-4 transition-colors">
      {imageUrl && (
        <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md">
          <Image
            unoptimized
            fill
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="line-clamp-2 font-medium">{name}</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {toRupiah(price)}
          </p>
        </div>

        <Button
          size="icon"
          onClick={() => onAddToCart(productId)}
          aria-label={`Add ${name} to cart`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
