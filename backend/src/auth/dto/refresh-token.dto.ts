import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'JWT refresh token' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Invalid refresh token' })
  refreshToken?: string;
}
