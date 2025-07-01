import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly auth: AuthService) { }

    async canActivate(context: ExecutionContext): Promise<any> {
        const authorization = context.switchToHttp().getRequest()?.headers?.[
            'authorization'
        ];

        const token = `${authorization}`.replace('Bearer ', '').trim();
        if (authorization && (await this.auth.token.banned(token))) {
            throw new UnauthorizedException(`banned token`);
        }
        context.switchToHttp().getRequest().user = await this.auth.token.verify(
            token
        );
        return true;
    }
}