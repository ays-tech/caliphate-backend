import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum BookTypeEnum {
  PUBLISHED   = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
}

export enum BookLanguageEnum {
  ENGLISH  = 'ENGLISH',
  ARABIC   = 'ARABIC',
  HAUSA    = 'HAUSA',
  FULFULDE = 'FULFULDE',
}

export enum BookFormatEnum {
  BOOK  = 'BOOK',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export class CreateBookDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MinLength(1,   { message: 'Title cannot be empty' })
  @MaxLength(300, { message: 'Title must be 300 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must be 2000 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsUUID('4', { message: 'Invalid scholar ID' })
  scholarId: string;

  @IsOptional()
  @IsEnum(BookTypeEnum, { message: 'Type must be PUBLISHED or UNPUBLISHED' })
  type?: BookTypeEnum;

  @IsOptional()
  @IsEnum(BookLanguageEnum, { message: 'Language must be ENGLISH, ARABIC, HAUSA, or FULFULDE' })
  language?: BookLanguageEnum;

  @IsOptional()
  @IsEnum(BookFormatEnum, { message: 'Format must be BOOK, AUDIO, or VIDEO' })
  format?: BookFormatEnum;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  volumeTitle?: string;
}

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @MinLength(1,   { message: 'Title cannot be empty' })
  @MaxLength(300, { message: 'Title must be 300 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Description must be 2000 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid scholar ID' })
  scholarId?: string;

  @IsOptional()
  @IsEnum(BookTypeEnum, { message: 'Type must be PUBLISHED or UNPUBLISHED' })
  type?: BookTypeEnum;

  @IsOptional()
  @IsEnum(BookLanguageEnum, { message: 'Language must be ENGLISH, ARABIC, HAUSA, or FULFULDE' })
  language?: BookLanguageEnum;

  @IsOptional()
  @IsEnum(BookFormatEnum, { message: 'Format must be BOOK, AUDIO, or VIDEO' })
  format?: BookFormatEnum;
}

export class CreateVolumeDto {
  @IsString()
  @IsNotEmpty({ message: 'Volume title is required' })
  @MinLength(1,   { message: 'Volume title cannot be empty' })
  @MaxLength(200, { message: 'Volume title must be 200 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Order must be an integer' })
  @Min(1,   { message: 'Order must be at least 1' })
  @Max(999, { message: 'Order must be 999 or fewer' })
  order?: number;
}
