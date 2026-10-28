import { Response } from 'express';

export interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export const successResponse = <T>(res: Response, data: T, statusCode = 200): Response => {
  const response: ApiResponse<T> = {
    data,
    error: null,
  };
  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  message: string,
  code = 'INTERNAL_ERROR',
  statusCode = 500
): Response => {
  const response: ApiResponse<null> = {
    data: null,
    error: { code, message },
  };
  return res.status(statusCode).json(response);
};

export const validationErrorResponse = (res: Response, message: string): Response => {
  return errorResponse(res, message, 'VALIDATION_ERROR', 400);
};

export const notFoundResponse = (res: Response, message: string): Response => {
  return errorResponse(res, message, 'NOT_FOUND', 404);
};

export const unauthorizedResponse = (res: Response, message = 'Unauthorized'): Response => {
  return errorResponse(res, message, 'UNAUTHORIZED', 401);
};

export const forbiddenResponse = (res: Response, message = 'Forbidden'): Response => {
  return errorResponse(res, message, 'FORBIDDEN', 403);
};
