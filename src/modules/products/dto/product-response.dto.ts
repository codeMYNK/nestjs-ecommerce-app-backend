//Product Response

import { ApiProperty, ApiResponse } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product ID',
    example: '465456sds-4584s68sd-4654684sd',
  })
  id: string;

  @ApiProperty({
    description: 'Product Name',
    example: 'Wireless Headphone',
  })
  name: string;

  @ApiProperty({
    description: 'Product Description',
    example: 'High quality wireless headphones',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Product price',
    example: 99.99,
  })
  price: number;

  @ApiProperty({
    description: 'Stock keeping unit',
    example: "WH-001",
  })
  sku: string;


  @ApiProperty({
    description: 'Product Image url',
    example: 'https://example.com/image.jpg'
  })
  imageUrl: string | null;

  @ApiProperty({
    description: 'Product category',
    example: 'Electronics',
  })
  category: string | null

    @ApiProperty({
    description: 'Is Product active and avalible to purchase',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updation timestamp',
  })
  updatedAt: Date;
}
