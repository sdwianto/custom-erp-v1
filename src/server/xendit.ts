//src/server/xendit.ts
import { PaymentMethod, PaymentRequest,  } from "xendit-node";
import { addMinutes } from "date-fns";

export const xenditPaymentRequestClient = new PaymentRequest({
  secretKey: process.env.XENDIT_MONEY_IN_KEY!,
});

export const xenditPaymentMethodClient = new PaymentMethod({
  secretKey: process.env.XENDIT_MONEY_IN_KEY!,
});

type CreateQRISParams = {
  amount: number;
  orderId: string;
  expiresAt?: Date;
};

export const createQRIS = async (params: CreateQRISParams) => {
  const paymentRequest = await xenditPaymentRequestClient.createPaymentRequest({
    data: {
      currency: "IDR",
      amount: params.amount,
      referenceId: params.orderId, // ID ORDER DATABASE KITA
      paymentMethod: {
        reusability: "ONE_TIME_USE",
        type: "QR_CODE",
        qrCode: {
          channelCode: "DANA",
          channelProperties: {
            expiresAt: params.expiresAt ?? addMinutes(new Date(), 15),
          },
        },
        referenceId: params.orderId,
      },
    },
  });

  return paymentRequest;
};
