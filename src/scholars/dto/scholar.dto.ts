import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class ApplyScholarDto {
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(120) @trim()
  name: string;
  @IsOptional() @IsString() @MaxLength(2000) @trim()
  biography?: string;
}

export class UpdateScholarProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) @trim()
  name?: string;
  @IsOptional() @IsString() @MaxLength(2000) @trim()
  biography?: string;
}

export class CreateScholarDto {
  @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(120) @trim()
  name: string;
  @IsOptional() @IsString() @MaxLength(2000) @trim()
  biography?: string;
}

export class UpdateScholarDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) @trim()
  name?: string;
  @IsOptional() @IsString() @MaxLength(2000) @trim()
  biography?: string;
}
