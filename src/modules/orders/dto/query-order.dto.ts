import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { OrderStatus } from '@prisma/client';

// export enum OrderStatus{
//     PENDING = 'PENDING',
//     PROCESSING = 'PROCESSING',
//     SHIPPED = 'SHIPPED',
//     DELIVERED = 'DELIVERED',
//     CANCELLED = 'CANCELLED',
// }

export class QueryOrderDto {
    @IsOptional()
    @Type(() => Number)
    page? : number = 1;

    @IsOptional()
    @Type(() => Number)
    limit? : number = 10;

    @IsOptional()
    @IsEnum(OrderStatus)
    status? : OrderStatus;

    @IsOptional()
    @IsString()
    search?: string;
}