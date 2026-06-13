import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export class AppBadRequestException extends BadRequestException {
  constructor(message: string | string[]) {
    super({ message, error: 'Bad Request', statusCode: 400 });
  }

  static fromValidationErrors(errors: ValidationError[]): AppBadRequestException {
    const messages: string[] = errors.flatMap((error) =>
      Object.values(error.constraints ?? {})
    );
    return new AppBadRequestException(messages);
  }
}
