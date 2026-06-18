import { ApiProperty } from "@nestjs/swagger";

export class OrderApiResponseDto<T> {
    @ApiProperty({
        description: 'Indicates if the request was success',
    })
    success: boolean;

    @ApiProperty({
        description: 'Returned data',
        type: Object
    })
    data: T

    @ApiProperty({
        description: 'Optional message',
        nullable: true,
        required: false
    })
    message: string;
}

export class OrderItemsResponseDto{
    @ApiProperty()
    id: string;

    @ApiProperty()
    productId: string;

    @ApiProperty()
    productName: string;

    @ApiProperty()
    quantity: number;

    @ApiProperty()
    price: number;

    @ApiProperty()
    subtotal: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class OrderResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    status: string;

    @ApiProperty()
    total: number;

    @ApiProperty()
    shippingAddress: string;

    @ApiProperty({
        type: [OrderItemsResponseDto]
    })
    items: OrderItemsResponseDto[]

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class PaginatedorderResponseDto{
    @ApiProperty({
        type: [OrderResponseDto]
    })
    data: OrderResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;
}