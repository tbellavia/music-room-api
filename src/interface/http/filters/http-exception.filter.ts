import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { Response } from "express";
import { AccountAlreadyExistsError } from "src/identity/domain/errors/account-already-exists.error";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    logger: Logger = new Logger(HttpExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res: Response = ctx.getResponse();

        if (exception instanceof AccountAlreadyExistsError) {
            return res.status(409).json({
                error: 'ACCOUNT_ALREADY_EXISTS',
                message: 'Account already exists',
            });
        }

        this.logger.error(exception);

        return res.status(500).json(exception);
    }
}