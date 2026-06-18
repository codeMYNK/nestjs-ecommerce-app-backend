import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderApiResponseDto,
  OrderResponseDto,
} from './dto/order-responses.dto';
import { Order, OrderItem, OrderStatus, Product, User } from '@prisma/client';
import { QueryOrderDto } from './dto/query-order.dto';
import { contains } from 'class-validator';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // //Create Order
  // async create(
  //   userId: string,
  //   createOrderDto: CreateOrderDto,
  // ): Promise<OrderApiResponseDto<OrderResponseDto>> {
  //   const { items, shippingAddress } = createOrderDto;

  //   for (const item of items) {
  //     const product = await this.prisma.product.findUnique({
  //       where: { id: item.productId },
  //     });

  //     if (!product) {
  //       throw new NotFoundException(
  //         `Product with ID ${item.productId} not found`,
  //       );
  //     }

  //     if (product.stock < item.quantity) {
  //       throw new BadRequestException(
  //         `Insufficient stock for product ${product.name}. Avalible: ${product.stock}, Requested: ${item.quantity}`,
  //       );
  //     }
  //   }

  //   const total = items.reduce(
  //     (sum, item) => sum + item.price * item.quantity,
  //     0,
  //   );

  //   const latestCart = await this.prisma.cart.findFirst({
  //     where: {
  //       userId,
  //       checkedOut: false,
  //     },
  //     orderBy: {
  //       createdAt: 'desc',
  //     },
  //   });

  //   const order = await this.prisma.$transaction(async (tx) => {
  //     const newOrder = tx.order.create({
  //       data: {
  //         userId,
  //         status: OrderStatus.PENDING,
  //         totalAmount: total,
  //         shippingAddress,
  //         cartId: latestCart?.id,
  //         orderItems: {
  //           create: items.map((item) => ({
  //             productId: item.productId,
  //             quantity: item.quantity,
  //             price: item.price,
  //           })),
  //         },
  //       },
  //       include: {
  //         orderItems: {
  //           include: {
  //             product: true,
  //           },
  //         },
  //         user: true,
  //       },
  //     });

  //     for (const item of items) {
  //       await tx.product.update({
  //         where: { id: item.productId },
  //         data: { stock: { decrement: item.quantity } },
  //       });
  //     }
  //     return newOrder;
  //   });
  //   return this.wrap(order);
  // }

  // Create Order
  async create(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const { items, shippingAddress } = createOrderDto;

    // Cart fetch karna transaction ke bahar theek hai
    const latestCart = await this.prisma.cart.findFirst({
      where: {
        userId,
        checkedOut: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Poore process ko Transaction ke andar daal diya hai
    const order = await this.prisma.$transaction(async (tx) => {
      let total = 0;
      const verifiedOrderItems: {
        productId: string;
        quantity: number;
        price: number;
      }[] = [];

      for (const item of items) {
        // 1. Database se original product fetch karna (Transaction ke andar)
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found`,
          );
        }

        // 2. Stock Check
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          );
        }

        // 3. SECURITY FIX: Database wali price use karein, frontend wali nahi
        const dbPrice = Number(product.price);
        total += dbPrice * item.quantity;

        // OrderItems create karne ke liye array push karein
        verifiedOrderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: dbPrice, // Original price DB mein save hogi
        });

        // 4. Stock Decrement karna
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 5. Final order create karna
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalAmount: total,
          shippingAddress,
          cartId: latestCart?.id,
          orderItems: {
            create: verifiedOrderItems, // Database wali verified items
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      if (latestCart) {
        await tx.cart.update({
          where: { id: latestCart.id },
          data: { checkedOut: true },
        });
      }

      return newOrder;
    });

    // Yahan hum return kar rahe hain 'wrap' function ke sath
    // Note: Agar aapne wrap function mein dynamic message add nahi kiya hai,
    // toh abhi ke liye purana `return this.wrap(order);` hi rehne dein.
    return this.wrap(order);
  }

  async findAllForAdmin(query: QueryOrderDto): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search)
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.map(o)),
      total,
      page,
      limit,
    };
  }

  async findAll(
    userId: string,
    query: QueryOrderDto,
  ): Promise<{
    data: OrderResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (status) where.status = status;
    if (search) where.OR = [{ id: { contains: search, mode: 'insensitive' } }];

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.map(o)),
      total,
      page,
      limit,
    };
  }

  async findOne(
    id: string,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return this.wrap(order);
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const where: any = { id };
    if (userId) where.userId = userId;

    const existing = await this.prisma.order.findFirst({
      where,
    });
    if (!existing) throw new NotFoundException(`Order ${id} not found`);

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    return this.wrap(updated);
  }

  async cancel(
    id: string,
    userId?: string,
  ): Promise<OrderApiResponseDto<OrderResponseDto>> {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        orderItems: true,
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Only pending orders can be cancelled`);
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });
    });
    return this.wrap(cancelled);
  }

  private wrap(
    order: Order & {
      orderItems: (OrderItem & { product: Product })[];
      user: User;
    },
  ): OrderApiResponseDto<OrderResponseDto> {
    return {
      success: true,
      message: 'Order retreived successfully',
      data: this.map(order),
    };
  }

  private map(
    order: Order & {
      orderItems: (OrderItem & { product: Product })[];
      user: User;
    },
  ): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: Number(order.totalAmount),
      shippingAddress: order.shippingAddress ?? '',
      items: order.orderItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
        subtotal: Number(item.price) * item.quantity,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),

      ...(order.user && {
        userEmail: order.user.email,
        userName:
          `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim(),
      }),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
