export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
};

export type ApiLinks = {
  self?: string;
  next?: string;
  prev?: string;
};

export type ApiSuccessResponse<T> = {
  data: T;
  meta?: ApiMeta;
  links?: ApiLinks;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function success<T>(
  data: T,
  meta?: ApiMeta,
  links?: ApiLinks,
): ApiSuccessResponse<T> {
  return { data, ...(meta ? { meta } : {}), ...(links ? { links } : {}) };
}

export function error(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorBody {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}
