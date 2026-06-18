import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentStatus, Prisma } from '@prisma/client';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@Injectable()
export class PaymentsService {
  private stripe: InstanceType<typeof Stripe>;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2026-05-27.dahlia',
    });
  }

  //Create Payment Intent
//   async createPaymentIntent(
//     userId: string,
//     createPaymentIntentDto: CreatePaymentIntentDto,
//   ): Promise<{
//     success: boolean;
//     data: { clientSecret: string; paymentId: string };
//     message: string;
//   }> {
//     const { orderId, amount, currency = 'inr' } = createPaymentIntentDto;

//     const order = await this.prisma.order.findFirst({
//       where: { id: orderId, userId },
//     });

//     if (!order) {
//       throw new NotFoundException(`Order with ID: ${orderId} not found`);
//     }

//     const existingPayments = await this.prisma.payment.findFirst({
//       where: { orderId },
//     });

//     if (
//       existingPayments &&
//       existingPayments.status === PaymentStatus.COMPLETED
//     ) {
//       throw new BadRequestException('Payment already completed for this order');
//     }

//     const paymentIntent = await this.stripe.paymentIntents.create({
//       amount: Math.round(amount * 100),
//       currency,
//       metadata: { orderId, userId },
//     });

//     const payment = await this.prisma.payment.create({
//       data: {
//         orderId,
//         userId,
//         amount,
//         currency,
//         status: PaymentStatus.PENDING,
//         paymentMethod: 'STRIPE',
//         transactionId: paymentIntent.id,
//       },
//     });

//     return {
//       success: true,
//       data: {
//         clientSecret: paymentIntent.client_secret!,
//         paymentId: payment.id,
//       },
//       message: 'Payment intent created successfully',
//     };
//   }

// Create Payment Intent (SECURED)
  async createPaymentIntent(
    userId: string,
    createPaymentIntentDto: CreatePaymentIntentDto,
  ): Promise<{
    success: boolean;
    data: { clientSecret: string; paymentId: string };
    message: string;
  }> {
    const { orderId, currency = 'inr' } = createPaymentIntentDto;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID: ${orderId} not found`);
    }

    // 2. SECURITY FIX: Amount DB se uthayein
    const amountToPay = Number(order.totalAmount);

    const existingPayments = await this.prisma.payment.findFirst({
      where: { orderId },
    });

    if (
      existingPayments &&
      existingPayments.status === PaymentStatus.COMPLETED
    ) {
      throw new BadRequestException('Payment already completed for this order');
    }

    // 3. DB wale amount ka intent banayein
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amountToPay * 100),
      currency,
      metadata: { orderId, userId },
    });

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        userId,
        amount: amountToPay,
        currency,
        status: PaymentStatus.PENDING,
        paymentMethod: 'STRIPE',
        transactionId: paymentIntent.id,
      },
    });

    return {
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret!,
        paymentId: payment.id,
      },
      message: 'Payment intent created successfully',
    };
  }

  //Confirm Payment Intent
  async confirmPayment(
    userId: string,
    confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<{ success: boolean; data: PaymentResponseDto; message: string }> {
    const { paymentIntentId, orderId } = confirmPaymentDto;

    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        userId,
        transactionId: paymentIntentId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment already completed');
    }
    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not successful');
    }

    const [updatedPayment] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.COMPLETED },
      }),

      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PROCESSING' },
      }),
    ]);
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
      },
    });

    if (order && order.cartId) {
      await this.prisma.cart.update({
        where: { id: order.cartId },
        data: { checkedOut: true },
      });
    }

    return {
      success: true,
      data: this.mapToPaymentResponse(updatedPayment),
      message: 'Payment confirmed successfully',
    };
  }

  //Get all payments for current user
  async findAll(userId: string): Promise<{
    success: boolean;
    data: PaymentResponseDto[];
    message: string;
  }> {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: payments.map((payment) => this.mapToPaymentResponse(payment)),
      message: 'Payments recieved successfully',
    };
  }

  //Get payment by ID
  async findOne(
    id: string,
    userId: string,
  ): Promise<{
    success: boolean;
    data: PaymentResponseDto;
    message: string;
  }> {
    const payment = await this.prisma.payment.findFirst({
      where: { id, userId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return {
      success: true,
      data: this.mapToPaymentResponse(payment),
      message: 'Payment retrieved successfully',
    };
  }

  //Get payment by order ID
  async findByOrder(
    orderId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    data: PaymentResponseDto | null;
    message: string;
  }> {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, userId },
    });

    return {
      success: true,
      data: payment ? this.mapToPaymentResponse(payment) : null,
      message: 'Payment retrieved successfully',
    };
  }

  private mapToPaymentResponse(payment: {
    id: string;
    orderId: string;
    userId: string;
    amount: Prisma.Decimal;
    currency: string;
    status: PaymentStatus;
    paymentMethod: string | null;
    transactionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      currency: payment.currency,
      amount: payment.amount.toNumber(),
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
