import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Plain password — agar diya to backend argon2-hash karke update karta hai
  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  // Module-wise access — empty array = full access
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedModules?: string[];
}
