export interface FindOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: any;
}

export class FindOptionsVO {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 50,
    public readonly sortBy: string = 'createdAt',
    public readonly sortOrder: 'asc' | 'desc' = 'desc',
    public readonly filters: any = {}
  ) {}

  static default(): FindOptionsVO {
    return new FindOptionsVO();
  }

  toPrismaOptions(): any {
    return {
      skip: (this.page - 1) * this.limit,
      take: this.limit,
      orderBy: {
        [this.sortBy]: this.sortOrder
      },
      where: this.filters
    };
  }
}
