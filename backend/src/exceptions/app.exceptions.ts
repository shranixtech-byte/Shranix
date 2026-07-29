import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, code: string = 'BUSINESS_ERROR', status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ message, code, statusCode: status }, status);
  }
}

export class EntityNotFoundException extends HttpException {
  constructor(entity: string, id?: string) {
    const message = id ? `${entity} with id '${id}' not found` : `${entity} not found`;
    super({ message, code: 'ENTITY_NOT_FOUND', statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
  }
}

export class DuplicateEntityException extends HttpException {
  constructor(entity: string, field?: string) {
    const message = field ? `${entity} with this ${field} already exists` : `${entity} already exists`;
    super({ message, code: 'DUPLICATE_ENTITY', statusCode: HttpStatus.CONFLICT }, HttpStatus.CONFLICT);
  }
}

export class ValidationException extends HttpException {
  constructor(errors: Record<string, string[]>) {
    super(
      { message: 'Validation failed', code: 'VALIDATION_ERROR', errors, statusCode: HttpStatus.UNPROCESSABLE_ENTITY },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
