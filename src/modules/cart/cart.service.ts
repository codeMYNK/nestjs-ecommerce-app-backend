import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { Cart, CartItem, Product } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // Helper method to get or create an active cart for the user
  private async getOrCreateActiveCart(userId: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { userId, checkedOut: false },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }
    return cart;
  }

  // Get current active cart
  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, checkedOut: false },
      include: {
        cartItems: {
          include: { product: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      // Return empty cart structure if no active cart exists
      return this.formatCartResponse({ id: '', userId, checkedOut: false, createdAt: new Date(), updatedAt: new Date(), cartItems: [] } as any);
    }

    return this.formatCartResponse(cart);
  }

  // Add item to cart
  async addToCart(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    const { productId, quantity } = addToCartDto;

    // 1. Check if product exists and is active
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or is inactive');
    }

    // 2. Check stock availability
    if (product.stock < quantity) {
      throw new BadRequestException(`Only ${product.stock} items left in stock`);
    }

    // 3. Get or create active cart
    const cart = await this.getOrCreateActiveCart(userId);

    // 4. Check if item already exists in cart using unique constraint fields
    const existingCartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (existingCartItem) {
      // Update quantity if product already in cart
      const newQuantity = existingCartItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Cannot add more. Only ${product.stock} items left in stock`);
      }

      await this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Create new cart item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  // Update item quantity
  async updateCartItem(
    userId: string,
    productId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const { quantity } = updateCartItemDto;

    const cart = await this.prisma.cart.findFirst({
      where: { userId, checkedOut: false },
    });

    if (!cart) throw new NotFoundException('Active cart not found');

    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
      include: { product: true },
    });

    if (!cartItem) throw new NotFoundException('Item not found in cart');

    if (cartItem.product.stock < quantity) {
      throw new BadRequestException(`Only ${cartItem.product.stock} items left in stock`);
    }

    await this.prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  // Remove item from cart
  async removeCartItem(userId: string, productId: string): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, checkedOut: false },
    });

    if (!cart) throw new NotFoundException('Active cart not found');

    const cartItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId,
        },
      },
    });

    if (!cartItem) throw new NotFoundException('Item not found in cart');

    await this.prisma.cartItem.delete({
      where: { id: cartItem.id },
    });

    return this.getCart(userId);
  }

  // Helper to map DB response to DTO and calculate totals dynamically
  private formatCartResponse(
    cart: Cart & { cartItems: (CartItem & { product: Product })[] },
  ): CartResponseDto {
    let totalAmount = 0;

    const items = cart.cartItems.map((item) => {
      const price = Number(item.product.price);
      const subtotal = price * item.quantity;
      totalAmount += subtotal;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        imageUrl: item.product.imageUrl,
        price,
        quantity: item.quantity,
        subtotal,
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      checkedOut: cart.checkedOut,
      items,
      totalAmount,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}