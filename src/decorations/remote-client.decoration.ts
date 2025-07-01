import { CLIENT_IP_HEADER } from "src/config";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type IRemoteClient = { ip?: string, agent?: string, token?: string, headers: any }

const getClient = (request: any): IRemoteClient => {
    let ip;
    if (CLIENT_IP_HEADER) {
        ip = request.headers[`${CLIENT_IP_HEADER}`.toLowerCase()];
    }
    if (!ip) {
        ip = request.ip ?? request.connection?.remoteAddress;
    }

    const authorization = request.headers["authorization"];
    return {
        ip,
        agent: request.headers["user-agent"],
        headers: request.headers,
        token: authorization ? `${authorization}`.replace(`Bearer `, "") : authorization
    };
};

export const RemoteClient = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): IRemoteClient => {
        const request = ctx.switchToHttp().getRequest();
        return getClient(request);
    }
);
