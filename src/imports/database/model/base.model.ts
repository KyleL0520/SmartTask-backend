import { FilterQuery, Model, PopulateOptions, SortOrder } from "mongoose";

type PaginationProps = {
    offset?: number,
    limit?: number,
    sort?: string | { [key: string]: SortOrder }
}

type PaginationOptionsProps = {
    populate: string | PopulateOptions | (PopulateOptions | string)[]
}

type PaginationResult<T> = {
    total: number,
    items: T[]
}

export class BaseModel<T> extends Model<T> {
    async pagination(filter: FilterQuery<T>, pagination: PaginationProps, options?: PaginationOptionsProps): Promise<PaginationResult<T>> {
        let query = await super.find(filter)
            .populate()
            .skip(pagination.offset || 0)
            .limit(pagination.limit || 50);
        if (pagination.sort) {
            query = query.sort(pagination.sort);
        }
        if (options?.populate) {
            query = query.populate(options.populate);
        }

        const total = await super.count(filter);

        return {
            total,
            items: await query
        };
    }
}
