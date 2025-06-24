export interface SshCredentialsProps {
    username: string;
    password?: string;
    privateKey?: string;
    port: number;
}

export class SshCredentials {
    constructor(private readonly props: SshCredentialsProps) {
        if (!props.username) {
            throw new Error('SSH username cannot be empty');
        }

        if (!props.password && !props.privateKey) {
            throw new Error('Either password or private key must be provided');
        }

        if (props.port <= 0 || props.port > 65535) {
            throw new Error('SSH port must be between 1 and 65535');
        }
    }

    get username(): string {
        return this.props.username;
    }

    get password(): string | undefined {
        return this.props.password;
    }

    get privateKey(): string | undefined {
        return this.props.privateKey;
    }

    get port(): number {
        return this.props.port;
    }

    hasPassword(): boolean {
        return !!this.props.password;
    }

    hasPrivateKey(): boolean {
        return !!this.props.privateKey;
    }

    equals(credentials: SshCredentials): boolean {
        return (
            this.props.username === credentials.username &&
            this.props.password === credentials.password &&
            this.props.privateKey === credentials.privateKey &&
            this.props.port === credentials.port
        );
    }

    static create(propsOrUsername: SshCredentialsProps | string, password?: string, port: number = 22): SshCredentials {
        if (typeof propsOrUsername === 'string') {
            // Handle parameter-based creation pattern
            return new SshCredentials({
                username: propsOrUsername,
                password: password,
                port: port
            });
        } else {
            // Handle object-based creation pattern
            return new SshCredentials(propsOrUsername);
        }
    }
}
