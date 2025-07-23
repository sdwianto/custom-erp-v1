//src/components/shared/
import { Button } from "../ui/button";

import { toRupiah } from "@/utils/toRupiah";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
} from "../ui/alert-dialog";
import { Separator } from "../ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { PaymentQRCode } from "./PaymentQrCode";
import { useCartStore } from "@/store/cart";
import { api } from "@/utils/api";
import { toast } from "sonner";

type OrderItemProps = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
};

const OrderItem = ({ id, name, price, quantity, imageUrl }: OrderItemProps) => {
  const cartStore = useCartStore();

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="relative h-16 w-16 overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt={name}
          fill
          unoptimized
          className="object-cover"
        />
      </div>

      <div className="flex w-full flex-col justify-between">
        <div className="flex flex-col">
          <p>{name}</p>
          <p className="text-muted-foreground text-sm">
            {toRupiah(price)} x {quantity}
          </p>
        </div>

        <div className="flex w-full justify-between">
          <p className="font-medium">{toRupiah(quantity * price)}</p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                cartStore.decreaseQuantity(id);
              }}
              disabled={quantity <= 1}
              className="bg-secondary hover:bg-secondary/80 text-red-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer rounded-full p-1"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-5 text-center">{quantity}</span>
            <button
              onClick={() => {
                cartStore.increaseQuantity(id);
              }}
              className="bg-secondary hover:bg-secondary/80 text-green-600 cursor-pointer rounded-full p-1"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type CreateOrderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CreateOrderSheet = ({
  open,
  onOpenChange,
}: CreateOrderSheetProps) => {
  const cartStore = useCartStore();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const subtotal = cartStore.items.reduce((a, b) => {
    return a + b.price * b.quantity;
  }, 0);
  const tax = useMemo(() => subtotal * 0.1, [subtotal]);
  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);

  const { mutate: createOrder, data: createOrderResponse } =
  api.order.createOrder.useMutation({
    onSuccess: (data) => {
      console.log('Order creation response:', data);
      toast("Created order");
      setPaymentDialogOpen(true);
    },
  });

  // const { mutate: simulatePayment } = api.order.simulatePayment.useMutation({
  //   onSuccess: () => {
  //     toast("Simulated payment");
  //   },
  // });

  const {
    mutate: checkOrderPaymentStatus,
    data: orderPaid,
    isPending: checkOrderPaymentStatusIsPending,
    reset: resetCheckOrderPaymentStatus,
  } = api.order.checkOrderPaymentStatus.useMutation({
    onSuccess: (orderPaid) => {
      if (orderPaid) {
        cartStore.clearCart();
        return;
      }
    },
  });

  const handleCreateOrder = () => { 
    onOpenChange(false);
    createOrder({
      orderItems: cartStore.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
    setPaymentDialogOpen(true);
  };

  const handleRefresh = () => {
    if (!createOrderResponse) return;

    checkOrderPaymentStatus({
      orderId: createOrderResponse?.order.id,
    });
  };

  // const handleSimulatePayment = () => {
  //   if (!createOrderResponse) return;
  //   setPaymentInfoLoading(true);
  //   simulatePayment({
  //     orderId: createOrderResponse?.order.id,
  //   });
  //   toast(
  //     <>
  //       <div>Transaksi berhasil!</div>
  //       <div>Order ID: <b>{createOrderResponse.order.id}</b></div>
  //       <div>Total: <b>{toRupiah(createOrderResponse.order.grandTotal)}</b></div>
  //     </>
  //   );
  //   checkOrderPaymentStatus({
  //     orderId: createOrderResponse.order.id,
  //   }, {
  //     onSettled: () => setPaymentInfoLoading(false)
  //   });
  // };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    onOpenChange(false);
    resetCheckOrderPaymentStatus();
    cartStore.clearCart();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full">
          <SheetHeader>
            <SheetTitle className="text-2xl">Create New Order</SheetTitle>
            <SheetDescription>
              Add products to your cart and create a new order.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 overflow-y-scroll p-4">
            <h1 className="text-xl font-medium">Order Items</h1>
            <div className="flex flex-col gap-6">
              {cartStore.items.map((item) => {
                return (
                  <OrderItem
                    key={item.productId}
                    id={item.productId}
                    name={item.name}
                    price={item.price}
                    imageUrl={item.imageUrl}
                    quantity={item.quantity}
                  />
                );
              })}
            </div>
          </div>

          <SheetFooter>
            <h3 className="text-lg font-medium">Payment Details</h3>

            <div className="grid grid-cols-2 gap-2">
              <p>Subtotal</p>
              <p className="place-self-end">{toRupiah(subtotal)}</p>

              <p>Tax</p>
              <p className="place-self-end">{toRupiah(tax)}</p>

              <Separator className="col-span-2" />

              <p>Total</p>

              <p className="place-self-end">{toRupiah(grandTotal)}</p>
            </div>

            <Button
              size="lg"
              className="mt-8 w-full"
              onClick={handleCreateOrder} 
            >
              Create Order
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-lg font-medium">Finish Payment</p>

            {checkOrderPaymentStatusIsPending ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="border-primary h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-l-2" />

                <p>Loading...</p>
              </div>
            ) : (
              <>
                {!orderPaid && (
                  <Button
                    variant="link"
                    onClick={handleRefresh}
                    disabled={checkOrderPaymentStatusIsPending}
                  >
                    {checkOrderPaymentStatusIsPending
                      ? "Refreshing..."
                      : "Refresh"}
                  </Button>
                )}

                {!orderPaid ? (
                  <PaymentQRCode
                    qrString={createOrderResponse?.qrString ?? ""}
                  />
                ) : (
                  <CheckCircle2 className="size-80 text-green-500" />
                )}

                <p className="text-3xl font-medium">
                  {toRupiah(grandTotal)}
                </p>

                {/* <p className="text-muted-foreground text-sm">
                  Transaction ID: {createOrderResponse?.order.id}
                </p> */}

                {/* {!orderPaid && (
                  <Button onClick={handleSimulatePayment} variant="link">
                    Simulate Payment
                  </Button>
                )} */}
              </>
            )}
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleClosePaymentDialog}
            >
              Done
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
