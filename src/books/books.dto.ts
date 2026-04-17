import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID,
  MaxLength, MinLength, IsInt, Min, Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum BookTypeEnum     { PUBLISHED = 'PUBLISHED', UNPUBLISHED = 'UNPUBLISHED' }
export enum BookLanguageEnum { ENGLISH = 'ENGLISH', ARABIC = 'ARABIC', HAUSA = 'HAUSA', FULFULDE = 'FULFULDE' }
export enum BookFormatEnum   { BOOK = 'BOOK', AUDIO = 'AUDIO', VIDEO = 'VIDEO' }

export class CreateBookDto {
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(300)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional() @IsString() @MaxLength(2000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsUUID('4', { message: 'Invalid scholar ID' })
  scholarId: string;

  @IsOptional() @IsEnum(BookTypeEnum)
  type?: BookTypeEnum;

  @IsOptional() @IsEnum(BookLanguageEnum)
  language?: BookLanguageEnum;

  @IsOptional() @IsEnum(BookFormatEnum)
  format?: BookFormatEnum;

  @IsOptional() @IsString() @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  volumeTitle?: string;
}

export class UpdateBookDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(300)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @IsOptional() @IsUUID('4')
  scholarId?: string;

  @IsOptional() @IsEnum(BookTypeEnum)
  type?: BookTypeEnum;

  @IsOptional() @IsEnum(BookLanguageEnum)
  language?: BookLanguageEnum;

  @IsOptional() @IsEnum(BookFormatEnum)
  format?: BookFormatEnum;
}

export class CreateVolumeDto {
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(999)
  order?: number;
}
