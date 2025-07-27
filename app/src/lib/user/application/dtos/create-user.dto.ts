export interface CreateUserDto {
    email: string;
    username: string;
    password: string;
    role?: string;
    status?: string;
    customerId?: string;
}


