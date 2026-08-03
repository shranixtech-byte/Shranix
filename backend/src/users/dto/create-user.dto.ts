import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail() email!: string;

  // Plain password — backend argon2-hash karta hai (auth.register jaisa)
  @IsString() @IsNotEmpty() @MinLength(4) password!: string;

  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsOptional() @IsString() phone?: string;

  // Module-wise access — jinke tick kiya user ko sirf wahi modules dikhenge
  @IsOptional() @IsArray() @IsString({ each: true }) allowedModules?: string[];
}
