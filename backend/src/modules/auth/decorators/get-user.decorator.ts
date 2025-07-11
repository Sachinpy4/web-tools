import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../schemas/user.schema';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDocument => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
); 