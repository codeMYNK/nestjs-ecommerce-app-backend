import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthResponseDto {
  @ApiProperty({
    description:'Access token for authentication',
    example:'75a84555bd9c0464c29dce804d3ff03d8f9104d88a770bb07924d8ed6b66527df04dd3f737f3007848360f18c72afd2fa3ee23094c8c3b31d80146ce0a7a6796eaa47b48c834b7b189e173cf301c0f3ff25c0e2a6eefc63d435c38897160955b2179a85d23206ede5c87adbecf5db956d603a1353ee8ea5b8cceb993'
  })
  accessToken: string;

  @ApiProperty({
    description:'Refresh token for obtaining new access tokens',
    example:'a01d51c9dc6e498e2c51b36d4058361c6b23288dcbbcb86752cc5a9bb39f67905c581b6580a668df05210dc56f21ebd2401245bc35916c6eabed3425e6bf1408'
  })
  refreshToken: string;

  @ApiProperty({
    description:'Authenticated User Information',
    example: {
    id: 'user-123',
    email: '<EMAIL>',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    }
  })
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: Role;
  };
}
