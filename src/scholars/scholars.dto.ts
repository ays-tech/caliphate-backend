import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateScholarDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1, { message: 'Name cannot be empty' })
  @MaxLength(150, { message: 'Name must be 150 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Biography must be 2000 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  biography?: string;
}

export class UpdateScholarDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  @MaxLength(150, { message: 'Name must be 150 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Biography must be 2000 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  biography?: string;
}