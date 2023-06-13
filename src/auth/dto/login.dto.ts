import { IsEmail, IsNotEmpty } from 'class-validator';

export class LogInDto {
  // TODO don't check for email if it is empty
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
