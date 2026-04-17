import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ApplyAuthorDto {
  @IsString()
  @IsNotEmpty({ message: 'Pen name is required' })
  @MinLength(2,   { message: 'Pen name must be at least 2 characters' })
  @MaxLength(80,  { message: 'Pen name must be 80 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  penName: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Bio must be 1000 characters or fewer' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  bio?: string;
}

export class UpdateAuthorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  penName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  bio?: string;
}

export class ReviewAuthorDto {
  @IsString()
  @IsNotEmpty()
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
